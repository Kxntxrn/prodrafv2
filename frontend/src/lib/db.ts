import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '../config/firebase';

export interface Item {
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

export interface AppUser {
  _id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  phone?: string;
  department?: string;
}

export interface BorrowingItem {
  _id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  serialNumber?: string;
  condition?: string;
}

export interface Borrowing {
  _id: string;
  userId: AppUser;
  firebaseUid: string;
  items: BorrowingItem[];
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'borrowed' | 'returned' | 'overdue';
  approvedBy?: Pick<AppUser, '_id' | 'displayName' | 'email'>;
  approvedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  details: string;
  performedBy: string;
  createdAt: string;
}

export class AppError extends Error {}

const SEED_ITEMS: Array<Omit<Item, '_id' | 'createdAt'> & { id: string }> = [
  {
    id: 'seed-esdang',
    name: 'เอสแดง',
    category: 'equipment',
    totalQuantity: 2,
    availableQuantity: 2,
    unit: 'เครื่อง',
    description: 'หุ่นจำลองระบบทางเดินหายใจ (ปอดจำลองเอสแดง) สำหรับการเรียนการสอนสรีรวิทยา',
    location: 'ตู้เก็บของห้องปฏิบัติการชั้น 2',
    status: 'active',
  },
  {
    id: 'seed-keyboard',
    name: 'คีย์บอร์ดไร้สาย Logi',
    category: 'device',
    totalQuantity: 5,
    availableQuantity: 5,
    unit: 'ชิ้น',
    description: 'Wireless Keyboard for IT staff and developers',
    location: 'ตู้ IT ชั้น 3',
    status: 'active',
  },
  {
    id: 'seed-react-book',
    name: 'หนังสือ React 19 ใน 24 ชั่วโมง',
    category: 'book',
    totalQuantity: 3,
    availableQuantity: 3,
    unit: 'เล่ม',
    description: 'หนังสือสอนการเขียน React 19 ตั้งแต่พื้นฐานจนถึงขั้นสูง',
    location: 'ห้องสมุดชั้น 1',
    status: 'active',
  },
  {
    id: 'seed-sony',
    name: 'หูฟังตัดเสียงรบกวน Sony',
    category: 'device',
    totalQuantity: 4,
    availableQuantity: 4,
    unit: 'เครื่อง',
    description: 'Sony Noise Cancelling Headphones for deep work',
    location: 'ห้อง IT ชั้น 3',
    status: 'active',
  },
];

function asAppError(error: unknown): never {
  if (error instanceof AppError) throw error;
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied') || code.includes('unauthenticated')) {
    throw new AppError(
      'Firestore ปฏิเสธสิทธิ์ — เปิดฐานข้อมูลในโปรเจกต์ qrcodeborrowdiwa แล้ว deploy rules ก่อนใช้งาน',
    );
  }
  if (
    code.includes('unavailable') ||
    code.includes('not-found') ||
    code.includes('failed-precondition')
  ) {
    throw new AppError(
      'ยังเชื่อม Firestore ของโปรเจกต์ qrcodeborrowdiwa ไม่ได้ — สร้างฐานข้อมูล Firestore (โหมด production) ก่อน',
    );
  }
  if (error instanceof Error) throw error;
  throw new AppError('เกิดข้อผิดพลาดจาก Firebase');
}

function withId<T>(id: string, data: DocumentData): T {
  return { ...(data as object), _id: id } as T;
}

