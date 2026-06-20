import { useState, useEffect } from 'react';
import './App.css';
import { auth, googleProvider, signInWithPopup, signOut } from './config/firebase';

// --- TYPE INTERFACES ---
interface Item {
  _id: string;
  name: string;
  category: 'equipment' | 'tool' | 'book' | 'device' | 'other';
  totalQuantity: number;
  availableQuantity: number;
  unit: string;
  description?: string;
  location?: string;
  status: 'active' | 'maintenance' | 'discontinued';
  createdAt: string;
}

interface User {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  phone?: string;
  department?: string;
}

interface BorrowingItem {
  itemName: string;
  quantity: number;
  serialNumber?: string;
  condition?: string;
  _id?: string;
}

interface Borrowing {
  _id: string;
  userId: User | string; // Populated
  firebaseUid: string;
  items: BorrowingItem[];
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned' | 'overdue';
  approvedBy?: User;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
}

interface AuditLog {
  _id: string;
  action: string;
  details: string;
  performedBy: string;
  createdAt: string;
}

const API_BASE = 'http://localhost:5001/api';

function App() {
  // Navigation & Session
  const [page, setPage] = useState<'login' | 'inventory' | 'item-detail' | 'my-borrowings' | 'admin'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Data lists
  const [items, setItems] = useState<Item[]>([]);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [myBorrowings, setMyBorrowings] = useState<Borrowing[]>([]);
  const [allBorrowings, setAllBorrowings] = useState<Borrowing[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Search/Filters
  const [searchTerm, setSearchTerm] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'requests' | 'inventory' | 'logs'>('requests');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form states
  const [borrowQty, setBorrowQty] = useState(1);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [borrowReason, setBorrowReason] = useState('');

  // Item form states
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<Item['category']>('other');
  const [itemTotalQty, setItemTotalQty] = useState(1);
  const [itemUnit, setItemUnit] = useState('ชิ้น');
  const [itemDesc, setItemDesc] = useState('');
  const [itemLoc, setItemLoc] = useState('');
  const [itemStatus, setItemStatus] = useState<Item['status']>('active');

  // Load user session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setPage('login');
    }
  }, []);

  // Sync data when page changes
  useEffect(() => {
    if (!user) return;

    if (page === 'inventory') {
      fetchItems();
    } else if (page === 'item-detail' && selectedItemId) {
      fetchItemDetail(selectedItemId);
    } else if (page === 'my-borrowings') {
      fetchMyBorrowings();
    } else if (page === 'admin') {
      fetchAdminData();
    }
  }, [page, user, selectedItemId]);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // API Call Headers Helper
  // Helper to handle auth errors (e.g., expired or invalid token)
  const handleAuthError = (data) => {
    if (data && data.message && (data.message.includes('หมดอายุ') || data.message.includes('Token')) ) {
      localStorage.removeItem('auth_token');
      setUser(null);
      setPage('login');
      showToast(data.message, 'error');
      return true;
    }
    return false;
  };

  // API Call Headers Helper
  const getHeaders = () => {
    const token = localStorage.getItem('auth_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  // --- API CALLS ---
  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (handleAuthError(data)) return;
      if (data.success) {
        setUser(data.data);
        setPage('inventory');
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
        setPage('login');
      }
    } catch (err: any) {
      console.error(err);
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
      setPage('login');
    } finally {
      setLoading(false);
    }
  };

  const refreshAuthToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const freshToken = await currentUser.getIdToken(true);
        localStorage.setItem('auth_token', freshToken);
      }
    } catch (e) {
      console.error('Token refresh error:', e);
    }
  };

  // Set up periodic token refresh (every 45 minutes)
  useEffect(() => {
    // Refresh immediately if token exists
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshAuthToken();
    }
    const interval = setInterval(() => {
      refreshAuthToken();
    }, 45 * 60 * 1000); // 45 minutes
    return () => clearInterval(interval);
  }, []);

  // Update handleGoogleLogin to store fresh token and schedule immediate refresh
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      localStorage.setItem('auth_token', token);
      // Immediately refresh token to get longer lifespan
      await refreshAuthToken();

      const res = await fetch(`${API_BASE}/users/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        showToast(`เข้าสู่ระบบสำเร็จในฐานะ ${data.data.displayName}`, 'success');
        setPage('inventory');
      } else {
        showToast(data.message || 'เข้าสู่ระบบล้มเหลว', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้', 'error');
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase sign out error:', err);
    }
    localStorage.removeItem('auth_token');
    setUser(null);
    setPage('login');
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/items`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (handleAuthError(data)) return;
      if (data.success) {
        setItems(data.data);
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ดึงข้อมูลสินค้าไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchItemDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/items/${id}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (handleAuthError(data)) return;
      if (data.success) {
        setCurrentItem(data.data);
        // Reset borrow form
        setBorrowQty(1);
        setBorrowReason('');

        // Default return date is 7 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setExpectedReturnDate(defaultDate.toISOString().split('T')[0]);
      } else {
        showToast(data.message, 'error');
        setPage('inventory');
      }
    } catch (err) {
      console.error(err);
      showToast('ดึงข้อมูลรายละเอียดสินค้าไม่สำเร็จ', 'error');
      setPage('inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBorrowings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/borrowings/my-borrowings`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (handleAuthError(data)) return;
      if (data.success) {
        setMyBorrowings(data.data);
      }
    } catch (err) {
      console.error(err);
      showToast('ดึงประวัติการยืมไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    if (user?.role !== 'admin') return;
    try {
      setLoading(true);
      // Fetch all borrowings
      const bRes = await fetch(`${API_BASE}/borrowings/all`, {
        headers: getHeaders(),
      });
      const bData = await bRes.json();
      if (handleAuthError(bData)) return;
      if (bData.success) setAllBorrowings(bData.data);

      // Fetch all items for inventory management
      const iRes = await fetch(`${API_BASE}/items`, {
        headers: getHeaders(),
      });
      const iData = await iRes.json();
      if (handleAuthError(iData)) return;
      if (iData.success) setItems(iData.data);

      // Fetch audit logs
      const lRes = await fetch(`${API_BASE}/logs`, {
        headers: getHeaders(),
      });
      const lData = await lRes.json();
      if (handleAuthError(lData)) return;
      if (lData.success) setAuditLogs(lData.data);
    } catch (err) {
      console.error(err);
      showToast('ดึงข้อมูลผู้ดูแลระบบไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) return;

    if (borrowQty <= 0) {
      showToast('กรุณาระบุจำนวนสินค้าที่ต้องการยืมมากกว่า 0', 'warning');
      return;
    }
    if (borrowQty > currentItem.availableQuantity) {
      showToast('จำนวนสินค้าคงเหลือไม่พอสำหรับทำรายการ', 'warning');
      return;
    }
    if (!expectedReturnDate) {
      showToast('กรุณาระบุวันที่คาดว่าจะคืน', 'warning');
      return;
    }
    if (!borrowReason.trim()) {
      showToast('กรุณาระบุเหตุผลการยืม', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/borrowings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          items: [
            {
              itemName: currentItem.name,
              quantity: borrowQty,
            },
          ],
          borrowDate: new Date().toISOString(),
          expectedReturnDate,
          reason: borrowReason,
        }),
      });
      const data = await res.json();
      if (handleAuthError(data)) return;
      if (data.success) {
        showToast(data.message || 'ส่งคำขอยืมสำเร็จ รอผู้ดูแลอนุมัติ', 'success');
        setPage('my-borrowings');
      } else {
        showToast(data.message || 'ส่งคำขอยืมล้มเหลว', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการยื่นคำยืม', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBorrowStatus = async (id: string, status: 'approved' | 'rejected' | 'returned' | 'borrowed', notes?: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/borrowings/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (handleAuthError(data)) return;
      if (data.success) {
        showToast(data.message || 'อัปเดตสถานะสำเร็จ', 'success');
        fetchAdminData();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถอัปเดตสถานะได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory('other');
    setItemTotalQty(1);
    setItemUnit('ชิ้น');
    setItemDesc('');
    setItemLoc('');
    setItemStatus('active');
    setShowItemModal(true);
  };

  const openEditItemModal = (item: Item) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemTotalQty(item.totalQuantity);
    setItemUnit(item.unit);
    setItemDesc(item.description || '');
    setItemLoc(item.location || '');
    setItemStatus(item.status);
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      showToast('กรุณาระบุชื่อสินค้า', 'warning');
      return;
    }

    const itemBody = {
      name: itemName,
      category: itemCategory,
      totalQuantity: itemTotalQty,
      availableQuantity: editingItem
        ? Math.max(0, itemTotalQty - (editingItem.totalQuantity - editingItem.availableQuantity))
        : itemTotalQty,
      unit: itemUnit,
      description: itemDesc,
      location: itemLoc,
      status: itemStatus,
    };

    try {
      setLoading(true);
      let res;
      if (editingItem) {
        // Update
        res = await fetch(`${API_BASE}/items/${editingItem._id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(itemBody),
        });
      } else {
        // Create
        res = await fetch(`${API_BASE}/items`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(itemBody),
        });
      }

      const data = await res.json();
      if (data.success) {
        showToast(editingItem ? 'อัปเดตข้อมูลสำเร็จ' : 'เพิ่มสินค้าสำเร็จ', 'success');
        setShowItemModal(false);
        fetchAdminData();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถบันทึกข้อมูลสินค้าได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('คุณต้องการลบสินค้านี้ใช่หรือไม่?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/items/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('ลบสินค้าเรียบร้อยแล้ว', 'success');
        fetchAdminData();
      } else {
        showToast(data.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('ไม่สามารถลบสินค้าได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERED LISTS ---
  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.description && i.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'รอการอนุมัติ';
      case 'approved': return 'อนุมัติแล้ว (รอรับของ)';
      case 'rejected': return 'ปฏิเสธคำขอ';
      case 'borrowed': return 'กำลังยืมอยู่';
      case 'returned': return 'คืนแล้ว';
      case 'overdue': return 'เกินกำหนดคืน';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending': return 'status-badge maintenance';
      case 'approved': return 'status-badge available';
      case 'borrowed': return 'status-badge available';
      case 'returned': return 'status-badge available';
      case 'rejected': return 'status-badge unavailable';
      case 'overdue': return 'status-badge unavailable';
      default: return 'status-badge';
    }
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`notification-toast ${toast.type}`}>
          <span>
            {toast.type === 'success' && '✅ '}
            {toast.type === 'error' && '❌ '}
            {toast.type === 'warning' && '⚠️ '}
            {toast.message}
          </span>
        </div>
      )}

      {/* --- NAVBAR --- */}
      {user && (
        <header className="navbar">
          <div className="navbar-container">
            <div className="nav-brand" onClick={() => setPage('inventory')} style={{ cursor: 'pointer' }}>
              <div className="nav-brand-icon">🫁</div>
              <div>
                RED<span className="nav-brand-highlight">EST</span>
              </div>
            </div>

            <nav className="nav-links">
              <button
                className={`nav-btn ${page === 'inventory' || page === 'item-detail' ? 'active' : ''}`}
                onClick={() => setPage('inventory')}
              >
                📦 สินค้าทั้งหมด
              </button>

              <button
                className={`nav-btn ${page === 'my-borrowings' ? 'active' : ''}`}
                onClick={() => setPage('my-borrowings')}
              >
                📜 ประวัติของฉัน
              </button>

              {user.role === 'admin' && (
                <button
                  className={`nav-btn ${page === 'admin' ? 'active' : ''}`}
                  onClick={() => {
                    setPage('admin');
                    setAdminTab('requests');
                  }}
                >
                  🛡️ แดชบอร์ดแอดมิน
                </button>
              )}

              <div className="user-profile-badge">
                <div className="user-avatar">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="user-info-text">
                  <span className="user-name">{user.displayName}</span>
                  <span className={`role-tag ${user.role}`}>{user.role}</span>
                </div>
                <button className="logout-btn" onClick={handleLogout}>
                  ออก
                </button>
              </div>
            </nav>
          </div>
        </header>
      )}

      {/* --- MAIN CONTENT ROUTING --- */}
      <main className="main-content">
        {loading && <div style={{ textAlign: 'center', padding: '12px', color: 'var(--color-primary-light)' }}>กำลังโหลดข้อมูล...</div>}

        {/* --- LOGIN PAGE --- */}
        {page === 'login' && (
          <div className="login-screen">
            <div className="login-card">
              <div className="login-icon">🫁</div>
              <h2 className="login-title">ระบบยืม-คืนพัสดุ</h2>
              <p className="login-subtitle">กรุณาเลือกรูปแบบเพื่อเข้าสู่ระบบการยืม-คืน</p>

              <div className="firebase-login-section" style={{ marginBottom: '16px' }}>
                <button
                  className="login-action-btn google-btn"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '12px',
                    background: '#4285F4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#357ae8')}
                  onMouseOut={(e) => (e.currentTarget.style.background = '#4285F4')}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.20455C17.64 8.56364 17.5827 7.94727 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="white"/>
                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9577 15.8195L12.0491 13.5614C11.2418 14.1027 10.2109 14.4273 9 14.4273C6.65591 14.4273 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="white"/>
                    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59727 3.68182 9C3.68182 8.40273 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="white"/>
                    <path d="M9 3.57273C10.3214 3.57273 11.5077 4.02955 12.4405 4.92136L15.0218 2.34C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57273 9 3.57273Z" fill="white"/>
                  </svg>
                  <span>🔥 เข้าสู่ระบบผ่าน Google (ระบบจริง)</span>
                </button>
              </div>


            </div>
          </div>
        )}

        {/* --- INVENTORY PAGE --- */}
        {page === 'inventory' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">รายการอุปกรณ์/สินค้า</h1>
                <p className="page-subtitle">แสดงพัสดุอุปกรณ์ทั้งหมดที่มีในระบบ รวมถึง "เอสแดง" 2 ตัว</p>
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
                {filteredItems.map(item => (
                  <div
                    key={item._id}
                    className="item-card"
                    onClick={() => {
                      setSelectedItemId(item._id);
                      setPage('item-detail');
                    }}
                  >
                    <div className="item-card-header">
                      <span className="item-category-badge">{item.category}</span>
                      <span className={item.availableQuantity > 0 ? 'status-badge available' : 'status-badge unavailable'}>
                        {item.availableQuantity > 0 ? '🟢 ว่าง' : '🔴 หมด'}
                      </span>
                    </div>
                    <h3 className="item-card-title">{item.name}</h3>
                    <p className="item-card-desc">{item.description || 'ไม่มีคำอธิบายสำหรับสินค้านี้'}</p>
                    <div className="item-card-footer">
                      <div className="item-qty">
                        <span>คงเหลือ: </span>{item.availableQuantity} / {item.totalQuantity} {item.unit}
                      </div>
                      <span className="item-card-action">รายละเอียด →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- ITEM DETAIL PAGE --- */}
        {page === 'item-detail' && currentItem && (
          <div>
            <div className="back-link" onClick={() => setPage('inventory')}>
              ← กลับไปหน้ารายการสินค้า
            </div>

            <div className="item-detail-container">
              {/* Product Info */}
              <div className="item-info-panel">
                <div className="item-info-header">
                  <h1 className="page-title" style={{ margin: 0 }}>{currentItem.name}</h1>
                  <span className={currentItem.availableQuantity > 0 ? 'status-badge available' : 'status-badge unavailable'} style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {currentItem.availableQuantity > 0 ? '🟢 พร้อมให้ยืม' : '🔴 หมดชั่วคราว'}
                  </span>
                </div>

                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
                  {currentItem.description || 'ไม่มีคำอธิบายเพิ่มเติมเกี่ยวกับสินค้านี้'}
                </p>

                <div className="item-details-list">
                  <div className="item-detail-item">
                    <span className="item-detail-label">หมวดหมู่</span>
                    <span className="item-detail-val" style={{ textTransform: 'capitalize' }}>{currentItem.category}</span>
                  </div>
                  <div className="item-detail-item">
                    <span className="item-detail-label">สถานที่จัดเก็บ</span>
                    <span className="item-detail-val">{currentItem.location || 'ไม่ได้ระบุ'}</span>
                  </div>
                  <div className="item-detail-item">
                    <span className="item-detail-label">จำนวนสินค้าคงเหลือ</span>
                    <span className="item-detail-val">{currentItem.availableQuantity} / {currentItem.totalQuantity} {currentItem.unit}</span>
                  </div>
                  <div className="item-detail-item">
                    <span className="item-detail-label">รหัสสินค้า (ID)</span>
                    <span className="item-detail-val" style={{ fontSize: '12px', wordBreak: 'break-all', color: 'var(--color-primary-light)' }}>{currentItem._id}</span>
                  </div>
                </div>
              </div>

              {/* Borrow Request Form */}
              <div className="borrow-form-panel">
                <h3 className="borrow-form-title">📝 ส่งคำขอใช้บริการ/ยืมสินค้า</h3>

                <form onSubmit={handleBorrowRequest}>
                  <div className="form-group">
                    <label className="form-label">จำนวนสินค้าที่ต้องการยืม ({currentItem.unit})</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={currentItem.availableQuantity}
                      value={borrowQty}
                      onChange={(e) => setBorrowQty(Number(e.target.value))}
                      disabled={currentItem.availableQuantity === 0}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">วันที่คาดว่าจะส่งคืน</label>
                    <input
                      type="date"
                      className="form-input"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      disabled={currentItem.availableQuantity === 0}
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
                      disabled={currentItem.availableQuantity === 0}
                    />
                  </div>

                  <button
                    type="submit"
                    className="form-submit-btn"
                    disabled={currentItem.availableQuantity === 0 || loading}
                  >
                    {currentItem.availableQuantity === 0 ? '🚫 สินค้าหมด ไม่สามารถยืมได้' : '🚀 ยืนยันการส่งคำขอยืมพัสดุ'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* --- MY BORROWINGS PAGE --- */}
        {page === 'my-borrowings' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">ประวัติการยืมสินค้าของฉัน</h1>
                <p className="page-subtitle">แสดงคำขอและสถานะการยืมพัสดุอุปกรณ์ทั้งหมดของคุณ</p>
              </div>
            </div>

            {myBorrowings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📜</div>
                <h3>ยังไม่มีประวัติการส่งคำขอ</h3>
                <p>คำขอที่คุณส่งทั้งหมดจะบันทึกและแสดงสถานะที่นี่</p>
              </div>
            ) : (
              <div className="borrowings-list">
                {myBorrowings.map(borrow => (
                  <div key={borrow._id} className="borrowing-card">
                    <div className="borrowing-info">
                      <div className="borrowing-items-title">
                        {borrow.items.map(item => `${item.itemName} (จำนวน ${item.quantity} ชิ้น)`).join(', ')}
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
                        <div style={{ fontSize: '13px', marginTop: '6px', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '2px solid var(--color-primary)' }}>
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
        )}

        {/* --- ADMIN DASHBOARD PAGE --- */}
        {page === 'admin' && user?.role === 'admin' && (
          <div className="admin-layout">
            <div className="page-header" style={{ marginBottom: '12px' }}>
              <div>
                <h1 className="page-title">🛡️ แผงควบคุมผู้ดูแลระบบ (Admin Console)</h1>
                <p className="page-subtitle">จัดการรายการพัสดุ อนุมัติการยืม และตรวจสอบระบบ/Log ประวัติกิจกรรม</p>
              </div>
            </div>

            {/* Admin Tabs */}
            <div className="tab-nav">
              <button
                className={`tab-btn ${adminTab === 'requests' ? 'active' : ''}`}
                onClick={() => setAdminTab('requests')}
              >
                📥 รายการคำขอยืม ({allBorrowings.filter(b => b.status === 'pending').length})
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
                🪵 บันทึกประวัติ (Audit logs / History)
              </button>
            </div>

            {/* TAB CONTENT: REQUESTS */}
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
                        {allBorrowings.map(borrow => (
                          <tr key={borrow._id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>
                                {typeof borrow.userId === 'object' ? borrow.userId.displayName : 'Unknown User'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                {typeof borrow.userId === 'object' ? borrow.userId.email : borrow.firebaseUid}
                              </div>
                            </td>
                            <td>
                              {borrow.items.map(i => (
                                <div key={i._id} style={{ fontWeight: 500 }}>
                                  {i.itemName} <span style={{ color: 'var(--color-primary-light)' }}>(x{i.quantity})</span>
                                </div>
                              ))}
                            </td>
                            <td>
                              <div style={{ fontSize: '12px' }}>เริ่ม: {formatDate(borrow.borrowDate)}</div>
                              <div style={{ fontSize: '12px', color: 'var(--color-warning)' }}>คืน: {formatDate(borrow.expectedReturnDate)}</div>
                            </td>
                            <td style={{ fontSize: '13px', maxWidth: '200px', wordBreak: 'break-word' }}>
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
                                      onClick={() => handleUpdateBorrowStatus(borrow._id, 'approved')}
                                    >
                                      อนุมัติ
                                    </button>
                                    <button
                                      className="btn-sm btn-reject"
                                      onClick={() => {
                                        const note = prompt('ระบุเหตุผลการปฏิเสธคำขอ:');
                                        if (note !== null) handleUpdateBorrowStatus(borrow._id, 'rejected', note);
                                      }}
                                    >
                                      ปฏิเสธ
                                    </button>
                                  </>
                                )}
                                {borrow.status === 'approved' && (
                                  <button
                                    className="btn-sm btn-approve"
                                    onClick={() => handleUpdateBorrowStatus(borrow._id, 'borrowed')}
                                    style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                                  >
                                    ส่งมอบของแล้ว
                                  </button>
                                )}
                                {borrow.status === 'borrowed' && (
                                  <button
                                    className="btn-sm btn-approve"
                                    onClick={() => handleUpdateBorrowStatus(borrow._id, 'returned')}
                                  >
                                    รับคืนพัสดุ
                                  </button>
                                )}
                                {(borrow.status === 'returned' || borrow.status === 'rejected') && (
                                  <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
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

            {/* TAB CONTENT: INVENTORY */}
            {adminTab === 'inventory' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button className="form-submit-btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={openAddItemModal}>
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
                      {items.map(item => (
                        <tr key={item._id} style={item.name === 'เอสแดง' ? { background: 'rgba(139, 92, 246, 0.04)' } : {}}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {item.name} {item.name === 'เอสแดง' && <span style={{ fontSize: '10px', background: 'red', color: 'white', padding: '2px 4px', borderRadius: '4px' }}>MOCK UP</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {item.description || 'ไม่มีรายละเอียด'}
                            </div>
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{item.availableQuantity}</span> / {item.totalQuantity} {item.unit}
                          </td>
                          <td>{item.location || '-'}</td>
                          <td>
                            <span className={item.status === 'active' ? 'status-badge available' : item.status === 'maintenance' ? 'status-badge maintenance' : 'status-badge unavailable'}>
                              {item.status === 'active' ? '🟢 ใช้งานปกติ' : item.status === 'maintenance' ? '🟡 ซ่อมบำรุง' : '🔴 เลิกใช้งาน'}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn-sm btn-edit" onClick={() => openEditItemModal(item)}>แก้ไข</button>
                              <button className="btn-sm btn-delete" onClick={() => handleDeleteItem(item._id)}>ลบ</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AUDIT LOGS */}
            {adminTab === 'logs' && (
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>🪵 บันทึกกิจกรรมระบบ (System Audit Log / History)</h3>

                {auditLogs.length === 0 ? (
                  <div className="empty-state">
                    <p>ยังไม่มีบันทึกกิจกรรมในระบบ</p>
                  </div>
                ) : (
                  <div className="logs-list">
                    {auditLogs.map(log => (
                      <div key={log._id} className="log-item">
                        <div className="log-meta-group">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className={`action-badge ${log.action.toLowerCase().split('_')[0]}`}>
                              {log.action}
                            </span>
                            <span className="log-details">{log.details}</span>
                          </div>
                          <span className="log-actor">ดำเนินการโดย: <span style={{ color: 'white' }}>{log.performedBy}</span></span>
                        </div>
                        <span className="log-date">{formatDate(log.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- ADD/EDIT ITEM MODAL --- */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">{editingItem ? '✏️ แก้ไขข้อมูลพัสดุอุปกรณ์' : '➕ เพิ่มอุปกรณ์ชิ้นใหม่เข้าระบบ'}</h3>
              <button className="close-btn" onClick={() => setShowItemModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className="form-group">
                <label className="form-label">ชื่อสินค้า/พัสดุอุปกรณ์</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="เช่น เอสแดง, คีย์บอร์ดไร้สาย, หนังสือ React 19"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">หมวดหมู่</label>
                  <select
                    className="form-input"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as Item['category'])}
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
                    value={itemUnit}
                    onChange={(e) => setItemUnit(e.target.value)}
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
                    value={itemTotalQty}
                    onChange={(e) => setItemTotalQty(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">สถานะการใช้งาน</label>
                  <select
                    className="form-input"
                    value={itemStatus}
                    onChange={(e) => setItemStatus(e.target.value as Item['status'])}
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
                  value={itemLoc}
                  onChange={(e) => setItemLoc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">รายละเอียดคำอธิบายสินค้า</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="ระบุสเปกหรือรายละเอียดที่เกี่ยวข้องของสินค้าชิ้นนี้..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                />
              </div>

              <div className="flex-end" style={{ marginTop: '24px' }}>
                <button type="button" className="nav-btn" onClick={() => setShowItemModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="form-submit-btn" style={{ width: 'auto', padding: '10px 24px' }}>
                  💾 บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
