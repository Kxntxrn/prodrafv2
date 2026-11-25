import { useState, type FormEvent } from 'react';
import type { Item } from '../lib/db';

interface ItemDetailPageProps {
  item: Item;
  loading: boolean;
  onBack: () => void;
  onSubmitBorrow: (input: {
    quantity: number;
    expectedReturnDate: string;
    reason: string;
  }) => Promise<void>;
  onWarning: (message: string) => void;
}

function defaultReturnDateString(): string {
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  return defaultDate.toISOString().split('T')[0];
}

export function ItemDetailPage({
  item,
  loading,
  onBack,
  onSubmitBorrow,
  onWarning,
}: ItemDetailPageProps) {
  const [borrowQty, setBorrowQty] = useState(1);
  const [expectedReturnDate, setExpectedReturnDate] = useState(defaultReturnDateString);
  const [borrowReason, setBorrowReason] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (borrowQty <= 0) {
      onWarning('กรุณาระบุจำนวนสินค้าที่ต้องการยืมมากกว่า 0');
      return;
    }
    if (borrowQty > item.availableQuantity) {
      onWarning('จำนวนสินค้าคงเหลือไม่พอสำหรับทำรายการ');
      return;
    }
    if (!expectedReturnDate) {
      onWarning('กรุณาระบุวันที่คาดว่าจะคืน');
      return;
    }
    if (!borrowReason.trim()) {
      onWarning('กรุณาระบุเหตุผลการยืม');
      return;
    }

    await onSubmitBorrow({
      quantity: borrowQty,
      expectedReturnDate,
      reason: borrowReason,
    });
  };

  return (
    <div>
      <div className="back-link" onClick={onBack}>
        ← กลับไปหน้ารายการสินค้า
      </div>

      <div className="item-detail-container">
        <div className="item-info-panel">
          <div className="item-info-header">
            <h1 className="page-title" style={{ margin: 0 }}>
              {item.name}
            </h1>
            <span
              className={
                item.availableQuantity > 0 ? 'status-badge available' : 'status-badge unavailable'
              }
              style={{ fontSize: '14px', padding: '4px 12px' }}
            >
              {item.availableQuantity > 0 ? '🟢 พร้อมให้ยืม' : '🔴 หมดชั่วคราว'}
            </span>
          </div>

          <p
            style={{
              fontSize: '15px',
              color: 'var(--color-text-secondary)',
              marginBottom: '24px',
              lineHeight: '1.6',
            }}
          >
            {item.description || 'ไม่มีคำอธิบายเพิ่มเติมเกี่ยวกับสินค้านี้'}
          </p>

          <div className="item-details-list">
            <div className="item-detail-item">
              <span className="item-detail-label">หมวดหมู่</span>
              <span className="item-detail-val" style={{ textTransform: 'capitalize' }}>
                {item.category}
              </span>
            </div>
            <div className="item-detail-item">
              <span className="item-detail-label">สถานที่จัดเก็บ</span>
              <span className="item-detail-val">{item.location || 'ไม่ได้ระบุ'}</span>
            </div>
            <div className="item-detail-item">
              <span className="item-detail-label">จำนวนสินค้าคงเหลือ</span>
              <span className="item-detail-val">
                {item.availableQuantity} / {item.totalQuantity} {item.unit}
              </span>
            </div>
            <div className="item-detail-item">
              <span className="item-detail-label">รหัสสินค้า (ID)</span>
              <span
                className="item-detail-val"
                style={{
                  fontSize: '12px',
                  wordBreak: 'break-all',
                  color: 'var(--color-primary-light)',
                }}
              >
                {item._id}
              </span>
            </div>
          </div>
        </div>

        <div className="borrow-form-panel">
          <h3 className="borrow-form-title">📝 ส่งคำขอใช้บริการ/ยืมสินค้า</h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">จำนวนสินค้าที่ต้องการยืม ({item.unit})</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={item.availableQuantity}
                value={borrowQty}
                onChange={(e) => setBorrowQty(Number(e.target.value))}
                disabled={item.availableQuantity === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">วันที่คาดว่าจะส่งคืน</label>
              <input
                type="date"
                className="form-input"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                disabled={item.availableQuantity === 0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">เหตุผลความจำเป็นในการยืม</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="ระบุวัตถุประสงค์ในการยืม เช่น ใช้สำหรับจัดเลี้ยงประชุมแผนก..."
                value={borrowReason}
                onChange={(e) => setBorrowReason(e.target.value)}
                disabled={item.availableQuantity === 0}
              />
            </div>

            <button
              type="submit"
              className="form-submit-btn"
              disabled={item.availableQuantity === 0 || loading}
            >
              {item.availableQuantity === 0
                ? '🚫 สินค้าหมด ไม่สามารถยืมได้'
                : '🚀 ยืนยันการส่งคำขอยืมพัสดุ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
