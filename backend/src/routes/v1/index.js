const express = require('express');
const router = express.Router();

const itemRoutes = require('./item.routes');
const borrowRoutes = require('./borrow.routes');
const userRoutes = require('./user.routes');
const logRoutes = require('./log.routes');

router.use('/items', itemRoutes);
router.use('/borrowings', borrowRoutes);
router.use('/users', userRoutes);
router.use('/logs', logRoutes);

module.exports = router;
