const ITEM_STATUS = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  DISCONTINUED: 'discontinued',
};

const ITEM_CATEGORIES = ['equipment', 'tool', 'book', 'device', 'other'];

const BORROW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  BORROWED: 'borrowed',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
};

module.exports = {
  ITEM_STATUS,
  ITEM_CATEGORIES,
  BORROW_STATUS,
};
