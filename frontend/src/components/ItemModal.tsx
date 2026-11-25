import { useState, type FormEvent } from 'react';
import type { Item } from '../lib/db';

interface ItemModalProps {
  editingItem: Item | null;
  loading: boolean;
  onClose: () => void;
  onSave: (
    fields: Omit<Item, '_id' | 'createdAt'>,
    editingId: string | null,
  ) => Promise<void>;
  onWarning: (message: string) => void;
}

export function ItemModal({
  editingItem,
  loading,
  onClose,
  onSave,
  onWarning,
}: ItemModalProps) {
  const [name, setName] = useState(editingItem?.name ?? '');
  const [category, setCategory] = useState<Item['category']>(editingItem?.category ?? 'other');
  const [totalQuantity, setTotalQuantity] = useState(editingItem?.totalQuantity ?? 1);
  const [unit, setUnit] = useState(editingItem?.unit ?? 'ชิ้น');
  const [description, setDescription] = useState(editingItem?.description ?? '');
  const [location, setLocation] = useState(editingItem?.location ?? '');
  const [status, setStatus] = useState<Item['status']>(editingItem?.status ?? 'active');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onWarning('กรุณาระบุชื่อสินค้า');
      return;
    }

    const availableQuantity = editingItem
      ? Math.max(0, totalQuantity - (editingItem.totalQuantity - editingItem.availableQuantity))
      : totalQuantity;

    await onSave(
      {
        name,
        category,
        totalQuantity,
        availableQuantity,
        unit,
        description,
        location,
        status,
      },
      editingItem?._id || null,
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">
            {editingItem ? '✏️ แก้ไขข้อมูลพัสดุอุปกรณ์' : '➕ เพิ่มอุปกรณ์ชิ้นใหม่เข้าระบบ'}
          </h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">ชื่อสินค้า/พัสดุอุปกรณ์</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="เช่น เอสแดง, คีย์บอร์ดไร้สาย, หนังสือ React 19"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">หมวดหมู่</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as Item['category'])}
              >
                <option value="equipment">Equipment (ครุภัณฑ์)</option>
                <option value="tool">Tool (เครื่องมือ)</option>
                <option value="book">Book (หนังสือ)</option>
                <option value="device">Device (อุปกรณ์ไอที)</option>
                <option value="other">Other (อื่นๆ)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">หน่วยนับ</label>
              <input
                type="text"
                className="form-input"
                placeholder="ชิ้น, เครื่อง, ขวด, เล่ม"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">จำนวนรวมทั้งหมด</label>
              <input
                type="number"
                className="form-input"
                min={0}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">สถานะการใช้งาน</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as Item['status'])}
              >
                <option value="active">Active (ใช้งานได้ปกติ)</option>
                <option value="maintenance">Maintenance (ส่งซ่อม)</option>
                <option value="discontinued">Discontinued (ยกเลิกการใช้)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">สถานที่จัดเก็บพัสดุ</label>
            <input
              type="text"
              className="form-input"
              placeholder="เช่น ตู้เย็นชั้น 1, ห้อง IT ชั้น 3"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">รายละเอียดคำอธิบายสินค้า</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="ระบุสเปกหรือรายละเอียดที่เกี่ยวข้องของสินค้าชิ้นนี้..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex-end" style={{ marginTop: '24px' }}>
            <button type="button" className="nav-btn" onClick={onClose}>
              ยกเลิก
            </button>
            <button
              type="submit"
              className="form-submit-btn"
              style={{ width: 'auto', padding: '10px 24px' }}
              disabled={loading}
            >
              💾 บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
