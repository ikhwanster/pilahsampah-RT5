/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase.ts';
import { 
  User, 
  TrashDeposit, 
  RewardItem, 
  RewardClaim, 
  CleanupFeedback, 
  PickupSchedule, 
  SystemNotification,
  TrashCategory
} from './types.ts';

// Encryption Settings
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const SECRET_SALT = process.env.ENCRYPTION_SECRET || 'taman_buaran_indah_iv_rt005_default_secret_key';

// Derive a secure 32-byte key from the salt
const getEncryptionKey = (): Buffer => {
  return crypto.createHash('sha256').update(SECRET_SALT).digest();
};

/**
 * Encrypts a string using AES-256-CBC.
 * Returns format: "iv_hex:encrypted_hex"
 */
export function encrypt(text: string): string {
  try {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text; // Fallback
  }
}

/**
 * Decrypts an encrypted string in the format "iv_hex:encrypted_hex".
 */
export function decrypt(encryptedTextWithIv: string): string {
  try {
    if (!encryptedTextWithIv) return '';
    if (!encryptedTextWithIv.includes(':')) {
      return encryptedTextWithIv;
    }
    const [ivHex, encryptedHex] = encryptedTextWithIv.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[ENCRYPTED]';
  }
}

/**
 * Simple SHA-256 password hashing helper.
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initial Seed Data
const DEFAULT_REWARDS: RewardItem[] = [
  { id: 'r1', title: 'Minyak Goreng Bimoli 1 Liter', description: 'Minyak goreng kelapa sawit berkualitas tinggi untuk kebutuhan dapur.', pointsCost: 80, stock: 15 },
  { id: 'r2', title: 'Gula Pasir Gulaku 1 kg', description: 'Gula pasir tebu murni, bersih dan manis alami.', pointsCost: 60, stock: 20 },
  { id: 'r3', title: 'Beras Sentra Ramos 2.5 kg', description: 'Beras putih pulen kualitas premium asli Cianjur.', pointsCost: 150, stock: 10 },
  { id: 'r4', title: 'Sabun Cuci Piring Mama Lemon 700ml', description: 'Cairan pencuci piring dengan ekstrak lemon segar menghilangkan lemak membandel.', pointsCost: 40, stock: 25 },
  { id: 'r5', title: 'Susu Kental Manis Frisian Flag 370g', description: 'Susu kental manis lezat untuk campuran minuman dan makanan.', pointsCost: 30, stock: 30 }
];

const DEFAULT_SCHEDULES: PickupSchedule[] = [
  { id: 's1', day: 'Senin', time: '08:00 - 10:00', category: 'Organik', notes: 'Dapur basah, sisa makanan, dedaunan. Gunakan wadah hijau.' },
  { id: 's2', day: 'Rabu', time: '08:00 - 10:00', category: 'Anorganik (Plastik, Kertas, Logam)', notes: 'Plastik bersih, kardus, botol beling. Gunakan wadah kuning/karung.' },
  { id: 's3', day: 'Sabtu', time: '09:00 - 11:00', category: 'Semua Jenis & Sampah B3', notes: 'Penjemputan menyeluruh mingguan dan barang berbahaya (baterai, lampu).' }
];

// --- ASYNCHRONOUS FIRESTORE WRAPPERS ---

export async function getUsers(): Promise<Record<string, User & { passwordHash: string }>> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users: Record<string, User & { passwordHash: string }> = {};
    snap.forEach(docSnap => {
      users[docSnap.id] = docSnap.data() as User & { passwordHash: string };
    });
    return users;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'users');
    return {};
  }
}

export async function getUser(userId: string): Promise<(User & { passwordHash: string }) | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as User & { passwordHash: string };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    return null;
  }
}

export async function saveUser(userId: string, user: User & { passwordHash: string }): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId), user);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
  }
}

export async function updateUser(userId: string, data: Partial<User & { passwordHash: string }>): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function getDeposits(): Promise<TrashDeposit[]> {
  try {
    const snap = await getDocs(collection(db, 'deposits'));
    const list: TrashDeposit[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as TrashDeposit);
    });
    // Sort descending by createdAt
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'deposits');
    return [];
  }
}

export async function saveDeposit(depositId: string, deposit: TrashDeposit): Promise<void> {
  try {
    await setDoc(doc(db, 'deposits', depositId), deposit);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `deposits/${depositId}`);
  }
}

export async function updateDeposit(depositId: string, data: Partial<TrashDeposit>): Promise<void> {
  try {
    await updateDoc(doc(db, 'deposits', depositId), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `deposits/${depositId}`);
  }
}

export async function getRewards(): Promise<RewardItem[]> {
  try {
    const snap = await getDocs(collection(db, 'rewards'));
    const list: RewardItem[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as RewardItem);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'rewards');
    return [];
  }
}

export async function saveReward(rewardId: string, reward: RewardItem): Promise<void> {
  try {
    await setDoc(doc(db, 'rewards', rewardId), reward);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rewards/${rewardId}`);
  }
}

export async function getClaims(): Promise<RewardClaim[]> {
  try {
    const snap = await getDocs(collection(db, 'claims'));
    const list: RewardClaim[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as RewardClaim);
    });
    return list.sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'claims');
    return [];
  }
}

export async function saveClaim(claimId: string, claim: RewardClaim): Promise<void> {
  try {
    await setDoc(doc(db, 'claims', claimId), claim);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `claims/${claimId}`);
  }
}

export async function updateClaim(claimId: string, data: Partial<RewardClaim>): Promise<void> {
  try {
    await updateDoc(doc(db, 'claims', claimId), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `claims/${claimId}`);
  }
}

export async function getFeedbacks(): Promise<CleanupFeedback[]> {
  try {
    const snap = await getDocs(collection(db, 'feedbacks'));
    const list: CleanupFeedback[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as CleanupFeedback);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'feedbacks');
    return [];
  }
}

export async function saveFeedback(feedbackId: string, feedback: CleanupFeedback): Promise<void> {
  try {
    await setDoc(doc(db, 'feedbacks', feedbackId), feedback);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `feedbacks/${feedbackId}`);
  }
}

export async function getSchedules(): Promise<PickupSchedule[]> {
  try {
    const snap = await getDocs(collection(db, 'schedules'));
    const list: PickupSchedule[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as PickupSchedule);
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'schedules');
    return [];
  }
}

export async function saveSchedule(scheduleId: string, schedule: PickupSchedule): Promise<void> {
  try {
    await setDoc(doc(db, 'schedules', scheduleId), schedule);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `schedules/${scheduleId}`);
  }
}

export async function getNotifications(): Promise<SystemNotification[]> {
  try {
    const snap = await getDocs(collection(db, 'notifications'));
    const list: SystemNotification[] = [];
    snap.forEach(docSnap => {
      list.push(docSnap.data() as SystemNotification);
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'notifications');
    return [];
  }
}

export async function saveNotification(notificationId: string, notification: SystemNotification): Promise<void> {
  try {
    await setDoc(doc(db, 'notifications', notificationId), notification);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `notifications/${notificationId}`);
  }
}

export async function updateNotification(notificationId: string, data: Partial<SystemNotification>): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), data);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

/**
 * Pre-seeds Firestore collections if the 'users' collection is currently empty.
 */
