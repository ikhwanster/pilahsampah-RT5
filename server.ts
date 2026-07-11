/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { 
  getUsers,
  getUser,
  saveUser,
  updateUser,
  getDeposits,
  saveDeposit,
  updateDeposit,
  getRewards,
  saveReward,
  getClaims,
  saveClaim,
  updateClaim,
  getFeedbacks,
  saveFeedback,
  getSchedules,
  saveSchedule,
  getNotifications,
  saveNotification,
  updateNotification,
  seedFirestoreIfNeeded,
  encrypt, 
  decrypt, 
  hashPassword 
} from './src/server_db';
import { 
  User, 
  TrashDeposit, 
  RewardClaim, 
  CleanupFeedback, 
  PickupSchedule, 
  SystemNotification, 
  TrashCategory 
} from './src/types';

const app = express();
const PORT = 3000;

// Helper to handle async route errors
const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

app.use(express.json());

// API MIDDLEWARE: Simple tokenless auth header for reliable iframe operations
// Residents are authenticated by sending 'X-Citizen-Id' header
const getAuthUser = async (req: express.Request): Promise<User | null> => {
  const userId = req.headers['x-citizen-id'] as string;
  if (!userId) return null;
  let user = await getUser(userId);
  if (!user) {
    // Dynamically initialize default citizen profile for Firebase Auth users in local db
    const email = req.headers['x-citizen-email'] as string || 'warga@pilahsampah005.com';
    const cleanName = email.split('@')[0];
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'citizen';
    
    user = {
      id: userId,
      name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      username: cleanName,
      role,
      address: encrypt('Alamat RT 005'),
      phone: encrypt('08123456789'),
      points: 100,
      totalTrashWeight: 0,
      createdAt: new Date().toISOString(),
      passwordHash: ''
    };
    await saveUser(userId, user);
  }
  
  // Return user with decrypted PII
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    address: decrypt(user.address),
    phone: decrypt(user.phone),
    points: user.points,
    totalTrashWeight: user.totalTrashWeight,
    createdAt: user.createdAt
  };
};

// ==========================================
// 1. AUTHENTICATION API
// ==========================================

// Register a new citizen
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, password, address, phone, id } = req.body;
    
    if (!name || !username || !address || !phone) {
      res.status(400).json({ error: 'Semua bidang wajib diisi!' });
      return;
    }

    const users = await getUsers();
    
    // Check if username exists (only if no id is provided)
    if (!id) {
      const userExists = Object.values(users).some(u => u.username.toLowerCase() === username.toLowerCase());
      if (userExists) {
        res.status(400).json({ error: 'Username sudah terdaftar! Gunakan yang lain.' });
        return;
      }
    }

    const newUserId = id || `u-${Date.now()}`;
    const newUser = {
      id: newUserId,
      name,
      username,
      role: (username.toLowerCase().includes('admin') ? 'admin' : 'citizen') as 'admin' | 'citizen',
      address: encrypt(address),
      phone: encrypt(phone),
      points: 100, // starting points
      totalTrashWeight: 0,
      createdAt: new Date().toISOString(),
      passwordHash: password ? hashPassword(password) : ''
    };

    await saveUser(newUserId, newUser);

    // Create system notification for welcoming user
    const welcomeNotif: SystemNotification = {
      id: `n-${Date.now()}`,
      userId: newUserId,
      message: `Selamat datang di program Pilah Sampah RT 005, ${name}! Mulai pilah sampah Anda dan kumpulkan poin menarik.`,
      type: 'general',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await saveNotification(welcomeNotif.id, welcomeNotif);

    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        role: newUser.role,
        address,
        phone,
        points: newUser.points,
        totalTrashWeight: newUser.totalTrashWeight,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Gagal melakukan pendaftaran akun.' });
  }
});

// Login citizen or admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ error: 'Username dan Password harus diisi!' });
      return;
    }

    const users = await getUsers();
    const hashedPassword = hashPassword(password);
    
    const userEntry = Object.values(users).find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.passwordHash === hashedPassword
    );

    if (!userEntry) {
      res.status(401).json({ error: 'Username atau Password salah!' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: userEntry.id,
        name: userEntry.name,
        username: userEntry.username,
        role: userEntry.role,
        address: decrypt(userEntry.address),
        phone: decrypt(userEntry.phone),
        points: userEntry.points,
        totalTrashWeight: userEntry.totalTrashWeight,
        createdAt: userEntry.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Gagal melakukan login.' });
  }
});

