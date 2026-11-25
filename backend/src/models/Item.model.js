const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    enum: ['equipment', 'tool', 'book', 'device', 'other'],
    default: 'other',
  },
  totalQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  availableQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    default: 'ชิ้น',
  },
  description: String,
  location: String,
  status: {
    type: String,
    enum: ['active', 'maintenance', 'discontinued'],
    default: 'active',
  },
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
