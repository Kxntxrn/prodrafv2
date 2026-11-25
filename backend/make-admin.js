const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Load backend/.env first, then fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '.env'), quiet: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

function resolveCredentialPath(cliKeyPath) {
  const candidates = [
    cliKeyPath,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(__dirname, 'serviceAccountKey.json'),
    path.resolve(__dirname, '../serviceAccountKey.json'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }
  return null;
}

function initFirebaseAdmin(cliKeyPath) {
  if (getApps().length > 0) return;

  const credPath = resolveCredentialPath(cliKeyPath);
  if (!credPath) {
    throw new Error(
      [
        'ไม่พบไฟล์ Service Account JSON สำหรับ Firebase Admin SDK',
        'วิธีแก้ไข:',
        '1. ดาวน์โหลดจาก Firebase Console > Project Settings > Service accounts > Generate new private key',
        '2. ตั้งค่าใน PowerShell ก่อนรัน (แก้ path ให้ตรงกับไฟล์ที่ดาวน์โหลดมา):',
        '   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\your-service-account.json"',
        '   หรือส่งผ่าน flag: npm --prefix backend run make-admin -- your@email.com --key "C:\\path\\to\\your-service-account.json"',
      ].join('\n'),
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  initializeApp({
    credential: cert(serviceAccount),
  });
}

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes('--revoke');

  let cliKeyPath = null;
  const keyFlagIndex = args.indexOf('--key');
  if (keyFlagIndex !== -1 && args[keyFlagIndex + 1]) {
    cliKeyPath = args[keyFlagIndex + 1];
  }

  const identifier = args.find(
    (arg, index) =>
      !arg.startsWith('--') && (keyFlagIndex === -1 || index !== keyFlagIndex + 1),
  );

  if (!identifier) {
    console.error(
      'วิธีใช้งาน: node make-admin.js <email-or-uid> [--revoke] [--key path/to/serviceAccount.json]',
    );
    process.exit(1);
  }

  initFirebaseAdmin(cliKeyPath);

  const auth = getAuth();
  const user = identifier.includes('@')
    ? await auth.getUserByEmail(identifier.trim())
    : await auth.getUser(identifier.trim());

  const currentClaims = user.customClaims || {};
  const nextClaims = { ...currentClaims };
  if (revoke) {
    delete nextClaims.admin;
  } else {
    nextClaims.admin = true;
  }

  await auth.setCustomUserClaims(user.uid, nextClaims);

  const db = getFirestore();
  await db
    .collection('users')
    .doc(user.uid)
    .set(
      {
        firebaseUid: user.uid,
        email: user.email || '',
        role: revoke ? 'user' : 'admin',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

  console.log(
    revoke
      ? `ถอดสิทธิ์แอดมินของ ${user.email || user.uid} เรียบร้อยแล้ว`
      : `ตั้งสิทธิ์แอดมิน (custom claim: admin=true) ให้ ${user.email || user.uid} เรียบร้อยแล้ว`,
  );
  console.log('หมายเหตุ: ผู้ใช้ต้องออกจากระบบแล้วเข้าสู่ระบบใหม่เพื่อให้ token อัปเดตสิทธิ์');
}

main().catch((err) => {
  console.error('เกิดข้อผิดพลาด:', err?.message || err);
  process.exit(1);
});