function byNewest<T extends { createdAt?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function syncUser(firebaseUser: FirebaseUser, recordLogin = false): Promise<AppUser> {
  try {
    const email = firebaseUser.email || '';
    const ref = doc(db, 'users', firebaseUser.uid);
    const [snap, tokenResult] = await Promise.all([getDoc(ref), firebaseUser.getIdTokenResult()]);
    const isAdmin = tokenResult.claims.admin === true;
    const existing = snap.exists() ? snap.data() : null;
    const displayName =
      firebaseUser.displayName || existing?.displayName || email.split('@')[0] || 'ผู้ใช้';

    const profile: AppUser = {
      _id: firebaseUser.uid,
      firebaseUid: firebaseUser.uid,
      email,
      displayName,
      role: isAdmin ? 'admin' : 'user',
      phone: existing?.phone || '',
      department: existing?.department || '',
    };

    const now = new Date().toISOString();
    if (!existing) {
      await setDoc(ref, {
        ...profile,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      });
    } else if (
      existing.firebaseUid !== profile.firebaseUid ||
      existing.email !== email ||
      existing.displayName !== displayName
    ) {
      await updateDoc(ref, {
        firebaseUid: profile.firebaseUid,
        email: profile.email,
        displayName: profile.displayName,
        updatedAt: now,
      });
    }

    if (recordLogin) {
      await writeLog(
        'LOGIN',
        `ผู้ใช้ ${profile.displayName} (${profile.email}) เข้าสู่ระบบ`,
        profile.email,
      );
    }
    return profile;
  } catch (error) {
    asAppError(error);
  }
}

export async function seedItemsIfEmpty(): Promise<void> {
  try {
    const now = new Date().toISOString();
    for (const item of SEED_ITEMS) {
      const ref = doc(db, 'items', item.id);
      const snap = await getDoc(ref);
      if (snap.exists()) continue;
      const { id, ...fields } = item;
      await setDoc(ref, { ...fields, createdAt: now, updatedAt: now });
    }
  } catch (error) {
    asAppError(error);
  }
}

export async function listItems(): Promise<Item[]> {
  try {
    const snap = await getDocs(collection(db, 'items'));
    return byNewest(snap.docs.map((row) => withId<Item>(row.id, row.data())));
  } catch (error) {
    asAppError(error);
  }
}

export async function getItem(id: string): Promise<Item> {
  try {
    const snap = await getDoc(doc(db, 'items', id));
    if (!snap.exists()) throw new AppError('ไม่พบสินค้า');
    return withId<Item>(snap.id, snap.data());
  } catch (error) {
    asAppError(error);
  }
}

export async function saveItem(
  id: string | null,
  fields: Omit<Item, '_id' | 'createdAt'>,
  actorEmail: string,
): Promise<void> {
  try {
    const now = new Date().toISOString();
    if (id) {
      await updateDoc(doc(db, 'items', id), { ...fields, updatedAt: now });
      await writeLog(
        'UPDATE_ITEM',
        `อัปเดตสินค้า: ${fields.name} (คงเหลือ: ${fields.availableQuantity}/${fields.totalQuantity} ${fields.unit})`,
        actorEmail,
      );
      return;
    }
    const ref = doc(collection(db, 'items'));
    await setDoc(ref, { ...fields, createdAt: now, updatedAt: now });
    await writeLog(
      'CREATE_ITEM',
      `สร้างสินค้าใหม่: ${fields.name} (จำนวนรวม: ${fields.totalQuantity} ${fields.unit})`,
      actorEmail,
    );
  } catch (error) {
    asAppError(error);
  }
}

export async function removeItem(id: string, name: string, actorEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'items', id));
    await writeLog('DELETE_ITEM', `ลบสินค้า: ${name}`, actorEmail);
  } catch (error) {
    asAppError(error);
  }
}

export async function createBorrowRequest(input: {
  user: AppUser;
  item: Item;
  quantity: number;
  borrowDate: string;
  expectedReturnDate: string;
  reason: string;
}): Promise<void> {
  try {
    if (input.item.availableQuantity < input.quantity) {
      throw new AppError(
        `สินค้า ${input.item.name} คงเหลือไม่พอ (คงเหลือ ${input.item.availableQuantity} ${input.item.unit})`,
      );
    }
    const now = new Date().toISOString();
    const ref = doc(collection(db, 'borrowings'));
    await setDoc(ref, {
      userId: {
        _id: input.user._id,
        firebaseUid: input.user.firebaseUid,
        email: input.user.email,
        displayName: input.user.displayName,
        role: input.user.role,
        phone: input.user.phone || '',
        department: input.user.department || '',
      },
      firebaseUid: input.user.firebaseUid,
      items: [
        {
          _id: input.item._id,
          itemId: input.item._id,
          itemName: input.item.name,
          quantity: input.quantity,
        },
      ],
      borrowDate: input.borrowDate,
      expectedReturnDate: new Date(input.expectedReturnDate).toISOString(),
      reason: input.reason,
      status: 'pending',
      notes: '',
      createdAt: now,
      updatedAt: now,
    });
    await writeLog(
      'SUBMIT_BORROW',
      `ส่งคำขอยืม: ${input.item.name} (จำนวน ${input.quantity}) | เหตุผล: ${input.reason}`,
      input.user.email,
    );
  } catch (error) {
    asAppError(error);
  }
}

