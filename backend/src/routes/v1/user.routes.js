const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

router.get('/me', authMiddleware, userController.getCurrentUser);

// Admin-only routes
router.get('/', authMiddleware, authMiddleware.checkAdmin, userController.getAllUsers);
router.put('/:id/role', authMiddleware, authMiddleware.checkAdmin, userController.updateUserRole);

module.exports = router;
