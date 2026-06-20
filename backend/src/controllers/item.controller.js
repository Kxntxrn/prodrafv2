const Item = require('../models/Item.model');
const AuditLog = require('../models/AuditLog.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const createItem = async (req, res, next) => {
  try {
    const item = await Item.create(req.body);
    await AuditLog.create({
      action: 'CREATE_ITEM',
      details: `สร้างสินค้าใหม่: ${item.name} (จำนวนรวม: ${item.totalQuantity} ${item.unit})`,
      performedBy: req.user?.dbUser?.email || 'System',
    });
    return successResponse(res, item, 'สร้างสินค้าสำเร็จ', 201);
  } catch (error) {
    next(error);
  }
};

const getAllItems = async (req, res, next) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    return successResponse(res, items, 'ดึงข้อมูลสินค้าทั้งหมดสำเร็จ');
  } catch (error) {
    next(error);
  }
};

const getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);
    if (!item) {
      return errorResponse(res, 'ไม่พบสินค้า', 404);
    }
    return successResponse(res, item, 'ดึงข้อมูลสินค้าสำเร็จ');
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Item.findByIdAndUpdate(id, req.body, { new: true });
    if (!item) {
      return errorResponse(res, 'ไม่พบสินค้า', 404);
    }
    await AuditLog.create({
      action: 'UPDATE_ITEM',
      details: `อัปเดตสินค้า: ${item.name} (คงเหลือ: ${item.availableQuantity}/${item.totalQuantity} ${item.unit})`,
      performedBy: req.user?.dbUser?.email || 'System',
    });
    return successResponse(res, item, 'อัปเดตสินค้าสำเร็จ');
  } catch (error) {
    next(error);
  }
};

const deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Item.findById(id);
    if (!item) {
      return errorResponse(res, 'ไม่พบสินค้า', 404);
    }
    await Item.findByIdAndDelete(id);
    await AuditLog.create({
      action: 'DELETE_ITEM',
      details: `ลบสินค้า: ${item.name}`,
      performedBy: req.user?.dbUser?.email || 'System',
    });
    return successResponse(res, null, 'ลบสินค้าสำเร็จ');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
};