// Get profile
app.get('/api/auth/me', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sesi tidak valid / Silakan login kembali.' });
    return;
  }
  res.json({ user });
}));

// ==========================================
// 2. TRASH DEPOSITS API
// ==========================================

// Calculate points based on category & weight (points per kg)
const getPointsPerKg = (category: TrashCategory): number => {
  switch (category) {
    case 'organic': return 1; // 1 point/kg
    case 'paper': return 5;   // 5 points/kg
    case 'plastic': return 10; // 10 points/kg
    case 'glass': return 10;   // 10 points/kg
    case 'metal': return 20;   // 20 points/kg
    default: return 3;
  }
};

// Get trash deposits
app.get('/api/deposits', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const deposits = await getDeposits();
  if (user.role === 'admin') {
    res.json(deposits);
  } else {
    // Only return deposits for this citizen
    const userDeposits = deposits.filter(d => d.userId === user.id);
    res.json(userDeposits);
  }
}));

// Submit a new deposit (Citizen only)
app.post('/api/deposits', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'citizen') {
    res.status(401).json({ error: 'Hanya warga yang dapat mencatat setoran sampah.' });
    return;
  }

  const { category, weight, notes } = req.body;
  if (!category || !weight || isNaN(Number(weight)) || Number(weight) <= 0) {
    res.status(400).json({ error: 'Kategori dan berat sampah (lebih dari 0 kg) wajib diisi!' });
    return;
  }

  const calculatedPoints = Math.round(Number(weight) * getPointsPerKg(category as TrashCategory));

  const newDeposit: TrashDeposit = {
    id: `d-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    category: category as TrashCategory,
    weight: Number(weight),
    pointsEarned: calculatedPoints,
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  await saveDeposit(newDeposit.id, newDeposit);

  // Admin Notification
  const adminNotif: SystemNotification = {
    id: `n-${Date.now()}-adm`,
    userId: 'u-admin',
    message: `Setoran baru dari warga: ${user.name} menyetor ${weight} kg ${category}. Perlu verifikasi.`,
    type: 'general',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  await saveNotification(adminNotif.id, adminNotif);

  res.status(201).json(newDeposit);
}));

// Approve or Reject Deposit (Admin only)
app.put('/api/deposits/:id/status', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Hanya Admin (Pak RT) yang memiliki otorisasi ini!' });
    return;
  }

  const { id } = req.params;
  const { status, notes } = req.body; // status: 'approved' | 'rejected'

  if (status !== 'approved' && status !== 'rejected') {
    res.status(400).json({ error: 'Status harus approved atau rejected.' });
    return;
  }

  const deposits = await getDeposits();
  const deposit = deposits.find(d => d.id === id);
  if (!deposit) {
    res.status(404).json({ error: 'Data setoran tidak ditemukan.' });
    return;
  }

  if (deposit.status !== 'pending') {
    res.status(400).json({ error: 'Setoran ini sudah diverifikasi sebelumnya.' });
    return;
  }

  const updateData: Partial<TrashDeposit> = {
    status,
    approvedAt: new Date().toISOString()
  };
  if (notes) {
    updateData.notes = (deposit.notes ? deposit.notes + " | " : "") + "Catatan RT: " + notes;
  }
  await updateDeposit(id, updateData);

  // If approved, update Citizen's points & weight statistics
  if (status === 'approved') {
    const resident = await getUser(deposit.userId);
    if (resident) {
      await updateUser(deposit.userId, {
        points: resident.points + deposit.pointsEarned,
        totalTrashWeight: Number((resident.totalTrashWeight + deposit.weight).toFixed(2))
      });
    }

    // Citizen Real-time point update notification
    const citizenNotif: SystemNotification = {
      id: `n-${Date.now()}-approved`,
      userId: deposit.userId,
      message: `🎉 Setoran sampah ${deposit.weight}kg (${deposit.category}) disetujui! Anda mendapatkan +${deposit.pointsEarned} poin.`,
      type: 'points_earned',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await saveNotification(citizenNotif.id, citizenNotif);
  } else {
    // Rejected Notification
    const citizenNotif: SystemNotification = {
      id: `n-${Date.now()}-rejected`,
      userId: deposit.userId,
      message: `❌ Setoran sampah ${deposit.weight}kg (${deposit.category}) ditolak oleh RT: ${notes || 'Tidak memenuhi kriteria pilah.'}`,
      type: 'general',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await saveNotification(citizenNotif.id, citizenNotif);
  }

  res.json({ ...deposit, ...updateData });
}));

// ==========================================
// 3. REWARDS MARKETPLACE & CLAIMS API
// ==========================================

// Get all rewards
app.get('/api/rewards', asyncHandler(async (req, res) => {
  const rewards = await getRewards();
  res.json(rewards);
}));

// Get claims
app.get('/api/claims', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const claims = await getClaims();
  if (user.role === 'admin') {
    res.json(claims);
  } else {
    res.json(claims.filter(c => c.userId === user.id));
  }
}));

// Claim a reward (Citizen only)
app.post('/api/claims', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'citizen') {
    res.status(401).json({ error: 'Hanya warga yang dapat melakukan penukaran poin.' });
    return;
  }

  const { rewardId } = req.body;
  if (!rewardId) {
    res.status(400).json({ error: 'ID Hadiah wajib diisi!' });
    return;
  }

  const rewards = await getRewards();
  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) {
    res.status(404).json({ error: 'Hadiah tidak ditemukan.' });
    return;
  }

  if (reward.stock <= 0) {
    res.status(400).json({ error: 'Stok hadiah ini sedang habis!' });
    return;
  }

  const citizen = await getUser(user.id);
  if (!citizen || citizen.points < reward.pointsCost) {
    res.status(400).json({ error: `Poin tidak cukup! Anda memerlukan ${reward.pointsCost} poin, saldo Anda adalah ${citizen?.points || 0} poin.` });
    return;
  }

  // Deduct points and adjust stock
  await updateUser(user.id, { points: citizen.points - reward.pointsCost });
  await saveReward(reward.id, { ...reward, stock: reward.stock - 1 });

  const newClaim: RewardClaim = {
    id: `c-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    rewardId: reward.id,
    rewardTitle: reward.title,
    pointsCost: reward.pointsCost,
    status: 'pending',
    claimedAt: new Date().toISOString()
  };

  await saveClaim(newClaim.id, newClaim);

  // Notify citizen
  const claimNotif: SystemNotification = {
    id: `n-${Date.now()}-claim`,
    userId: user.id,
    message: `Permintaan penukaran hadiah ${reward.title} senilai ${reward.pointsCost} poin sedang diproses.`,
    type: 'reward_status',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  await saveNotification(claimNotif.id, claimNotif);

  // Notify admin
  const adminClaimNotif: SystemNotification = {
    id: `n-${Date.now()}-claim-adm`,
    userId: 'u-admin',
    message: `Klaim hadiah baru: ${user.name} menukarkan ${reward.pointsCost} poin untuk ${reward.title}.`,
    type: 'general',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  await saveNotification(adminClaimNotif.id, adminClaimNotif);

  res.status(201).json({ claim: newClaim, currentPoints: citizen.points - reward.pointsCost });
}));

