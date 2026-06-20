const express = require('express');
const router = express.Router();
const itemController = require('../../controllers/item.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const itemValidation = require('../../validations/item.validation');

router.get('/', authMiddleware, itemController.getAllItems);
router.get('/:id', authMiddleware, itemController.getItemById);
router.post('/', authMiddleware, validate(itemValidation.createItem), itemController.createItem);
router.put('/:id', authMiddleware, validate(itemValidation.updateItem), itemController.updateItem);
router.delete('/:id', authMiddleware, itemController.deleteItem);

module.exports = router;