import { useCallback, useState } from 'react';
import type { AuditLog, Borrowing, Item } from '../lib/db';
import { type Unit } from '../lib/db';
import { formatDate, getStatusClass, getStatusText } from '../utils/format';
import { QRScanner, type QRScanResult } from '../components/QRScanner';
import { UnitsModal } from '../components/UnitsModal';

interface AdminPageProps {
  allBorrowings: Borrowing[];
  items: Item[];
  auditLogs: AuditLog[];
  actorEmail: string;
  onUpdateBorrowStatus: (
    id: string,
    status: 'approved' | 'rejected' | 'returned' | 'borrowed',
    notes?: string,
  ) => void;
  onAddItem: () => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

interface ScanResultState {
  raw: QRScanResult;
  unit: Unit | null;
  itemName: string;
  loading: boolean;
}

export function AdminPage({
  allBorrowings,
  items,
  auditLogs,
  actorEmail,
  onUpdateBorrowStatus,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToast,
}: AdminPageProps) {
  const [adminTab, setAdminTab] = useState<'requests' | 'inventory' | 'logs'>('requests');
  const [selectedItemForUnits, setSelectedItemForUnits] = useState<Item | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);

  const handleScanResult = useCallback(
    async (result: QRScanResult) => {
      setShowQRScanner(false);
      const matchedItem = items.find((i) => i._id === result.itemId);
      setScanResult({
        raw: result,
        unit: null,
        itemName: matchedItem?.name ?? result.itemId,
        loading: true,
      });
      try {
        const { getUnit } = await import('../lib/db');
        const unit = await getUnit(result.itemId, result.unitId);
        setScanResult((prev) => (prev ? { ...prev, unit, loading: false } : null));
      } catch {
        setScanResult((prev) => (prev ? { ...prev, loading: false } : null));
      }
    },
    [items],
  );

  const STATUS_LABEL: Record<Unit['status'], string> = {
    available: '🟢 ว่าง',
    borrowed: '🟡 ถูกยืม',
    maintenance: '🔧 ซ่อมบำรุง',
    lost: '🔴 สูญหาย',
  };

