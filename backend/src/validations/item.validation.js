const Joi = require('joi');
const { ITEM_STATUS, ITEM_CATEGORIES } = require('../constants/status.constants');

const createItem = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'กรุณาระบุชื่อสินค้า',
    'string.empty': 'ชื่อสินค้าห้ามเป็นค่าว่าง',
  }),
  category: Joi.string().valid(...ITEM_CATEGORIES).default('other'),
  totalQuantity: Joi.number().integer().min(0).required().messages({
    'any.required': 'กรุณาระบุจำนวนสินค้าทั้งหมด',
    'number.base': 'จำนวนสินค้าทั้งหมดต้องเป็นตัวเลข',
  }),
  availableQuantity: Joi.number().integer().min(0).required(),
  unit: Joi.string().default('ชิ้น'),
  description: Joi.string().allow('').optional(),
  location: Joi.string().allow('').optional(),
  status: Joi.string().valid(...Object.values(ITEM_STATUS)).default('active'),
});

const updateItem = Joi.object({
  name: Joi.string().optional(),
  category: Joi.string().valid(...ITEM_CATEGORIES).optional(),
  totalQuantity: Joi.number().integer().min(0).optional(),
  availableQuantity: Joi.number().integer().min(0).optional(),
  unit: Joi.string().optional(),
  description: Joi.string().allow('').optional(),
  location: Joi.string().allow('').optional(),
  status: Joi.string().valid(...Object.values(ITEM_STATUS)).optional(),
});

module.exports = {
  createItem,
  updateItem,
};
