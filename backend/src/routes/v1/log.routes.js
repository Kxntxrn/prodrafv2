const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/report.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.get('/', authMiddleware, authMiddleware.checkAdmin, reportController.getAuditLogs);

module.exports = router;
