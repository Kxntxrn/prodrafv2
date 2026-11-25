import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  listUnits,
  addUnit,
  updateUnit,
  deleteUnit,
  type Item,
  type Unit,
} from '../lib/db';
import { QRCodeCard } from './QRCodeCard';

interface UnitsModalProps {
  item: Item;
  actorEmail: string;
  onClose: () => void;
  onToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const STATUS_OPTIONS: { value: Unit['status']; label: string }[] = [
  { value: 'available', label: '🟢 ว่าง' },
  { value: 'borrowed', label: '🟡 ถูกยืม' },
  { value: 'maintenance', label: '🔧 ซ่อมบำรุง' },
  { value: 'lost', label: '🔴 สูญหาย' },
];

function StatusBadge({ status }: { status: Unit['status'] }) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status);
  const cls =
    status === 'available'
      ? 'status-badge available'
      : status === 'lost'
        ? 'status-badge unavailable'
        : 'status-badge maintenance';
  return <span className={cls}>{opt?.label ?? status}</span>;
}

export function UnitsModal({ item, actorEmail, onClose, onToast }: UnitsModalProps) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);

  // Add form state
  const [serial, setSerial] = useState('');
  const [status, setStatus] = useState<Unit['status']>('available');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      setUnits(await listUnits(item._id));
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'โหลด units ไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, [item._id, onToast]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const resetForm = () => {
    setSerial('');
    setStatus('available');
    setLocation('');
    setNotes('');
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!serial.trim()) {
      onToast('กรุณาระบุ Serial Number', 'warning');
      return;
    }
    setLoading(true);
    try {
      await addUnit(item._id, { serial: serial.trim(), status, location, notes }, actorEmail);
      onToast(`เพิ่ม Unit "${serial}" เรียบร้อยแล้ว`, 'success');
      setShowAddForm(false);
      resetForm();
      await fetchUnits();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'เพิ่ม Unit ไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (unit: Unit, newStatus: Unit['status']) => {
    setLoading(true);
    try {
      await updateUnit(item._id, unit._id, { status: newStatus }, actorEmail);
      onToast('อัปเดตสถานะเรียบร้อยแล้ว', 'success');
      await fetchUnits();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'อัปเดตไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (unit: Unit) => {
    if (!confirm(`ลบ Unit "${unit.serial}" ใช่หรือไม่?`)) return;
    setLoading(true);
    try {
      await deleteUnit(item._id, unit._id, actorEmail);
      onToast('ลบ Unit เรียบร้อยแล้ว', 'success');
      setExpandedQR(null);
      await fetchUnits();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'ลบไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const availableCount = units.filter((u) => u.status === 'available').length;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <h3 className="modal-title">
            🏷️ Units ของ {item.name}
            <span
              style={{
                marginLeft: '10px',
                fontSize: '13px',
                fontWeight: 400,
                color: 'var(--color-text-secondary)',
              }}
            >
              {units.length} ชิ้น · ว่าง {availableCount} ชิ้น
            </span>
          </h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button
            className="form-submit-btn"
            style={{ width: 'auto', padding: '8px 16px' }}
            onClick={() => {
              setShowAddForm((v) => !v);
              resetForm();
            }}
          >
            {showAddForm ? 'ยกเลิก' : '➕ เพิ่ม Unit'}
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAdd}
            style={{
              marginBottom: '20px',
              padding: '16px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Serial Number *</label>
                <input
                  className="form-input"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="เช่น SN-2026-001"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">สถานะเริ่มต้น</label>
                <select
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Unit['status'])}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">สถานที่จัดเก็บ</label>
              <input
                className="form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น ตู้ IT ชั้น 3"
              />
            </div>
            <div className="form-group">
              <label className="form-label">หมายเหตุ</label>
              <input
                className="form-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม..."
              />
            </div>
            <div className="flex-end">
              <button
                type="submit"
                className="form-submit-btn"
                style={{ width: 'auto', padding: '8px 20px' }}
                disabled={loading}
              >
                💾 บันทึก
              </button>
            </div>
          </form>
        )}

        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '12px',
              color: 'var(--color-primary-light)',
            }}
          >
            กำลังโหลด...
          </div>
        )}

        {!loading && units.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏷️</div>
            <h3>ยังไม่มี Units สำหรับสินค้านี้</h3>
            <p>กดปุ่ม &quot;เพิ่ม Unit&quot; เพื่อเพิ่มรายการอุปกรณ์รายชิ้นพร้อม QR Code</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {units.map((unit) => (
              <div
                key={unit._id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>
                      {unit.serial}
                    </div>
                    {unit.location && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        📍 {unit.location}
                      </div>
                    )}
                    {unit.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        📝 {unit.notes}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--color-text-muted)',
                        marginTop: '4px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {unit._id}
                    </div>
                  </div>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <StatusBadge status={unit.status} />
                    <select
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                      value={unit.status}
                      onChange={(e) =>
                        handleUpdateStatus(unit, e.target.value as Unit['status'])
                      }
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-sm btn-edit"
                      onClick={() =>
                        setExpandedQR(expandedQR === unit._id ? null : unit._id)
                      }
                    >
                      {expandedQR === unit._id ? 'ซ่อน QR' : '🔲 QR Code'}
                    </button>
                    <button
                      className="btn-sm btn-delete"
                      onClick={() => handleDelete(unit)}
                    >
                      ลบ
                    </button>
                  </div>
                </div>

                {expandedQR === unit._id && (
                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <QRCodeCard unit={unit} itemName={item.name} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
