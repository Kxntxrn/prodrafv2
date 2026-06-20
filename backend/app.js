const app = require('./src/app');
const env = require('./src/config/env');

const PORT = env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🫁   เอสแดง 2 ตัวอยู่ที่ ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});
