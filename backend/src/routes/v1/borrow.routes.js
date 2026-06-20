const express = require('express');
const router = express.Router();
const borrowController = require('../../controllers/borrow.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const borrowValidation = require('../../validations/borrow.validation');

// User routes
router.post('/', authMiddleware, validate(borrowValidation.createBorrow), borrowController.createBorrowRequest);
router.get('/my-borrowings', authMiddleware, borrowController.getUserBorrowings);

// Admin-only routes
router.get('/all', authMiddleware, authMiddleware.checkAdmin, borrowController.getAllBorrowings);
router.put('/:id/status', authMiddleware, authMiddleware.checkAdmin, validate(borrowValidation.updateStatus), borrowController.updateBorrowStatus);

module.exports = router;
