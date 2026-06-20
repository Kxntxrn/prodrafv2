const { errorResponse } = require('../utils/response.util');

const errorMiddleware = (err, req, res, next) => {
  console.error('Error Stack:', err.stack);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์';

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const key = Object.keys(err.keyValue)[0];
    message = `ข้อมูล ${key} ซ้ำในระบบ`;
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `รูปแบบรหัส ID (${err.value}) ไม่ถูกต้อง`;
  }

  return errorResponse(res, message, statusCode, process.env.NODE_ENV === 'development' ? err : null);
};

module.exports = errorMiddleware;
