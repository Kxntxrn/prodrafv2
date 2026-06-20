const mongoose = require('mongoose');

const BorrowSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  userId: { type: String, required: true }, // Firebase UID
  borrowedDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnedDate: { type: Date },
  status: { 
    type: String, 
    enum: ['BORROWED', 'RETURNED', 'OVERDUE'], 
    default: 'BORROWED' 
  },
  fine: { type: Number, default: 0 }, // ค่าปรับ (ถ้ามี)
}, { timestamps: true });

module.exports = mongoose.model('Borrow', BorrowSchema);