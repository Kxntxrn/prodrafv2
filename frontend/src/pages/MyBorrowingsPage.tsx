import type { Borrowing } from '../lib/db';
import { formatDate, getStatusClass, getStatusText } from '../utils/format';

interface MyBorrowingsPageProps {
  borrowings: Borrowing[];
}

export function MyBorrowingsPage({ borrowings }: MyBorrowingsPageProps) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">ประวัติการยืมสินค้าของฉัน</h1>
          <p className="page-subtitle">แสดงคำขอและสถานะการยืมพัสดุอุปกรณ์ทั้งหมดของคุณ</p>
        </div>
      </div>

      {borrowings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📜</div>
          <h3>ยังไม่มีประวัติการส่งคำขอ</h3>
          <p>คำขอที่คุณส่งทั้งหมดจะบันทึกและแสดงสถานะที่นี่</p>
        </div>
      ) : (
        <div className="borrowings-list">
          {borrowings.map((borrow) => (
            <div key={borrow._id} className="borrowing-card">
              <div className="borrowing-info">
                <div className="borrowing-items-title">
                  {borrow.items
                    .map((item) => `${item.itemName} (จำนวน ${item.quantity} ชิ้น)`)
                    .join(', ')}
                </div>
                <div className="borrowing-meta">
                  <span>📅 ยื่นคำขอเมื่อ: {formatDate(borrow.createdAt)}</span>
                  <span>🗓️ กำหนดคืน: {formatDate(borrow.expectedReturnDate)}</span>
                  {borrow.actualReturnDate && (
                    <span style={{ color: 'var(--color-success)' }}>
                      🟢 คืนจริงเมื่อ: {formatDate(borrow.actualReturnDate)}
                    </span>
                  )}
                  <span>เหตุผล: {borrow.reason}</span>
                </div>
                {borrow.notes && (
                  <div
                    style={{
                      fontSize: '13px',
                      marginTop: '6px',
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '4px',
                      borderLeft: '2px solid var(--color-primary)',
                    }}
                  >
                    💬 หมายเหตุแอดมิน: <span style={{ color: 'white' }}>{borrow.notes}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={getStatusClass(borrow.status)}>
                  {getStatusText(borrow.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
