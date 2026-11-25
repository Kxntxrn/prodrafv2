# prodrafv2 — ระบบยืม-คืนอุปกรณ์ด้วย QR Code

เว็บแอปพลิเคชันสำหรับจัดการการยืม-คืนอุปกรณ์ พัฒนาด้วย React 19 + TypeScript + Vite เชื่อมต่อ Firebase Authentication และ Cloud Firestore

## โครงสร้างโปรเจกต์

```text
prodrafv2/
├── frontend/               # React + TypeScript + Vite (คุยกับ Firebase Auth & Firestore)
├── backend/                # เครื่องมือ CLI สำหรับแอดมิน (make-admin.js) และ health stub
├── firestore.rules         # Cloud Firestore Security Rules (ใช้ Custom Claims)
├── firestore.indexes.json  # Firestore indexes
├── firebase.json           # ตั้งค่า Firebase CLI
├── .firebaserc             # โปรเจกต์ Firebase (qrcodeborrowdiwa)
└── .env.example            # ตัวอย่างตัวแปรสภาพแวดล้อม
```

## การรันฝั่ง Frontend

```bash
npm --prefix frontend install
npm run dev
```

หรือรัน build / lint / format check จาก root:

```bash
npm run lint
npm run format:check
npm --prefix frontend run build
```

## การตั้งสิทธิ์ผู้ดูแลระบบ (Admin Custom Claims)

ระบบใช้ Firebase Custom Claims (`admin: true`) เป็นตัวกำหนดสิทธิ์แอดมินทั้งฝั่ง client และใน `firestore.rules`:

1. ดาวน์โหลดไฟล์ Service Account JSON จาก Firebase Console > Project Settings > Service accounts (ห้าม commit ไฟล์นี้ขึ้น Git)
2. ตั้งค่า `GOOGLE_APPLICATION_CREDENTIALS` ชี้ไปยังไฟล์ JSON (ดูตัวอย่างใน `.env.example` หรือ `backend/.env.example`)
3. รันคำสั่งตั้งสิทธิ์:

```bash
npm --prefix backend install
npm --prefix backend run make-admin -- user@example.com
```

หากต้องการถอดสิทธิ์แอดมิน:

```bash
npm --prefix backend run make-admin -- user@example.com --revoke
```

> หลังตั้งสิทธิ์หรือถอดสิทธิ์ ผู้ใช้ต้องออกจากระบบแล้วเข้าสู่ระบบใหม่เพื่อให้ Firebase ID Token อัปเดต claims

## การ Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```
