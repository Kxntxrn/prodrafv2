const Joi = require('joi');
const { BORROW_STATUS } = require('../constants/status.constants');

const createBorrow = Joi.object({
  items: Joi.array().items(
    Joi.object({
      itemName: Joi.string().required().messages({
        'any.required': 'กรุณาระบุชื่อสินค้าที่ต้องการยืม',
      }),
      quantity: Joi.number().integer().min(1).required().messages({
        'number.min': 'จำนวนสินค้าที่ต้องการยืมต้องไม่ต่ำกว่า 1 ชิ้น',
      }),
      serialNumber: Joi.string().optional(),
      condition: Joi.string().optional(),
    })
  ).min(1).required().messages({
    'array.min': 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ',
  }),
  borrowDate: Joi.date().required().messages({
    'any.required': 'กรุณาระบุวันที่เริ่มยืม',
  }),
  expectedReturnDate: Joi.date().required().messages({
    'any.required': 'กรุณาระบุวันที่กำหนดส่งคืน',
  }),
  reason: Joi.string().required().messages({
    'any.required': 'กรุณาระบุเหตุผลการยืม',
    'string.empty': 'เหตุผลการยืมห้ามเป็นค่าว่าง',
  }),
});

const updateStatus = Joi.object({
  status: Joi.string().valid(...Object.values(BORROW_STATUS)).required().messages({
    'any.required': 'กรุณาระบุสถานะต้องการอัปเดต',
    'any.only': 'สถานะไม่ถูกต้อง',
  }),
  notes: Joi.string().allow('').optional(),
});

module.exports = {
  createBorrow,
  updateStatus,
};
