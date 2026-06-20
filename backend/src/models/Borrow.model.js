const mongoose = require('mongoose');

const BorrowingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  firebaseUid: {
    type: String,
    required: true,
  },
  items: [
    {
      itemName: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      serialNumber: String,
      condition: String,
    },
  ],
  borrowDate: {
    type: Date,
    required: true,
  },
  expectedReturnDate: {
    type: Date,
    required: true,
  },
  actualReturnDate: Date,
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'borrowed', 'returned', 'overdue'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Borrowing', BorrowingSchema);