export async function listMyBorrowings(firebaseUid: string): Promise<Borrowing[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'borrowings'), where('firebaseUid', '==', firebaseUid)),
    );
    return byNewest(snap.docs.map((row) => withId<Borrowing>(row.id, row.data())));
  } catch (error) {
    asAppError(error);
  }
}

export async function listAllBorrowings(): Promise<Borrowing[]> {
  try {
    const snap = await getDocs(collection(db, 'borrowings'));
    return byNewest(snap.docs.map((row) => withId<Borrowing>(row.id, row.data())));
  } catch (error) {
    asAppError(error);
  }
}

export async function listLogs(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(collection(db, 'auditLogs'));
    return byNewest(snap.docs.map((row) => withId<AuditLog>(row.id, row.data())));
  } catch (error) {
    asAppError(error);
  }
}

const ALLOWED_TRANSITIONS: Record<Borrowing['status'], Borrowing['status'][]> = {
  pending: ['approved', 'rejected'],
  approved: ['borrowed', 'returned'],
  rejected: [],
  borrowed: ['returned', 'overdue'],
  returned: [],
  overdue: ['returned'],
};

export async function updateBorrowStatus(input: {
  id: string;
  status: Borrowing['status'];
  notes?: string;
  admin: AppUser;
}): Promise<string> {
  try {
    let errorMessage = '';
    let logAction = 'UPDATE_BORROW';
    let logDetails = '';
    const now = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      errorMessage = '';
      const borrowRef = doc(db, 'borrowings', input.id);
      const borrowSnap = await tx.get(borrowRef);
      if (!borrowSnap.exists()) {
        errorMessage = 'ไม่พบคำขอยืม';
        return;
      }
      const borrowing = borrowSnap.data() as Borrowing;
      const allowed = ALLOWED_TRANSITIONS[borrowing.status] || [];
      if (!allowed.includes(input.status)) {
        errorMessage = `ไม่สามารถเปลี่ยนสถานะจาก ${borrowing.status} เป็น ${input.status} ได้`;
        return;
      }

      const items = borrowing.items || [];
      const itemsList = items.map((item) => `${item.itemName} (จำนวน ${item.quantity})`).join(', ');
      logAction = 'UPDATE_BORROW';
      logDetails = `อัปเดตคำขอยืมสินค้า: ${itemsList} เป็นสถานะ ${input.status}`;

      if (input.status === 'approved') {
        const itemSnaps = await Promise.all(
          items
            .filter((line) => Boolean(line.itemId))
            .map(async (line) => ({
              line,
              ref: doc(db, 'items', line.itemId),
              snap: await tx.get(doc(db, 'items', line.itemId)),
            })),
        );

        for (const entry of itemSnaps) {
          if (!entry.snap.exists()) continue;
          const available = Number(entry.snap.data().availableQuantity || 0);
          if (available < entry.line.quantity) {
            errorMessage = `สินค้า ${entry.line.itemName} คงเหลือไม่พอ`;
            return;
          }
        }

        for (const entry of itemSnaps) {
          if (!entry.snap.exists()) continue;
          const available = Number(entry.snap.data().availableQuantity || 0);
          tx.update(entry.ref, {
            availableQuantity: available - entry.line.quantity,
            updatedAt: now,
          });
        }

        tx.update(borrowRef, {
          status: 'approved',
          approvedBy: {
            _id: input.admin._id,
            displayName: input.admin.displayName,
            email: input.admin.email,
          },
          approvedAt: now,
          notes: input.notes || borrowing.notes || '',
          updatedAt: now,
        });
        logAction = 'APPROVE_BORROW';
        logDetails = `อนุมัติให้ยืมสินค้า: ${itemsList} (โดยผู้ดูแลระบบ)`;
        return;
      }

      if (input.status === 'rejected') {
        tx.update(borrowRef, {
          status: 'rejected',
          notes: input.notes || '',
          updatedAt: now,
        });
        logAction = 'REJECT_BORROW';
        logDetails = `ปฏิเสธคำขอยืมสินค้า: ${itemsList} | เหตุผล/หมายเหตุ: ${input.notes || '-'}`;
        return;
      }

      if (input.status === 'returned') {
        const itemSnaps = await Promise.all(
          items
            .filter((line) => Boolean(line.itemId))
            .map(async (line) => ({
              line,
              ref: doc(db, 'items', line.itemId),
              snap: await tx.get(doc(db, 'items', line.itemId)),
            })),
        );

        for (const entry of itemSnaps) {
          if (!entry.snap.exists()) continue;
          const available = Number(entry.snap.data().availableQuantity || 0);
          tx.update(entry.ref, {
            availableQuantity: available + entry.line.quantity,
            updatedAt: now,
          });
        }

        tx.update(borrowRef, {
          status: 'returned',
          actualReturnDate: now,
          notes: input.notes || borrowing.notes || '',
          updatedAt: now,
        });
        logAction = 'RETURN_ITEM';
        logDetails = `รับคืนสินค้าเรียบร้อย: ${itemsList}`;
        return;
      }

      tx.update(borrowRef, {
        status: input.status,
        notes: input.notes ?? borrowing.notes ?? '',
        updatedAt: now,
      });
    });

    if (errorMessage) throw new AppError(errorMessage);
    await writeLog(logAction, logDetails, input.admin.email);
    return `อัปเดตสถานะเป็น ${input.status} เรียบร้อย`;
  } catch (error) {
    asAppError(error);
  }
}