// Update claim status (Admin completes delivery)
app.put('/api/claims/:id/status', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Hanya Admin yang dapat menyelesaikan status klaim.' });
    return;
  }

  const { id } = req.params;
  const { status } = req.body; // status: 'completed'

  if (status !== 'completed') {
    res.status(400).json({ error: 'Status harus completed.' });
    return;
  }

  const claims = await getClaims();
  const claim = claims.find(c => c.id === id);
  if (!claim) {
    res.status(404).json({ error: 'Transaksi penukaran tidak ditemukan.' });
    return;
  }

  if (claim.status === 'completed') {
    res.status(400).json({ error: 'Transaksi penukaran ini sudah selesai didistribusikan.' });
    return;
  }

  await updateClaim(id, { status: 'completed' });

  // Real-time Notification to citizen
  const citizenNotif: SystemNotification = {
    id: `n-${Date.now()}-claim-done`,
    userId: claim.userId,
    message: `🎁 Hadiah "${claim.rewardTitle}" Anda telah siap dan sukses diserahkan oleh Admin RT 005! Terima kasih atas partisipasi aktifnya.`,
    type: 'reward_status',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  await saveNotification(citizenNotif.id, citizenNotif);

  res.json({ ...claim, status: 'completed' });
}));

// ==========================================
// 4. LEADERBOARD API
// ==========================================
app.get('/api/leaderboard', asyncHandler(async (req, res) => {
  const users = await getUsers();
  // Filter out admins from leaderboard, and sort citizens by points (and trash weight)
  const citizens = Object.values(users)
    .filter(u => u.role === 'citizen')
    .map(u => ({
      id: u.id,
      name: u.name,
      points: u.points,
      totalTrashWeight: u.totalTrashWeight,
      createdAt: u.createdAt
    }))
    .sort((a, b) => b.points - a.points || b.totalTrashWeight - a.totalTrashWeight);

  res.json(citizens);
}));

