import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider, signInWithPopup, signOut } from './config/firebase';
import {
  createBorrowRequest,
  getItem,
  listAllBorrowings,
  listItems,
  listLogs,
  listMyBorrowings,
  removeItem,
  saveItem,
  seedItemsIfEmpty,
  syncUser,
  updateBorrowStatus,
  type AppUser as User,
  type AuditLog,
  type Borrowing,
  type Item,
} from './lib/db';
import { ItemModal } from './components/ItemModal';
import { Navbar } from './components/Navbar';
import { AdminPage } from './pages/AdminPage';
import { InventoryPage } from './pages/InventoryPage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { LoginPage } from './pages/LoginPage';
import { MyBorrowingsPage } from './pages/MyBorrowingsPage';
import { navigateTo, parseHashRoute, type AppRoute } from './utils/router';

function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseHashRoute());
  const [user, setUser] = useState<User | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [myBorrowings, setMyBorrowings] = useState<Borrowing[]>([]);
  const [allBorrowings, setAllBorrowings] = useState<Borrowing[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3500);
    },
    [],
  );

  const goTo = useCallback((nextRoute: AppRoute) => {
    navigateTo(nextRoute);
    setRoute(nextRoute);
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        goTo({ page: 'login' });
        setLoading(false);
        return;
      }
      try {
        const profile = await syncUser(firebaseUser);
        if (profile.role === 'admin') {
          await seedItemsIfEmpty();
        }
        setUser(profile);
        setRoute((current) => {
          if (current.page === 'login') {
            navigateTo({ page: 'inventory' });
            return { page: 'inventory' };
          }
          if (current.page === 'admin' && profile.role !== 'admin') {
            navigateTo({ page: 'inventory' });
            return { page: 'inventory' };
          }
          return current;
        });
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : 'เชื่อมต่อ Firebase ไม่สำเร็จ', 'error');
        goTo({ page: 'login' });
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [goTo, showToast]);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await listItems());
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'ดึงข้อมูลสินค้าไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchItemDetail = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setCurrentItem(await getItem(id));
      } catch (err) {
        console.error(err);
        showToast(
          err instanceof Error ? err.message : 'ดึงข้อมูลรายละเอียดสินค้าไม่สำเร็จ',
          'error',
        );
        goTo({ page: 'inventory' });
      } finally {
        setLoading(false);
      }
    },
    [goTo, showToast],
  );

  const fetchMyBorrowings = useCallback(
    async (firebaseUid: string) => {
      try {
        setLoading(true);
        setMyBorrowings(await listMyBorrowings(firebaseUid));
      } catch (err) {
        console.error(err);
        showToast(err instanceof Error ? err.message : 'ดึงประวัติการยืมไม่สำเร็จ', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [borrowings, inventory, logs] = await Promise.all([
        listAllBorrowings(),
        listItems(),
        listLogs(),
      ]);
      setAllBorrowings(borrowings);
      setItems(inventory);
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'ดึงข้อมูลผู้ดูแลระบบไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user) return;

    if (route.page === 'inventory') {
      fetchItems();
    } else if (route.page === 'item-detail') {
      fetchItemDetail(route.itemId);
    } else if (route.page === 'my-borrowings') {
      fetchMyBorrowings(user.firebaseUid);
    } else if (route.page === 'admin') {
      if (user.role !== 'admin') {
        goTo({ page: 'inventory' });
        return;
      }
      fetchAdminData();
    }
  }, [route, user, fetchItems, fetchItemDetail, fetchMyBorrowings, fetchAdminData, goTo]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await syncUser(result.user, true);
      if (profile.role === 'admin') {
        await seedItemsIfEmpty();
      }
      setUser(profile);
      showToast(`เข้าสู่ระบบสำเร็จในฐานะ ${profile.displayName}`, 'success');
      goTo({ page: 'inventory' });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'ไม่สามารถเข้าสู่ระบบด้วย Google ได้';
      showToast(message, 'error');
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
    setUser(null);
    goTo({ page: 'login' });
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  const handleBorrowSubmit = async (input: {
    quantity: number;
    expectedReturnDate: string;
    reason: string;
  }) => {
    if (!user || !currentItem) return;
    try {
      setLoading(true);
      await createBorrowRequest({
        user,
        item: currentItem,
        quantity: input.quantity,
        borrowDate: new Date().toISOString(),
        expectedReturnDate: input.expectedReturnDate,
        reason: input.reason,
      });
      showToast('ส่งคำขอยืมสำเร็จ รอผู้ดูแลอนุมัติ', 'success');
      goTo({ page: 'my-borrowings' });
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการยื่นคำยืม', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBorrowStatus = async (
    id: string,
    status: 'approved' | 'rejected' | 'returned' | 'borrowed',
    notes?: string,
  ) => {
    if (!user) return;
    try {
      setLoading(true);
      const message = await updateBorrowStatus({ id, status, notes, admin: user });
      showToast(message, 'success');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (
    fields: Omit<Item, '_id' | 'createdAt'>,
    editingId: string | null,
  ) => {
    if (!user) return;
    try {
      setLoading(true);
      await saveItem(editingId, fields, user.email);
      showToast(editingId ? 'อัปเดตข้อมูลสำเร็จ' : 'เพิ่มสินค้าสำเร็จ', 'success');
      setShowItemModal(false);
      fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลสินค้าได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!user) return;
    if (!confirm('คุณต้องการลบสินค้านี้ใช่หรือไม่?')) return;
    const target = items.find((item) => item._id === id);
    try {
      setLoading(true);
      await removeItem(id, target?.name || id, user.email);
      showToast('ลบสินค้าเรียบร้อยแล้ว', 'success');
      fetchAdminData();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'ไม่สามารถลบสินค้าได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
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

      {user && (
        <Navbar
          user={user}
          currentPage={route.page}
          onNavigate={goTo}
          onLogout={handleLogout}
        />
      )}

      <main className="main-content">
        {loading && (
          <div style={{ textAlign: 'center', padding: '12px', color: 'var(--color-primary-light)' }}>
            กำลังโหลดข้อมูล...
          </div>
        )}

        {route.page === 'login' && (
          <LoginPage loading={loading} onGoogleLogin={handleGoogleLogin} />
        )}

        {route.page === 'inventory' && user && (
          <InventoryPage
            items={items}
            onSelectItem={(itemId) => goTo({ page: 'item-detail', itemId })}
          />
        )}

        {route.page === 'item-detail' && user && currentItem && (
          <ItemDetailPage
            key={currentItem._id}
            item={currentItem}
            loading={loading}
            onBack={() => goTo({ page: 'inventory' })}
            onSubmitBorrow={handleBorrowSubmit}
            onWarning={(msg) => showToast(msg, 'warning')}
          />
        )}

        {route.page === 'my-borrowings' && user && (
          <MyBorrowingsPage borrowings={myBorrowings} />
        )}

        {route.page === 'admin' && user?.role === 'admin' && (
          <AdminPage
            allBorrowings={allBorrowings}
            items={items}
            auditLogs={auditLogs}
            actorEmail={user.email}
            onUpdateBorrowStatus={handleUpdateBorrowStatus}
            onAddItem={() => {
              setEditingItem(null);
              setShowItemModal(true);
            }}
            onEditItem={(item) => {
              setEditingItem(item);
              setShowItemModal(true);
            }}
            onDeleteItem={handleDeleteItem}
            onToast={showToast}
          />
        )}
      </main>

      {showItemModal && (
        <ItemModal
          key={editingItem?._id ?? 'new'}
          editingItem={editingItem}
          loading={loading}
          onClose={() => setShowItemModal(false)}
          onSave={handleSaveItem}
          onWarning={(msg) => showToast(msg, 'warning')}
        />
      )}
    </div>
  );
}

export default App;
