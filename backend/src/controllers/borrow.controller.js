const Borrowing = require('../models/Borrow.model');
const Item = require('../models/Item.model');
const AuditLog = require('../models/AuditLog.model');
const { successResponse, errorResponse } = require('../utils/response.util');

const createBorrowRequest = async (req, res, next) => {
  try {
    const { items, borrowDate, expectedReturnDate, reason } = req.body;
    const firebaseUid = req.user.dbUser.firebaseUid;
    const user = req.user.dbUser;

    for (const item of items) {
      const dbItem = await Item.findOne({ name: item.itemName });
      if (dbItem && dbItem.availableQuantity < item.quantity) {
        return errorResponse(res, `สินค้า ${item.itemName} คงเหลือไม่พอ (คงเหลือ ${dbItem.availableQuantity} ${dbItem.unit})`, 400);
      }
    }

    const borrowing = await Borrowing.create({
      userId: user._id,
      firebaseUid,
      items,
      borrowDate: new Date(borrowDate),
      expectedReturnDate: new Date(expectedReturnDate),
      reason,
      status: 'pending',
    });

    const itemsList = items.map(i => `${i.itemName} (จำนวน ${i.quantity})`).join(', ');
    await AuditLog.create({
      action: 'SUBMIT_BORROW',
      details: `ส่งคำขอยืม: ${itemsList} | เหตุผล: ${reason}`,
      performedBy: user.email,
    });

    return successResponse(res, borrowing, 'ส่งคำขอยืมสำเร็จ รอการอนุมัติ', 201);
  } catch (error) {
    next(error);
  }
};

const getUserBorrowings = async (req, res, next) => {
  try {
    const firebaseUid = req.user.dbUser.firebaseUid;
    const borrowings = await Borrowing.find({ firebaseUid })
      .sort({ createdAt: -1 })
      .populate('approvedBy', 'displayName email');
    
    return successResponse(res, borrowings, 'ดึงประวัติการยืมของผู้ใช้สำเร็จ');
  } catch (error) {
    next(error);
  }
};

const getAllBorrowings = async (req, res, next) => {
  try {
    const borrowings = await Borrowing.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'displayName email phone department')
      .populate('approvedBy', 'displayName email');
    
    return successResponse(res, borrowings, 'ดึงข้อมูลคำขอยืมทั้งหมดสำเร็จ');
  } catch (error) {
    next(error);
  }
};

const updateBorrowStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminUser = req.user.dbUser;
    
    const borrowing = await Borrowing.findById(id);
    if (!borrowing) {
      return errorResponse(res, 'ไม่พบคำขอยืม', 404);
    }
    
    if (status === 'approved' && borrowing.status === 'pending') {
      for (const item of borrowing.items) {
        const dbItem = await Item.findOne({ name: item.itemName });
        if (dbItem) {
          if (dbItem.availableQuantity < item.quantity) {
            return errorResponse(res, `สินค้า ${item.itemName} คงเหลือไม่พอ`, 400);
          }
          dbItem.availableQuantity -= item.quantity;
          await dbItem.save();
        }
      }
      borrowing.status = 'approved';
      borrowing.approvedBy = adminUser._id;
      borrowing.approvedAt = new Date();
    } else if (status === 'rejected') {
      borrowing.status = 'rejected';
      borrowing.notes = notes;
    } else if (status === 'returned' && (borrowing.status === 'borrowed' || borrowing.status === 'approved')) {
      for (const item of borrowing.items) {
        const dbItem = await Item.findOne({ name: item.itemName });
        if (dbItem) {
          dbItem.availableQuantity += item.quantity;
          await dbItem.save();
        }
      }
      borrowing.status = 'returned';
      borrowing.actualReturnDate = new Date();
    } else {
      borrowing.status = status;
    }
    
    borrowing.updatedAt = new Date();
    if (notes) borrowing.notes = notes;
    
    await borrowing.save();

    // Log action to AuditLog
    const itemsList = borrowing.items.map(i => `${i.itemName} (จำนวน ${i.quantity})`).join(', ');
    let logAction = 'UPDATE_BORROW';
    let logDetails = `อัปเดตคำขอยืมสินค้า: ${itemsList} เป็นสถานะ ${status}`;
    
    if (status === 'approved') {
      logAction = 'APPROVE_BORROW';
      logDetails = `อนุมัติให้ยืมสินค้า: ${itemsList} (โดยผู้ดูแลระบบ)`;
    } else if (status === 'rejected') {
      logAction = 'REJECT_BORROW';
      logDetails = `ปฏิเสธคำขอยืมสินค้า: ${itemsList} | เหตุผล/หมายเหตุ: ${notes || '-'}`;
    } else if (status === 'returned') {
      logAction = 'RETURN_ITEM';
      logDetails = `รับคืนสินค้าเรียบร้อย: ${itemsList}`;
    }

    await AuditLog.create({
      action: logAction,
      details: logDetails,
      performedBy: adminUser.email,
    });
    
    return successResponse(res, borrowing, `อัปเดตสถานะเป็น ${status} เรียบร้อย`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBorrowRequest,
  getUserBorrowings,
  getAllBorrowings,
  updateBorrowStatus,
};
