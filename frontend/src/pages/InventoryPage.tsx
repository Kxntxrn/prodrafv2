import { useState } from 'react';
import type { Item } from '../lib/db';

interface InventoryPageProps {
  items: Item[];
  onSelectItem: (itemId: string) => void;
}

export function InventoryPage({ items, onSelectItem }: InventoryPageProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">รายการอุปกรณ์/สินค้า</h1>
          <p className="page-subtitle">แสดงพัสดุอุปกรณ์ทั้งหมดที่มีในระบบ รวมถึง &quot;เอสแดง&quot; 2 ตัว</p>
        </div>
        <div className="search-filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 ค้นหาสินค้าตามชื่อหรือรายละเอียด..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>ไม่พบพัสดุที่ค้นหา</h3>
          <p>ลองใช้คำค้นหาอื่นๆ หรือติดต่อผู้ดูแลระบบ</p>
        </div>
      ) : (
        <div className="item-grid">
          {filteredItems.map((item) => (
            <div key={item._id} className="item-card" onClick={() => onSelectItem(item._id)}>
              <div className="item-card-header">
                <span className="item-category-badge">{item.category}</span>
                <span
                  className={
                    item.availableQuantity > 0
                      ? 'status-badge available'
                      : 'status-badge unavailable'
                  }
                >
                  {item.availableQuantity > 0 ? '🟢 ว่าง' : '🔴 หมด'}
                </span>
              </div>
              <h3 className="item-card-title">{item.name}</h3>
              <p className="item-card-desc">{item.description || 'ไม่มีคำอธิบายสำหรับสินค้านี้'}</p>
              <div className="item-card-footer">
                <div className="item-qty">
                  <span>คงเหลือ: </span>
                  {item.availableQuantity} / {item.totalQuantity} {item.unit}
                </div>
                <span className="item-card-action">รายละเอียด →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