  return (
    <div className="admin-layout">
      <div className="page-header" style={{ marginBottom: '12px' }}>
        <div>
          <h1 className="page-title">🛡️ แผงควบคุมผู้ดูแลระบบ (Admin Console)</h1>
          <p className="page-subtitle">
            จัดการรายการพัสดุ อนุมัติการยืม และตรวจสอบระบบ/Log ประวัติกิจกรรม
          </p>
        </div>
        <button
          className="form-submit-btn"
          style={{ width: 'auto', padding: '10px 18px', alignSelf: 'center' }}
          onClick={() => setShowQRScanner(true)}
        >
          📷 สแกน QR Code
        </button>
      </div>

      <div className="tab-nav">
        <button
          className={`tab-btn ${adminTab === 'requests' ? 'active' : ''}`}
          onClick={() => setAdminTab('requests')}
        >
          📥 รายการคำขอยืม ({allBorrowings.filter((b) => b.status === 'pending').length})
        </button>
        <button
          className={`tab-btn ${adminTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setAdminTab('inventory')}
        >
          📦 จัดการคลังอุปกรณ์ ({items.length})
        </button>
        <button
          className={`tab-btn ${adminTab === 'logs' ? 'active' : ''}`}
          onClick={() => setAdminTab('logs')}
        >
          🪵 บันทึกประวัติ (Audit logs)
        </button>
      </div>

      {/* ───────── TAB: REQUESTS ───────── */}
      {adminTab === 'requests' && (
        <div>
          {allBorrowings.length === 0 ? (
            <div className="empty-state">
              <h3>ไม่มีคำขอยืมสินค้าใดๆ</h3>
            </div>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ผู้ยืม</th>
                    <th>รายการพัสดุ</th>
                    <th>วันที่ขอยืม - กำหนดคืน</th>
                    <th>เหตุผล</th>
                    <th>สถานะ</th>
                    <th>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {allBorrowings.map((borrow) => (
                    <tr key={borrow._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {typeof borrow.userId === 'object'
                            ? borrow.userId.displayName
                            : 'Unknown User'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {typeof borrow.userId === 'object'
                            ? borrow.userId.email
                            : borrow.firebaseUid}
                        </div>
                      </td>
                      <td>
                        {borrow.items.map((item) => (
                          <div key={item._id} style={{ fontWeight: 500 }}>
                            {item.itemName}{' '}
                            <span style={{ color: 'var(--color-primary-light)' }}>
                              (x{item.quantity})
                            </span>
                          </div>
                        ))}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>เริ่ม: {formatDate(borrow.borrowDate)}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-warning)' }}>
                          คืน: {formatDate(borrow.expectedReturnDate)}
                        </div>
                      </td>
                      <td
                        style={{ fontSize: '13px', maxWidth: '200px', wordBreak: 'break-word' }}
                      >
                        {borrow.reason}
                      </td>
                      <td>
                        <span className={getStatusClass(borrow.status)}>
                          {getStatusText(borrow.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {borrow.status === 'pending' && (
                            <>
                              <button
                                className="btn-sm btn-approve"
                                onClick={() => onUpdateBorrowStatus(borrow._id, 'approved')}
                              >
                                อนุมัติ
                              </button>
                              <button
                                className="btn-sm btn-reject"
                                onClick={() => {
                                  const note = prompt('ระบุเหตุผลการปฏิเสธคำขอ:');
                                  if (note !== null)
                                    onUpdateBorrowStatus(borrow._id, 'rejected', note);
                                }}
                              >
                                ปฏิเสธ
                              </button>
                            </>
                          )}
                          {borrow.status === 'approved' && (
                            <button
                              className="btn-sm btn-approve"
                              onClick={() => onUpdateBorrowStatus(borrow._id, 'borrowed')}
                              style={{
                                background: 'var(--color-info-bg)',
                                color: 'var(--color-info)',
                                borderColor: 'rgba(59, 130, 246, 0.2)',
                              }}
                            >
                              ส่งมอบของแล้ว
                            </button>
                          )}
                          {borrow.status === 'borrowed' && (
                            <button
                              className="btn-sm btn-approve"
                              onClick={() => onUpdateBorrowStatus(borrow._id, 'returned')}
                            >
                              รับคืนพัสดุ
                            </button>
                          )}
                          {(borrow.status === 'returned' || borrow.status === 'rejected') && (
                            <span
                              style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}
                            >
                              เสร็จสิ้นการทำรายการ
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────── TAB: INVENTORY ───────── */}
      {adminTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              className="form-submit-btn"
              style={{ width: 'auto', padding: '10px 20px' }}
              onClick={onAddItem}
            >
              ➕ เพิ่มอุปกรณ์/พัสดุชิ้นใหม่
            </button>
          </div>

          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ชื่อพัสดุ</th>
                  <th>หมวดหมู่</th>
                  <th>คงเหลือ / ทั้งหมด</th>
                  <th>สถานที่จัดเก็บ</th>
                  <th>สถานะ</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item._id}
                    style={
                      item.name === 'เอสแดง'
                        ? { background: 'rgba(139, 92, 246, 0.04)' }
                        : {}
                    }
                  >
                    <td>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {item.name}
                        {item.name === 'เอสแดง' && (
                          <span
                            style={{
                              fontSize: '10px',
                              background: 'red',
                              color: 'white',
                              padding: '2px 4px',
                              borderRadius: '4px',
                            }}
                          >
                            MOCK UP
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-text-secondary)',
                          maxWidth: '280px',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.description || 'ไม่มีรายละเอียด'}
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{item.availableQuantity}</span> /{' '}
                      {item.totalQuantity} {item.unit}
                    </td>
                    <td>{item.location || '-'}</td>
                    <td>
                      <span
                        className={
                          item.status === 'active'
                            ? 'status-badge available'
                            : item.status === 'maintenance'
                              ? 'status-badge maintenance'
                              : 'status-badge unavailable'
                        }
                      >
                        {item.status === 'active'
                          ? '🟢 ใช้งานปกติ'
                          : item.status === 'maintenance'
                            ? '🟡 ซ่อมบำรุง'
                            : '🔴 เลิกใช้งาน'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-sm btn-edit"
                          onClick={() => setSelectedItemForUnits(item)}
                          style={{
                            background: 'rgba(139,92,246,0.15)',
                            color: '#a78bfa',
                            borderColor: 'rgba(139,92,246,0.3)',
                          }}
                        >
                          🏷️ Units
                        </button>
                        <button
                          className="btn-sm btn-edit"
                          onClick={() => onEditItem(item)}
                        >
                          แก้ไข
                        </button>
                        <button
                          className="btn-sm btn-delete"
                          onClick={() => onDeleteItem(item._id)}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────── TAB: LOGS ───────── */}
      {adminTab === 'logs' && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            🪵 บันทึกกิจกรรมระบบ (System Audit Log / History)
          </h3>
          {auditLogs.length === 0 ? (
            <div className="empty-state">
              <p>ยังไม่มีบันทึกกิจกรรมในระบบ</p>
            </div>
          ) : (
            <div className="logs-list">
              {auditLogs.map((log) => (
                <div key={log._id} className="log-item">
                  <div className="log-meta-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        className={`action-badge ${log.action.toLowerCase().split('_')[0]}`}
                      >
                        {log.action}
                      </span>
                      <span className="log-details">{log.details}</span>
                    </div>
                    <span className="log-actor">
                      ดำเนินการโดย:{' '}
                      <span style={{ color: 'white' }}>{log.performedBy}</span>
                    </span>
                  </div>
                  <span className="log-date">{formatDate(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────── UNITS MODAL ───────── */}
      {selectedItemForUnits && (
        <UnitsModal
          item={selectedItemForUnits}
          actorEmail={actorEmail}
          onClose={() => setSelectedItemForUnits(null)}
          onToast={onToast}
        />
      )}

      {/* ───────── QR SCANNER ───────── */}
      {showQRScanner && (
        <QRScanner
          onResult={handleScanResult}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* ───────── SCAN RESULT CARD ───────── */}
      {scanResult && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">🔲 ผลการสแกน QR Code</h3>
              <button className="close-btn" onClick={() => setScanResult(null)}>
                ×
              </button>
            </div>

            {scanResult.loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  color: 'var(--color-primary-light)',
                }}
              >
                กำลังโหลดข้อมูล unit...
              </div>
            ) : scanResult.unit ? (
              <div style={{ padding: '4px 0' }}>
                <div
                  style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                    {scanResult.unit.serial}
                  </div>
                  <div
                    style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}
                  >
                    📦 {scanResult.itemName}
                  </div>
                  {scanResult.unit.location && (
                    <div
                      style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}
                    >
                      📍 {scanResult.unit.location}
                    </div>
                  )}
                  <div style={{ marginTop: '10px' }}>
                    <span
                      className={
                        scanResult.unit.status === 'available'
                          ? 'status-badge available'
                          : scanResult.unit.status === 'lost'
                            ? 'status-badge unavailable'
                            : 'status-badge maintenance'
                      }
                    >
                      {STATUS_LABEL[scanResult.unit.status]}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="btn-sm btn-approve"
                    onClick={() => {
                      const item = items.find((i) => i._id === scanResult.raw.itemId);
                      if (item) setSelectedItemForUnits(item);
                      setScanResult(null);
                    }}
                  >
                    🏷️ จัดการ Units
                  </button>
                  <button
                    className="btn-sm btn-edit"
                    onClick={() => setScanResult(null)}
                  >
                    ปิด
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>
                <p>ไม่พบ Unit ที่ตรงกับ QR Code นี้ในระบบ</p>
                <p style={{ fontSize: '12px', marginTop: '8px', fontFamily: 'monospace' }}>
                  itemId: {scanResult.raw.itemId}
                  <br />
                  unitId: {scanResult.raw.unitId}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
