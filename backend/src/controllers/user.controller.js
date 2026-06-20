const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const getCurrentUser = async (req, res, next) => {
  try {
    const user = req.user.dbUser;
    
    // Log user login activity
    await AuditLog.create({
      action: 'LOGIN',
      details: `ผู้ใช้ ${user.displayName} (${user.email}) เข้าสู่ระบบ`,
      performedBy: user.email,
    });

    return successResponse(res, user, 'ดึงข้อมูลโปรไฟล์ผู้ใช้ปัจจุบันสำเร็จ');
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return successResponse(res, users, 'ดึงข้อมูลรายชื่อผู้ใช้ทั้งหมดสำเร็จ');
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return errorResponse(res, 'ระบุตำแหน่งบทบาทสิทธิ์ไม่ถูกต้อง', 400);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    );

    if (!user) {
      return errorResponse(res, 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ', 404);
    }

    await AuditLog.create({
      action: 'UPDATE_USER_ROLE',
      details: `อัปเดตบทบาทผู้ใช้: ${user.email} เป็น ${role}`,
      performedBy: req.user?.dbUser?.email || 'System',
    });

    return successResponse(res, user, 'อัปเดตบทบาทสิทธิ์เรียบร้อย');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUser,
  getAllUsers,
  updateUserRole,
};
