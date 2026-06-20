const admin = require('../config/firebase');
const User = require('../models/User.model');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
      console.log('Auth Middleware: Received token', token);
      return res.status(401).json({
        success: false,
        message: 'ไม่พบ Token กรุณาเข้าสู่ระบบ',
      });
    }

    // Determine token verification method based on admin SDK capabilities
    let decodedToken;
    if (admin && typeof admin.auth === 'function') {
      decodedToken = await admin.auth().verifyIdToken(token);
    } else {
      // Fallback: treat token as uid for mock purposes
      decodedToken = { uid: token, email: 'mock@example.com', name: 'Mock User' };
    }
    
    // Find or create user in MongoDB to link with Firebase Auth
    let user = await User.findOne({
      $or: [
        { firebaseUid: decodedToken.uid },
        { email: decodedToken.email }
      ]
    });

    if (!user) {
      // Sync admin role based on email if it contains "admin"
      const isInitialAdmin = decodedToken.email.includes('admin');
      user = await User.create({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email,
        displayName: decodedToken.name || decodedToken.email.split('@')[0],
        role: isInitialAdmin ? 'admin' : 'user',
      });
    } else {
      let updated = false;
      if (user.firebaseUid !== decodedToken.uid) {
        user.firebaseUid = decodedToken.uid;
        updated = true;
      }
      if (decodedToken.email.includes('admin') && user.role !== 'admin') {
        user.role = 'admin';
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    // Standardize user object on request
    req.user = {
      ...decodedToken,
      dbUser: user,
    };
    next();
  } catch (error) {
    console.error('Authentication Error:', error.message, 'Code:', error.code);
    // If Firebase token is expired, suggest re-authentication
    const message = error.code === 'auth/id-token-expired' ? 'Token หมดอายุ โปรดลงชื่อเข้าใหม่' : 'Token ไม่ถูกต้องหรือหมดอายุ';
    return res.status(403).json({ 
      success: false, 
      message,
    });
  }
};

// Admin route guard middleware
authMiddleware.checkAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.dbUser || req.user.dbUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'คุณไม่มีสิทธิ์เข้าถึง (ต้องเป็น Admin เท่านั้น)',
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = authMiddleware;