// ================================================================
// Units (subcollection items/{itemId}/units/{unitId})
// ================================================================

export interface Unit {
  _id: string;
  itemId: string;
  serial: string;
  status: 'available' | 'borrowed' | 'maintenance' | 'lost';
  location?: string;
  notes?: string;
  qrId: string; // = _id — encoded in QR as "itemId::unitId::serial"
  createdAt: string;
  updatedAt: string;
}

export function encodeQrContent(unit: Unit): string {
  return `${unit.itemId}::${unit._id}::${unit.serial}`;
}

export function decodeQrContent(
  raw: string,
): { itemId: string; unitId: string; serial: string } | null {
  const parts = raw.split('::');
  if (parts.length < 3) return null;
  const [itemId, unitId, ...serialParts] = parts;
  return { itemId, unitId, serial: serialParts.join('::') };
}

export async function listUnits(itemId: string): Promise<Unit[]> {
  try {
    const snap = await getDocs(collection(db, 'items', itemId, 'units'));
    return snap.docs.map((row) => withId<Unit>(row.id, { ...row.data(), itemId }));
  } catch (error) {
    asAppError(error);
  }
}

export async function addUnit(
  itemId: string,
  fields: { serial: string; status: Unit['status']; location?: string; notes?: string },
  actorEmail: string,
): Promise<void> {
  try {
    const ref = doc(collection(db, 'items', itemId, 'units'));
    const now = new Date().toISOString();
    await setDoc(ref, {
      itemId,
      serial: fields.serial,
      status: fields.status,
      location: fields.location ?? '',
      notes: fields.notes ?? '',
      qrId: ref.id,
      createdAt: now,
      updatedAt: now,
    });
    await writeLog('ADD_UNIT', `เพิ่ม Unit: ${fields.serial} ให้กับ item ${itemId}`, actorEmail);
  } catch (error) {
    asAppError(error);
  }
}

export async function updateUnit(
  itemId: string,
  unitId: string,
  fields: Partial<{ serial: string; status: Unit['status']; location: string; notes: string }>,
  actorEmail: string,
): Promise<void> {
  try {
    const now = new Date().toISOString();
    await updateDoc(doc(db, 'items', itemId, 'units', unitId), { ...fields, updatedAt: now });
    await writeLog(
      'UPDATE_UNIT',
      `อัปเดต Unit ${unitId}${fields.status ? ` → ${fields.status}` : ''}`,
      actorEmail,
    );
  } catch (error) {
    asAppError(error);
  }
}

export async function deleteUnit(
  itemId: string,
  unitId: string,
  actorEmail: string,
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'items', itemId, 'units', unitId));
    await writeLog('DELETE_UNIT', `ลบ Unit ${unitId} จาก item ${itemId}`, actorEmail);
  } catch (error) {
    asAppError(error);
  }
}

export async function getUnit(itemId: string, unitId: string): Promise<Unit | null> {
  try {
    const snap = await getDoc(doc(db, 'items', itemId, 'units', unitId));
    if (!snap.exists()) return null;
    return withId<Unit>(snap.id, { ...snap.data(), itemId });
  } catch (error) {
    asAppError(error);
  }
}

async function writeLog(action: string, details: string, performedBy: string) {
  const ref = doc(collection(db, 'auditLogs'));
  await setDoc(ref, {
    action,
    details,
    performedBy,
    createdAt: new Date().toISOString(),
  });
}
