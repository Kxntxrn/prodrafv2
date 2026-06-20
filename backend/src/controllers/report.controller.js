const AuditLog = require('../models/AuditLog.model');
const { successResponse } = require('../utils/response.util');

const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 });
    return successResponse(res, logs, 'ดึงข้อมูล Audit logs ทั้งหมดสำเร็จ');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
};
