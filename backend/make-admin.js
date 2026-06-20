/**
 * make-admin.js
 * Run once to grant admin role to a specific email.
 * Usage: node make-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/borrowing_db?authSource=admin';
const TARGET_EMAIL = 'kontorn.sutiyawan@gmail.com';

const UserSchema = new mongoose.Schema({
  firebaseUid: String,
  email: String,
  displayName: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  phone: String,
  department: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function main() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  const result = await User.findOneAndUpdate(
    { email: TARGET_EMAIL },
    { role: 'admin' },
    { new: true }
  );

  if (!result) {
    console.log(`⚠️  ไม่พบ user ที่มี email: ${TARGET_EMAIL}`);
    console.log('   -> ลองล็อกอินด้วย Google ก่อน แล้วรัน script นี้ใหม่อีกครั้งครับ');
  } else {
    console.log(`✅ อัปเดตสำเร็จ!`);
    console.log(`   Email    : ${result.email}`);
    console.log(`   Name     : ${result.displayName}`);
    console.log(`   Role     : ${result.role}`);
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