// ==========================================
// 5. SCHEDULES API
// ==========================================
app.get('/api/schedules', asyncHandler(async (req, res) => {
  const schedules = await getSchedules();
  res.json(schedules);
}));

// ==========================================
// 6. CLEANLINESS FEEDBACK API
// ==========================================

// Submit feedback (Citizen only)
app.post('/api/feedback', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'citizen') {
    res.status(401).json({ error: 'Hanya warga yang dapat mengirim umpan balik.' });
    return;
  }

  const { rating, comment, serviceType } = req.body;
  if (!rating || !comment || !serviceType) {
    res.status(400).json({ error: 'Rating (1-5), komentar, dan jenis layanan wajib diisi!' });
    return;
  }

  const ratingNum = Number(rating);
  if (ratingNum < 1 || ratingNum > 5) {
    res.status(400).json({ error: 'Penilaian (rating) harus berkisar antara 1 s/d 5.' });
    return;
  }

  const newFeedback: CleanupFeedback = {
    id: `f-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    rating: ratingNum,
    comment,
    serviceType: serviceType as 'pickup' | 'cleanliness' | 'app',
    createdAt: new Date().toISOString()
  };

  await saveFeedback(newFeedback.id, newFeedback);

  // Notify admin of new feedback
  const adminNotif: SystemNotification = {
    id: `n-${Date.now()}-fb-adm`,
    userId: 'u-admin',
    message: `Umpan balik baru bintang ${ratingNum} dari ${user.name}: "${comment.substring(0, 30)}..."`,
    type: 'general',
    isRead: false,
    createdAt: new Date().toISOString()
  };
  await saveNotification(adminNotif.id, adminNotif);

  res.status(201).json(newFeedback);
}));

// Get all feedback (Admin only)
app.get('/api/feedback', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Akses terbatas untuk Pengurus RT saja.' });
    return;
  }
  const feedbacks = await getFeedbacks();
  res.json(feedbacks);
}));

// ==========================================
// 7. REAL-TIME NOTIFICATIONS API
// ==========================================

// Get notifications for authenticated user
app.get('/api/notifications', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const notifications = await getNotifications();
  const userNotifications = notifications
    .filter(n => n.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(userNotifications);
}));

// Mark all as read
app.put('/api/notifications/read-all', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const notifications = await getNotifications();
  for (const n of notifications) {
    if (n.userId === user.id && !n.isRead) {
      await updateNotification(n.id, { isRead: true });
    }
  }

  res.json({ success: true });
}));

// Admin-wide summary overview statistics API
app.get('/api/admin/summary', asyncHandler(async (req, res) => {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const deposits = await getDeposits();
  const claims = await getClaims();
  const users = await getUsers();
  const approvedDeposits = deposits.filter(d => d.status === 'approved');
  
  const totalWeight = approvedDeposits.reduce((acc, curr) => acc + curr.weight, 0);
  const totalPointsDistributed = approvedDeposits.reduce((acc, curr) => acc + curr.pointsEarned, 0);
  
  const totalCitizens = Object.values(users).filter(u => u.role === 'citizen').length;
  const pendingDepositsCount = deposits.filter(d => d.status === 'pending').length;
  const pendingClaimsCount = claims.filter(c => c.status === 'pending').length;

  // Group weight by trash category
  const categoryWeights: Record<string, number> = {
    organic: 0,
    plastic: 0,
    paper: 0,
    metal: 0,
    glass: 0,
    other: 0
  };

  approvedDeposits.forEach(d => {
    if (categoryWeights[d.category] !== undefined) {
      categoryWeights[d.category] += d.weight;
    } else {
      categoryWeights.other += d.weight;
    }
  });

  res.json({
    totalWeight: Number(totalWeight.toFixed(2)),
    totalPointsDistributed,
    totalCitizens,
    pendingDepositsCount,
    pendingClaimsCount,
    categoryWeights,
    recentDeposits: deposits.slice(0, 5),
    recentClaims: claims.slice(0, 5)
  });
}));

// Global error handler middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err instanceof Error ? err.message : String(err)
  });
});

// ==========================================
// VITE DEV SERVER & PRODUCTION ASSETS ROUTING
// ==========================================

async function startServer() {
  // Ensure Firestore is properly seeded
  await seedFirestoreIfNeeded();

  if (process.env.VERCEL) {
    // On Vercel, the serverless handler handles routing.
    // Static files and SPA fallbacks are managed by Vercel's edge network via vercel.json.
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

export default app;