export async function seedFirestoreIfNeeded(): Promise<void> {
  try {
    const userDocs = await getDocs(collection(db, 'users'));
    if (!userDocs.empty) {
      console.log('Firestore already has data, skipping seeding.');
      return;
    }

    console.log('Firestore is empty. Beginning pre-seeding process...');

    // Users
    const initialUsers: Record<string, User & { passwordHash: string }> = {
      'u-admin': {
        id: 'u-admin',
        name: 'Pak Bambang (Ketua RT)',
        username: 'admin',
        role: 'admin',
        address: encrypt('Rumah Dinas RT 005, Blok A No. 1'),
        phone: encrypt('08111222333'),
        points: 0,
        totalTrashWeight: 0,
        createdAt: '2026-01-01T00:00:00Z',
        passwordHash: hashPassword('admin123')
      },
      'u1': {
        id: 'u1',
        name: 'Siti Rahma',
        username: 'siti',
        role: 'citizen',
        address: encrypt('Taman Buaran Indah IV Blok C No. 12'),
        phone: encrypt('081234567890'),
        points: 240,
        totalTrashWeight: 35.5,
        createdAt: '2026-01-10T10:00:00Z',
        passwordHash: hashPassword('siti123')
      },
      'u2': {
        id: 'u2',
        name: 'Budi Santoso',
        username: 'budi',
        role: 'citizen',
        address: encrypt('Taman Buaran Indah IV Blok D No. 5'),
        phone: encrypt('081398765432'),
        points: 180,
        totalTrashWeight: 28.0,
        createdAt: '2026-01-12T11:00:00Z',
        passwordHash: hashPassword('budi123')
      },
      'u3': {
        id: 'u3',
        name: 'Dewi Lestari',
        username: 'dewi',
        role: 'citizen',
        address: encrypt('Taman Buaran Indah IV Blok A No. 8'),
        phone: encrypt('081522334455'),
        points: 310,
        totalTrashWeight: 42.2,
        createdAt: '2026-01-15T09:00:00Z',
        passwordHash: hashPassword('dewi123')
      },
      'u4': {
        id: 'u4',
        name: 'Agus Salim',
        username: 'agus',
        role: 'citizen',
        address: encrypt('Taman Buaran Indah IV Blok B No. 3'),
        phone: encrypt('081900112233'),
        points: 95,
        totalTrashWeight: 14.8,
        createdAt: '2026-02-01T14:00:00Z',
        passwordHash: hashPassword('agus123')
      }
    };

    for (const [id, user] of Object.entries(initialUsers)) {
      await setDoc(doc(db, 'users', id), user);
    }

    // Rewards
    for (const r of DEFAULT_REWARDS) {
      await setDoc(doc(db, 'rewards', r.id), r);
    }

    // Schedules
    for (const s of DEFAULT_SCHEDULES) {
      await setDoc(doc(db, 'schedules', s.id), s);
    }

    // Deposits
    const initialDeposits: TrashDeposit[] = [
      { id: 'd1', userId: 'u1', userName: 'Siti Rahma', category: 'plastic', weight: 12.5, pointsEarned: 125, date: '2026-07-01', status: 'approved', notes: 'Botol air kemasan bersih, ember pecah', createdAt: '2026-07-01T09:15:00Z', approvedAt: '2026-07-01T17:00:00Z' },
      { id: 'd2', userId: 'u1', userName: 'Siti Rahma', category: 'paper', weight: 23.0, pointsEarned: 115, date: '2026-07-03', status: 'approved', notes: 'Kardus tebal sisa paket online dan majalah bekas', createdAt: '2026-07-03T08:30:00Z', approvedAt: '2026-07-03T17:00:00Z' },
      { id: 'd3', userId: 'u2', userName: 'Budi Santoso', category: 'metal', weight: 8.0, pointsEarned: 160, date: '2026-07-04', status: 'approved', notes: 'Kaleng minuman ringan dan perkakas besi bekas', createdAt: '2026-07-04T10:00:00Z', approvedAt: '2026-07-04T17:00:00Z' },
      { id: 'd4', userId: 'u2', userName: 'Budi Santoso', category: 'organic', weight: 20.0, pointsEarned: 20, date: '2026-07-05', status: 'approved', notes: 'Sisa potongan sayur dan dedaunan halaman', createdAt: '2026-07-05T07:45:00Z', approvedAt: '2026-07-05T17:00:00Z' },
      { id: 'd5', userId: 'u3', userName: 'Dewi Lestari', category: 'glass', weight: 15.2, pointsEarned: 152, date: '2026-07-06', status: 'approved', notes: 'Botol sirup beling dan toples kaca pecah', createdAt: '2026-07-06T11:00:00Z', approvedAt: '2026-07-06T17:00:00Z' },
      { id: 'd6', userId: 'u3', userName: 'Dewi Lestari', category: 'plastic', weight: 27.0, pointsEarned: 270, date: '2026-07-08', status: 'approved', notes: 'Galon kosong bekas dan kantong plastik pilahan', createdAt: '2026-07-08T09:30:00Z', approvedAt: '2026-07-08T17:00:00Z' },
      { id: 'd7', userId: 'u4', userName: 'Agus Salim', category: 'paper', weight: 14.8, pointsEarned: 74, date: '2026-07-09', status: 'approved', notes: 'Koran bekas tumpukan beberapa bulan', createdAt: '2026-07-09T08:00:00Z', approvedAt: '2026-07-09T17:00:00Z' },
      { id: 'd-pending1', userId: 'u1', userName: 'Siti Rahma', category: 'plastic', weight: 5.5, pointsEarned: 55, date: '2026-07-10', status: 'pending', notes: 'Botol sampo bekas, tutup botol, kemasan sachet plastik', createdAt: '2026-07-10T14:30:00Z' },
      { id: 'd-pending2', userId: 'u2', userName: 'Budi Santoso', category: 'paper', weight: 12.0, pointsEarned: 60, date: '2026-07-10', status: 'pending', notes: 'Buku pelajaran bekas anak dan bungkus kertas semen', createdAt: '2026-07-10T16:15:00Z' }
    ];

    for (const d of initialDeposits) {
      await setDoc(doc(db, 'deposits', d.id), d);
    }

    // Claims
    const initialClaims: RewardClaim[] = [
      { id: 'c1', userId: 'u3', userName: 'Dewi Lestari', rewardId: 'r1', rewardTitle: 'Minyak Goreng Bimoli 1 Liter', pointsCost: 80, status: 'completed', claimedAt: '2026-07-08T18:00:00Z' },
      { id: 'c2', userId: 'u3', userName: 'Dewi Lestari', rewardId: 'r2', rewardTitle: 'Gula Pasir Gulaku 1 kg', pointsCost: 60, status: 'completed', claimedAt: '2026-07-08T18:02:00Z' },
      { id: 'c3', userId: 'u4', userName: 'Agus Salim', rewardId: 'r4', rewardTitle: 'Sabun Cuci Piring Mama Lemon 700ml', pointsCost: 40, status: 'completed', claimedAt: '2026-07-09T17:30:00Z' },
      { id: 'c-pending1', userId: 'u2', userName: 'Budi Santoso', rewardId: 'r1', rewardTitle: 'Minyak Goreng Bimoli 1 Liter', pointsCost: 80, status: 'pending', claimedAt: '2026-07-10T18:30:00Z' }
    ];

    for (const c of initialClaims) {
      await setDoc(doc(db, 'claims', c.id), c);
    }

    // Feedbacks
    const initialFeedbacks: CleanupFeedback[] = [
      { id: 'f1', userId: 'u1', userName: 'Siti Rahma', rating: 5, comment: 'Petugas penjemputan sangat ramah, datang tepat waktu setiap Senin pagi. Aplikasi sangat memudahkan warga!', serviceType: 'pickup', createdAt: '2026-07-05T12:00:00Z' },
      { id: 'f2', userId: 'u2', userName: 'Budi Santoso', rating: 4, comment: 'Layanan kebersihan lingkungan RT 005 sudah bagus. Pengingat jadwal sampah di aplikasi sangat membantu.', serviceType: 'cleanliness', createdAt: '2026-07-06T14:30:00Z' }
    ];

    for (const fb of initialFeedbacks) {
      await setDoc(doc(db, 'feedbacks', fb.id), fb);
    }

    // Notifications
    const initialNotifications: SystemNotification[] = [
      { id: 'n1', userId: 'u1', message: 'Setoran sampah botol plastik 12.5 kg Anda telah disetujui! +125 Poin.', type: 'points_earned', isRead: true, createdAt: '2026-07-01T17:00:00Z' },
      { id: 'n2', userId: 'u3', message: 'Penukaran 80 Poin dengan Minyak Goreng Bimoli 1L telah diselesaikan oleh admin.', type: 'reward_status', isRead: false, createdAt: '2026-07-08T18:05:00Z' },
      { id: 'n3', userId: 'u1', message: 'Pengingat: Jadwal penjemputan Sampah Organik esok hari pukul 08:00.', type: 'schedule_reminder', isRead: false, createdAt: '2026-07-09T19:00:00Z' }
    ];

    for (const n of initialNotifications) {
      await setDoc(doc(db, 'notifications', n.id), n);
    }

    console.log('Firestore data pre-seeding completed successfully.');
  } catch (err) {
    console.error('Error pre-seeding Firestore:', err);
  }
}
