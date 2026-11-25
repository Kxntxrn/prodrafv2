const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'MOVED',
    message: 'ระบบย้ายไปใช้ Firebase Firestore แล้ว ไม่ใช้ MongoDB และไม่ต้องเปิด API นี้',
  });
});

app.listen(PORT, () => {
  console.log(`Firestore app ไม่ใช้พอร์ตนี้แล้ว (เหลือไว้แค่ข้อความนี้ที่ ${PORT})`);
});
