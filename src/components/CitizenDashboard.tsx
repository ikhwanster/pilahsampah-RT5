/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, TrashDeposit, RewardItem, RewardClaim, PickupSchedule, SystemNotification } from '../types.ts';
import { api } from '../utils/api.ts';
import confetti from 'canvas-confetti';
import { 
  LogOut, 
  Trash2, 
  Gift, 
  History, 
  Trophy, 
  Calendar, 
  MessageSquare, 
  Bell, 
  Check, 
  Plus, 
  Scale, 
  Sparkles, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Star,
  RefreshCw,
  ShoppingBag,
  Leaf
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CitizenDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function CitizenDashboard({ user: initialUser, onLogout }: CitizenDashboardProps) {
  const [user, setUser] = useState<User>(initialUser);
  const [activeTab, setActiveTab] = useState<'setor' | 'tukar' | 'riwayat' | 'leaderboard' | 'jadwal' | 'penilaian'>('setor');
  
  // States
  const [deposits, setDeposits] = useState<TrashDeposit[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [schedules, setSchedules] = useState<PickupSchedule[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  
  // Notification Modal
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);

  // Form states: Setor Sampah
  const [category, setCategory] = useState<'organic' | 'plastic' | 'paper' | 'metal' | 'glass' | 'other'>('plastic');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Celebration states
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{
    weight: number;
    category: string;
    points: number;
  } | null>(null);

  // Form states: Penilaian Layanan
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackType, setFeedbackType] = useState<'pickup' | 'cleanliness' | 'app'>('pickup');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  // General Loading State
  const [loading, setLoading] = useState(false);

  // Load state and run real-time updates polling
  const fetchData = async () => {
    try {
      const [userRes, depositsRes, rewardsRes, claimsRes, schedulesRes, leaderboardRes, notificationsRes] = await Promise.all([
        api.get('/api/auth/me'),
        api.get('/api/deposits'),
        api.get('/api/rewards'),
        api.get('/api/claims'),
        api.get('/api/schedules'),
        api.get('/api/leaderboard'),
        api.get('/api/notifications')
      ]);

      if (userRes.user) setUser(userRes.user);
      setDeposits(depositsRes);
      setRewards(rewardsRes);
      setClaims(claimsRes);
      setSchedules(schedulesRes);
      setLeaderboard(leaderboardRes);
      setNotifications(notificationsRes);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));

    // Setup 5-seconds real-time sync polling
    const interval = setInterval(() => {
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSetorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || isNaN(Number(weight)) || Number(weight) <= 0) {
      setFormError('Silakan masukkan berat sampah yang valid (> 0 kg)');
      return;
    }

    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const newDeposit = await api.post('/api/deposits', {
        category,
        weight: Number(weight),
        notes
      });
      setDeposits([newDeposit, ...deposits]);

      const ptsEst = Math.round(Number(weight) * getPointsPerKg(category));
      setCelebrationDetails({
        weight: Number(weight),
        category,
        points: ptsEst
      });
      setShowCelebration(true);

      // Trigger canvas-confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Side bursts
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 }
        });
      }, 150);
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 }
        });
      }, 250);

      setFormSuccess(`Sukses! Setoran sampah ${weight} kg berhasil diajukan ke RT. Menunggu verifikasi.`);
      setWeight('');
      setNotes('');
      // Refresh statistics
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Gagal mengirimkan data setoran.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleClaimReward = async (rewardId: string, title: string, cost: number) => {
    if (user.points < cost) {
      alert(`Poin Anda tidak mencukupi untuk menukar ${title}!`);
      return;
    }
    
    if (!window.confirm(`Apakah Anda yakin ingin menukarkan ${cost} poin dengan "${title}"?`)) {
      return;
    }

    try {
      const data = await api.post('/api/claims', { rewardId });
      // Update local state points & claims
      setUser({ ...user, points: data.currentPoints });
      setClaims([data.claim, ...claims]);
      alert(`🎉 Pengajuan penukaran "${title}" berhasil dikirim! Silakan hubungi Pak RT untuk pengambilan.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Gagal mengajukan penukaran.');
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment) {
      alert('Komentar tidak boleh kosong!');
      return;
    }

    setFeedbackLoading(true);
    setFeedbackSuccess('');

    try {
      await api.post('/api/feedback', {
        rating,
        comment: feedbackComment,
        serviceType: feedbackType
      });
      setFeedbackSuccess('Terima kasih! Penilaian Anda membantu kami meningkatkan layanan kebersihan RT 005.');
      setFeedbackComment('');
      setRating(5);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim umpan balik.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Helper calculation for on-the-fly point estimations
  const getPointsPerKg = (cat: string) => {
    switch (cat) {
      case 'organic': return 1;
      case 'paper': return 5;
      case 'plastic': return 10;
      case 'glass': return 10;
      case 'metal': return 20;
      default: return 3;
    }
  };

  const unreadNotifCount = notifications.filter(n => !n.isRead).length;

  return (
    <div id="citizen-hub" className="min-h-screen bg-natural-bg flex flex-col font-sans pb-16 md:pb-6 text-natural-text">
      
      {/* Top Banner Navigation */}
      <header className="bg-[#E9EBE0] border-b border-natural-border shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-natural-green text-white shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-extrabold text-natural-text block text-sm sm:text-base leading-tight">Pilah RT 005</span>
              <span className="text-[10px] text-natural-muted font-semibold block tracking-wider uppercase">Taman Buaran Indah IV</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                id="btn-notif"
                onClick={() => {
                  setShowNotifDrawer(!showNotifDrawer);
                  if (!showNotifDrawer) markAllNotificationsAsRead();
                }}
                className="p-2.5 rounded-xl border border-natural-border bg-natural-hover/50 hover:bg-natural-hover text-natural-text relative transition-all focus:outline-none cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span id="notif-badge" className="absolute -top-1 -right-1 w-5 h-5 bg-natural-coral text-white rounded-full flex items-center justify-center text-[10px] font-bold animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            </div>

            {/* Logout Button */}
            <button
              id="btn-logout"
              onClick={onLogout}
              className="p-2.5 rounded-xl border border-natural-coral/20 bg-natural-coral/10 hover:bg-natural-coral hover:text-white text-natural-coral transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Profile Summary Sidebar / Left Column */}
        <div className="lg:col-span-1 space-y-5">
          
          {/* User Card */}
          <div className="bg-white rounded-[32px] p-5 shadow-sm border border-natural-card-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-natural-green/10 rounded-full filter blur-xl -mr-6 -mt-6"></div>
            <div className="relative flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-natural-sidebar text-natural-text border border-natural-border font-extrabold flex items-center justify-center text-lg shadow-sm">
                {user.name.substring(0,2).toUpperCase()}
              </div>
              <div>
                <h3 id="profile-name" className="font-serif font-bold text-natural-text leading-tight">{user.name}</h3>
                <span className="text-[10px] text-natural-green bg-natural-green/10 px-2.5 py-0.5 rounded-full font-semibold inline-block mt-1">
                  Warga RT 005
                </span>
              </div>
            </div>

            <div className="border-t border-natural-card-border pt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-natural-muted">Username:</span>
                <span className="font-semibold text-natural-text">@{user.username}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-natural-muted">Kontak HP:</span>
                <span className="font-semibold text-natural-text">{user.phone}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-natural-muted">Alamat:</span>
                <span className="font-semibold text-natural-text">{user.address}</span>
              </div>
            </div>
          </div>

          {/* Quick Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            
            {/* Points Card */}
            <div className="bg-natural-green text-white rounded-[32px] p-5 shadow-md relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 text-white/10">
                <Gift className="w-20 h-20" />
              </div>
              <span className="text-[10px] text-white/80 uppercase font-bold tracking-wider block mb-1">Saldo Poin Warga</span>
              <div className="flex items-baseline gap-1.5">
                <span id="points-display" className="text-3xl font-extrabold tracking-tight">{user.points}</span>
                <span className="text-xs font-semibold text-white/80">Poin</span>
              </div>
              <p className="text-[10px] text-white/95 mt-2 block">
                Tukarkan dengan minyak, beras, atau gula pasir gratis!
              </p>
            </div>

            {/* Total Trash Weight Card */}
            <div className="bg-white rounded-[32px] p-5 shadow-sm border border-natural-card-border relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 text-natural-sidebar">
                <Scale className="w-20 h-20" />
              </div>
              <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block mb-1">Total Setoran Anda</span>
              <div className="flex items-baseline gap-1.5">
                <span id="weight-display" className="text-3xl font-extrabold tracking-tight text-natural-text">{user.totalTrashWeight}</span>
                <span className="text-xs font-semibold text-natural-muted">kg</span>
              </div>
              <p className="text-[10px] text-natural-muted mt-2 block">
                Semakin berat setoran, peringkat leaderboard semakin melesat.
              </p>
            </div>
          </div>

          {/* Sidebar Tabs Menu (Hidden on Mobile) */}
          <nav className="hidden lg:block bg-[#E9EBE0] rounded-[32px] p-2.5 shadow-sm border border-natural-border space-y-1">
            <button
              onClick={() => setActiveTab('setor')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'setor'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-text hover:bg-natural-hover'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Pencatatan Setoran</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveTab('tukar')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'tukar'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-text hover:bg-natural-hover'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gift className="w-4 h-4 shrink-0" />
                <span>Tukar Poin Hadiah</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveTab('riwayat')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'riwayat'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-text hover:bg-natural-hover'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 shrink-0" />
                <span>Riwayat Transaksi</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-text hover:bg-natural-hover'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 shrink-0" />
                <span>Leaderboard Bulanan</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveTab('jadwal')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'jadwal'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-text hover:bg-natural-hover'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Jadwal Penjemputan</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveTab('penilaian')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'penilaian'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-text hover:bg-natural-hover'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Penilaian Kebersihan</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </nav>

        </div>

        {/* Dashboard Content Area / Right Column */}
        <div className="lg:col-span-3">
          
          <AnimatePresence mode="wait">
            
            {/* TAB: SETOR SAMPAH */}
            {activeTab === 'setor' && (
              <motion.div
                key="setor-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Form Card */}
                <div className="bg-white rounded-[32px] p-5 sm:p-6 shadow-sm border border-natural-card-border">
                  <div className="flex items-center gap-2 mb-4 border-b border-natural-border pb-3">
                    <Trash2 className="w-5 h-5 text-natural-green" />
                    <div>
                      <h2 className="font-serif font-bold text-natural-text text-base sm:text-lg">Pencatatan Setoran Sampah Baru</h2>
                      <p className="text-xs text-natural-muted">Isi berat dan kategori sampah yang Anda pilah di rumah.</p>
                    </div>
                  </div>

                  {formError && (
                    <div className="mb-4 p-3 bg-natural-coral/10 border-l-4 border-natural-coral rounded-xl text-xs text-natural-coral font-bold">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="mb-4 p-3 bg-natural-green/10 border-l-4 border-natural-green rounded-xl text-xs text-natural-green flex items-start gap-1.5 font-bold">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleSetorSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Select Category */}
                      <div>
                        <label className="block text-xs font-semibold text-natural-text uppercase tracking-wider mb-1.5">
                          Kategori Sampah Pilahan
                        </label>
                        <select
                          id="input-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value as any)}
                          className="block w-full px-3 py-2 text-sm border border-natural-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-natural-bg/50 text-natural-text"
                        >
                          <option value="plastic">Plastik (Botol, Ember, Wadah) - 10 poin/kg</option>
                          <option value="paper">Kertas (Kardus, Koran, Buku) - 5 poin/kg</option>
                          <option value="organic">Organik (Sisa Makanan, Dedaunan) - 1 poin/kg</option>
                          <option value="metal">Logam (Besi, Kaleng, Seng) - 20 poin/kg</option>
                          <option value="glass">Beling & Kaca (Botol Sirup) - 10 poin/kg</option>
                          <option value="other">Lain-lain / Campuran - 3 poin/kg</option>
                        </select>
                      </div>

                      {/* Weight input */}
                      <div>
                        <label className="block text-xs font-semibold text-natural-text uppercase tracking-wider mb-1.5">
                          Berat Sampah (kg)
                        </label>
                        <div className="relative">
                          <input
                            id="input-weight"
                            type="number"
                            step="0.1"
                            min="0.1"
                            required
                            placeholder="Contoh: 12.5"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="block w-full pr-12 pl-3 py-2 text-sm border border-natural-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-natural-bg/50 text-natural-text"
                          />
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-natural-muted text-xs font-bold">
                            kg
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notes description */}
                    <div>
                      <label className="block text-xs font-semibold text-natural-text uppercase tracking-wider mb-1.5">
                        Detail / Deskripsi Barang (Opsional)
                      </label>
                      <input
                        id="input-notes"
                        type="text"
                        placeholder="Contoh: Botol aqua gelas 3 kantong plastik"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="block w-full px-3 py-2 text-sm border border-natural-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-natural-bg/50 text-natural-text"
                      />
                    </div>

                    {/* Live Points Projection Estimate box */}
                    {weight && Number(weight) > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 bg-natural-green/10 border border-natural-green/20 rounded-xl flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-natural-green animate-bounce" />
                          <span className="text-xs font-semibold text-natural-text">Estimasi Perolehan Poin RT:</span>
                        </div>
                        <span id="projected-points" className="text-lg font-black text-natural-green">
                          +{Math.round(Number(weight) * getPointsPerKg(category))} Poin
                        </span>
                      </motion.div>
                    )}

                    <button
                      id="btn-submit-setoran"
                      type="submit"
                      disabled={formLoading}
                      className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 border border-transparent rounded-xl shadow text-xs font-bold text-white bg-natural-green hover:bg-[#6C8D74] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-natural-green transition-all cursor-pointer"
                    >
                      {formLoading ? 'Mengirim Data...' : 'Ajukan Penimbangan Sampah'}
                      <Plus className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                {/* Quick Info Box */}
                <div className="bg-[#E9EBE0] rounded-[32px] p-5 shadow-sm border border-natural-border">
                  <h3 className="font-bold text-natural-text text-xs uppercase tracking-wider mb-2.5">Aturan Main & Nilai Konversi Sampah RT 005</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-2.5 bg-white border border-natural-border rounded-xl text-center shadow-sm">
                      <span className="text-[10px] text-natural-muted block font-semibold">Plastik</span>
                      <span className="text-xs font-black text-natural-green block mt-0.5">10 Poin / kg</span>
                    </div>
                    <div className="p-2.5 bg-white border border-natural-border rounded-xl text-center shadow-sm">
                      <span className="text-[10px] text-natural-muted block font-semibold">Kertas</span>
                      <span className="text-xs font-black text-natural-text block mt-0.5">5 Poin / kg</span>
                    </div>
                    <div className="p-2.5 bg-white border border-natural-border rounded-xl text-center shadow-sm">
                      <span className="text-[10px] text-natural-muted block font-semibold">Logam</span>
                      <span className="text-xs font-black text-natural-coral block mt-0.5">20 Poin / kg</span>
                    </div>
                    <div className="p-2.5 bg-white border border-natural-border rounded-xl text-center shadow-sm">
                      <span className="text-[10px] text-natural-muted block font-semibold">Kaca</span>
                      <span className="text-xs font-black text-natural-text block mt-0.5">10 Poin / kg</span>
                    </div>
                    <div className="p-2.5 bg-white border border-natural-border rounded-xl text-center shadow-sm">
                      <span className="text-[10px] text-natural-muted block font-semibold">Organik</span>
                      <span className="text-xs font-black text-natural-green block mt-0.5">1 Poin / kg</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: TUKAR POIN */}
            {activeTab === 'tukar' && (
              <motion.div
                key="tukar-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[32px] p-5 shadow-sm border border-natural-card-border">
                  <div className="flex items-center justify-between mb-4 border-b border-natural-border pb-3">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-natural-green" />
                      <div>
                        <h2 className="font-serif font-bold text-natural-text text-base sm:text-lg">Katalog Penukaran Poin</h2>
                        <p className="text-xs text-natural-muted">Tukarkan poin Anda dengan paket sembako gratis dari RT 005.</p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-natural-green/10 border border-natural-green/20 rounded-full text-xs font-extrabold text-natural-green">
                      Saldo Anda: {user.points} Poin
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="rewards-grid">
                    {rewards.map((reward) => {
                      const canClaim = user.points >= reward.pointsCost;
                      return (
                        <div 
                          key={reward.id} 
                          className="border border-natural-card-border rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden bg-white"
                        >
                          {reward.stock === 0 && (
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                              <span className="bg-natural-coral text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Stok Habis</span>
                            </div>
                          )}

                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h3 className="font-serif font-bold text-natural-text text-sm leading-tight">{reward.title}</h3>
                              <span className="text-xs font-black text-natural-green shrink-0 bg-natural-green/10 px-2.5 py-1 rounded-lg">
                                {reward.pointsCost} Poin
                              </span>
                            </div>
                            <p className="text-xs text-natural-muted mb-3">{reward.description}</p>
                          </div>

                          <div className="border-t border-natural-border pt-3 flex items-center justify-between mt-2">
                            <span className="text-[10px] text-natural-muted font-semibold block">
                              Sisa Stok RT: <span className="text-natural-text font-bold">{reward.stock} unit</span>
                            </span>
                            <button
                              onClick={() => handleClaimReward(reward.id, reward.title, reward.pointsCost)}
                              disabled={!canClaim || reward.stock <= 0}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                canClaim 
                                  ? 'bg-natural-green text-white hover:bg-[#6C8D74] shadow-sm' 
                                  : 'bg-natural-hover text-natural-muted cursor-not-allowed'
                              }`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Tukarkan
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: RIWAYAT */}
            {activeTab === 'riwayat' && (
              <motion.div
                key="riwayat-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Trash deposits history */}
                <div className="bg-white rounded-[32px] p-5 shadow-sm border border-natural-card-border">
                  <div className="flex items-center gap-2 mb-4 border-b border-natural-border pb-3">
                    <Trash2 className="w-5 h-5 text-natural-green" />
                    <div>
                      <h2 className="font-serif font-bold text-natural-text text-base">Riwayat Setoran Sampah Pilahan</h2>
                      <p className="text-xs text-natural-muted">Daftar penimbangan yang telah diajukan dan diverifikasi.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs" id="deposits-table">
                      <thead>
                        <tr className="border-b border-natural-border text-natural-muted font-semibold uppercase tracking-wider">
                          <th className="py-2.5">Tanggal</th>
                          <th className="py-2.5">Kategori</th>
                          <th className="py-2.5">Berat (kg)</th>
                          <th className="py-2.5">Poin RT</th>
                          <th className="py-2.5">Status</th>
                          <th className="py-2.5">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-border/30">
                        {deposits.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-natural-muted">Belum ada riwayat setoran sampah.</td>
                          </tr>
                        ) : (
                          deposits.map((dep) => (
                            <tr key={dep.id} className="hover:bg-natural-bg/50 transition-colors">
                              <td className="py-2.5 font-medium text-natural-text">{dep.date}</td>
                              <td className="py-2.5 capitalize font-semibold text-natural-text">
                                {dep.category === 'plastic' && 'Plastik'}
                                {dep.category === 'paper' && 'Kertas'}
                                {dep.category === 'organic' && 'Organik'}
                                {dep.category === 'metal' && 'Logam'}
                                {dep.category === 'glass' && 'Kaca'}
                                {dep.category === 'other' && 'Lainnya'}
                              </td>
                              <td className="py-2.5 font-bold text-natural-text">{dep.weight} kg</td>
                              <td className="py-2.5 font-extrabold text-natural-green">+{dep.pointsEarned}</td>
                              <td className="py-2.5">
                                {dep.status === 'approved' && (
                                  <span className="inline-flex items-center gap-1 bg-natural-green/10 text-natural-green px-2 py-0.5 rounded-full font-semibold">
                                    <CheckCircle className="w-3.5 h-3.5" /> Disetujui
                                  </span>
                                )}
                                {dep.status === 'pending' && (
                                  <span className="inline-flex items-center gap-1 bg-natural-coral/10 text-natural-coral px-2 py-0.5 rounded-full font-semibold">
                                    <Clock className="w-3.5 h-3.5" /> Menunggu
                                  </span>
                                )}
                                {dep.status === 'rejected' && (
                                  <span className="inline-flex items-center gap-1 bg-natural-coral/20 text-natural-coral px-2 py-0.5 rounded-full font-semibold">
                                    <XCircle className="w-3.5 h-3.5" /> Ditolak
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 text-natural-muted max-w-xs truncate">{dep.notes || '-'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Claims history */}
                <div className="bg-white rounded-[32px] p-5 shadow-sm border border-natural-card-border">
                  <div className="flex items-center gap-2 mb-4 border-b border-natural-border pb-3">
                    <Gift className="w-5 h-5 text-natural-green" />
                    <div>
                      <h2 className="font-serif font-bold text-natural-text text-base">Riwayat Penukaran Poin Hadiah</h2>
                      <p className="text-xs text-natural-muted">Daftar transaksi klaim paket sembako di RT 005.</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs" id="claims-table">
                      <thead>
                        <tr className="border-b border-natural-border text-natural-muted font-semibold uppercase tracking-wider">
                          <th className="py-2.5">Tanggal Klaim</th>
                          <th className="py-2.5">Hadiah</th>
                          <th className="py-2.5">Biaya Poin</th>
                          <th className="py-2.5">Status Pengambilan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-border/30">
                        {claims.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-natural-muted">Belum ada pengajuan klaim hadiah.</td>
                          </tr>
                        ) : (
                          claims.map((claim) => (
                            <tr key={claim.id} className="hover:bg-natural-bg/50 transition-colors">
                              <td className="py-2.5 text-natural-muted">
                                {new Date(claim.claimedAt).toLocaleDateString('id-ID', {
                                  year: 'numeric', month: 'short', day: 'numeric'
                                })}
                              </td>
                              <td className="py-2.5 font-bold text-natural-text">{claim.rewardTitle}</td>
                              <td className="py-2.5 font-extrabold text-natural-coral">-{claim.pointsCost} Poin</td>
                              <td className="py-2.5">
                                {claim.status === 'completed' ? (
                                  <span className="inline-flex items-center gap-1 bg-natural-green/10 text-natural-green px-2 py-0.5 rounded-full font-semibold">
                                    <CheckCircle className="w-3.5 h-3.5" /> Sudah Diambil
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-natural-green/10 text-natural-green px-2 py-0.5 rounded-full font-semibold">
                                    <Clock className="w-3.5 h-3.5" /> Siap Diambil di RT
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: LEADERBOARD */}
            {activeTab === 'leaderboard' && (
              <motion.div
                key="leaderboard-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[32px] p-5 shadow-sm border border-natural-card-border">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 border-b border-natural-border pb-3">
                    <div>
                      <h2 className="font-serif font-bold text-natural-text text-base sm:text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-natural-coral" />
                        Peringkat Pilah Sampah Warga RT 005
                      </h2>
                      <p className="text-xs text-natural-muted">Juara pengumpul poin bulan ini. Menginspirasi warga lainnya!</p>
                    </div>
                    <div className="text-[10px] bg-natural-coral/10 text-natural-coral font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      Bulan: Juli 2026
                    </div>
                  </div>

                  {/* Leaderboard Podium Top 3 */}
                  {leaderboard.length >= 2 && (
                    <div className="grid grid-cols-3 gap-3 max-w-md mx-auto items-end pt-4 pb-8 border-b border-natural-border mb-6">
                      
                      {/* Rank 2 */}
                      {leaderboard[1] && (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-natural-muted">#2</span>
                          <div className="w-12 h-12 rounded-full bg-natural-sidebar border-2 border-natural-border flex items-center justify-center font-black text-natural-text text-sm shadow-sm">
                            {leaderboard[1].name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-bold text-natural-text text-center truncate w-20 block mt-2">{leaderboard[1].name}</span>
                          <span className="text-[10px] font-black text-natural-green">{leaderboard[1].points} Poin</span>
                          <div className="w-full bg-natural-sidebar h-16 rounded-t-xl mt-3 flex items-center justify-center text-natural-muted text-xs font-bold shadow-sm">
                            2
                          </div>
                        </div>
                      )}

                      {/* Rank 1 */}
                      {leaderboard[0] && (
                        <div className="flex flex-col items-center">
                          <Trophy className="w-5 h-5 text-natural-coral animate-bounce mb-1" />
                          <div className="w-14 h-14 rounded-full bg-natural-green/20 border-2 border-natural-green flex items-center justify-center font-black text-natural-text text-base shadow-sm relative">
                            {leaderboard[0].name.substring(0, 2).toUpperCase()}
                            <span className="absolute -top-1.5 -right-1 bg-natural-green text-white rounded-full text-[8px] font-bold px-1 py-0.5">Gold</span>
                          </div>
                          <span className="text-xs font-black text-natural-text text-center truncate w-20 block mt-2">{leaderboard[0].name}</span>
                          <span className="text-xs font-black text-natural-green">{leaderboard[0].points} Poin</span>
                          <div className="w-full bg-natural-green h-24 rounded-t-xl mt-3 flex items-center justify-center text-white text-base font-black shadow-sm">
                            1
                          </div>
                        </div>
                      )}

                      {/* Rank 3 */}
                      {leaderboard[2] && (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-natural-coral">#3</span>
                          <div className="w-12 h-12 rounded-full bg-natural-bg border-2 border-natural-border flex items-center justify-center font-black text-natural-coral text-sm shadow-sm">
                            {leaderboard[2].name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-bold text-natural-text text-center truncate w-20 block mt-2">{leaderboard[2].name}</span>
                          <span className="text-[10px] font-black text-natural-green">{leaderboard[2].points} Poin</span>
                          <div className="w-full bg-natural-hover h-12 rounded-t-xl mt-3 flex items-center justify-center text-natural-muted text-xs font-bold shadow-sm">
                            3
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Leaderboard Table List */}
                  <div className="space-y-2">
                    {leaderboard.map((item, index) => {
                      const isCurrentUser = item.id === user.id;
                      return (
                        <div 
                          key={item.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                            isCurrentUser 
                              ? 'bg-natural-green/10 border-natural-green shadow-sm' 
                              : 'bg-white border-natural-card-border hover:bg-natural-bg'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 text-xs font-black text-center ${
                              index === 0 ? 'text-natural-coral text-sm' :
                              index === 1 ? 'text-natural-muted' :
                              index === 2 ? 'text-natural-coral' : 'text-natural-muted'
                            }`}>
                              {index + 1}
                            </span>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-natural-text ${
                              isCurrentUser ? 'bg-natural-green/20' : 'bg-natural-sidebar'
                            }`}>
                              {item.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-natural-text block">
                                {item.name} {isCurrentUser && <span className="text-[10px] bg-natural-green text-white font-bold px-1.5 py-0.2 rounded-full uppercase ml-1">Saya</span>}
                              </span>
                              <span className="text-[10px] text-natural-muted font-semibold">{item.totalTrashWeight} kg sampah terpilah</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-natural-green block">{item.points} Poin</span>
                            <span className="text-[9px] text-natural-muted font-semibold block uppercase">Aktif</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: JADWAL */}
            {activeTab === 'jadwal' && (
              <motion.div
                key="jadwal-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Pickup schedule list */}
                <div className="bg-white rounded-[32px] p-5 shadow-sm border border-natural-card-border">
                  <div className="flex items-center gap-2 mb-4 border-b border-natural-border pb-3">
                    <Calendar className="w-5 h-5 text-natural-green" />
                    <div>
                      <h2 className="font-serif font-bold text-natural-text text-base">Jadwal Rutin Penjemputan Sampah RT 005</h2>
                      <p className="text-xs text-natural-muted">Letakkan sampah terpilah Anda di depan pagar rumah sesuai kategori harinya.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="schedules-list">
                    {schedules.map((sched) => (
                      <div key={sched.id} className="border border-natural-border rounded-2xl p-4 bg-natural-sidebar/40">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-extrabold text-natural-green bg-natural-green/10 px-3 py-1 rounded-full">
                            {sched.day}
                          </span>
                          <span className="text-[11px] font-bold text-natural-text flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-natural-muted" />
                            {sched.time}
                          </span>
                        </div>
                        <h3 className="font-serif font-bold text-natural-text text-xs uppercase tracking-wider mb-1">Kategori Pilahan:</h3>
                        <p className="text-xs font-black text-natural-green mb-2">{sched.category}</p>
                        <p className="text-[11px] text-natural-muted leading-relaxed border-t border-natural-border pt-2">{sched.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Educational Box */}
                <div className="bg-[#E9EBE0] rounded-[32px] p-5 shadow-sm border border-natural-border">
                  <h3 className="font-serif font-bold text-natural-text text-sm mb-3">Panduan Pilah Sampah yang Benar:</h3>
                  <div className="space-y-3 text-xs leading-relaxed text-natural-text">
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-natural-green text-white flex items-center justify-center font-bold shrink-0">1</div>
                      <p><span className="font-bold text-natural-text">Pastikan kering dan bersih:</span> Khususnya wadah botol plastik, mika, kaleng, dan kertas kardus harus bebas dari sisa cairan atau minyak sebelum dimasukkan ke kantong setoran.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-natural-green text-white flex items-center justify-center font-bold shrink-0">2</div>
                      <p><span className="font-bold text-natural-text">Pisahkan Organik basah:</span> Sisa makanan, sayur, kulit buah diletakkan di ember hijau tertutup agar langsung dibawa ke pusat pembuatan kompos RT 005.</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-natural-green text-white flex items-center justify-center font-bold shrink-0">3</div>
                      <p><span className="font-bold text-natural-text">Labeli barang pecah beling:</span> Botol sirup beling atau pecahan kaca diletakkan di kardus terpisah bertuliskan "KACA - AWAS PECAH" demi keselamatan petugas kebersihan kita.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: PENILAIAN */}
            {activeTab === 'penilaian' && (
              <motion.div
                key="penilaian-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-[32px] p-5 sm:p-6 shadow-sm border border-natural-card-border">
                  <div className="flex items-center gap-2 mb-4 border-b border-natural-border pb-3">
                    <MessageSquare className="w-5 h-5 text-natural-green" />
                    <div>
                      <h2 className="font-serif font-bold text-natural-text text-base sm:text-lg">Penilaian Layanan Kebersihan RT 005</h2>
                      <p className="text-xs text-natural-muted">Bantu pengurus RT mengevaluasi kinerja petugas kebersihan keliling di lingkungan Buaran IV.</p>
                    </div>
                  </div>

                  {feedbackSuccess && (
                    <div className="mb-4 p-3 bg-natural-green/10 border-l-4 border-natural-green rounded-xl text-xs text-natural-green flex items-start gap-1.5 font-bold">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{feedbackSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Select service type */}
                      <div>
                        <label className="block text-xs font-semibold text-natural-text uppercase tracking-wider mb-1.5">
                          Layanan yang Dinilai
                        </label>
                        <select
                          id="input-fb-type"
                          value={feedbackType}
                          onChange={(e) => setFeedbackType(e.target.value as any)}
                          className="block w-full px-3 py-2 text-sm border border-natural-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-natural-bg/50 text-natural-text"
                        >
                          <option value="pickup">Rutin Penjemputan Sampah Warga</option>
                          <option value="cleanliness">Kebersihan Saluran air / Selokan</option>
                          <option value="app">Kemudahan Aplikasi Pilah Sampah RT</option>
                        </select>
                      </div>

                      {/* Interactive Rating stars selection */}
                      <div>
                        <label className="block text-xs font-semibold text-natural-text uppercase tracking-wider mb-1.5">
                          Berikan Bintang Penilaian
                        </label>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="focus:outline-none cursor-pointer text-slate-300"
                            >
                              <Star 
                                className={`w-7 h-7 transition-all ${
                                  star <= (hoverRating || rating) 
                                    ? 'fill-natural-coral text-natural-coral scale-110' 
                                    : 'text-natural-border'
                                }`} 
                              />
                            </button>
                          ))}
                          <span className="text-xs font-black text-natural-text ml-2">
                            {rating === 5 && 'Luar Biasa / Sangat Bagus'}
                            {rating === 4 && 'Puas / Bagus'}
                            {rating === 3 && 'Cukup Memadai'}
                            {rating === 2 && 'Kurang Memuaskan'}
                            {rating === 1 && 'Sangat Buruk'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Feedback suggestion message */}
                    <div>
                      <label className="block text-xs font-semibold text-natural-text uppercase tracking-wider mb-1.5">
                        Tuliskan Masukan, Saran, atau Keluhan Anda
                      </label>
                      <textarea
                        id="input-fb-comment"
                        rows={3}
                        required
                        placeholder="Tuliskan saran Anda... Contoh: Petugas mohon datang sebelum jam 10 pagi karena sampah basah rawan dikerubuti kucing liar."
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        className="block w-full px-3 py-2 text-sm border border-natural-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-natural-bg/50 text-natural-text"
                      ></textarea>
                    </div>

                    <button
                      id="btn-submit-fb"
                      type="submit"
                      disabled={feedbackLoading}
                      className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 border border-transparent rounded-xl shadow text-xs font-bold text-white bg-natural-green hover:bg-[#6C8D74] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-natural-green transition-all cursor-pointer"
                    >
                      {feedbackLoading ? 'Mengirim Masukan...' : 'Kirim Umpan Balik Kepuasan'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Real-time Notification Drawer Overlay */}
      <AnimatePresence>
        {showNotifDrawer && (
          <div className="fixed inset-0 z-50 overflow-hidden" id="notification-drawer">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
              onClick={() => setShowNotifDrawer(false)}
            ></div>

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-natural-border"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-natural-border flex items-center justify-between bg-natural-sidebar">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-natural-green" />
                    <h3 className="font-serif font-bold text-natural-text text-sm">Notifikasi Real-time Warga</h3>
                  </div>
                  <button
                    onClick={() => setShowNotifDrawer(false)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-natural-hover text-natural-muted hover:text-natural-text transition-all cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3" id="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="py-20 text-center text-natural-muted text-xs">Belum ada notifikasi pesan untuk Anda.</div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-3 rounded-xl border transition-colors ${
                          !notif.isRead 
                            ? 'bg-natural-green/10 border-natural-green/30 shadow-sm' 
                            : 'bg-white border-natural-card-border'
                        }`}
                      >
                        <div className="flex gap-2.5 items-start">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.isRead ? 'bg-natural-green animate-ping' : 'bg-natural-muted'}`}></div>
                          <div>
                            <p className="text-xs font-semibold text-natural-text leading-relaxed">{notif.message}</p>
                            <span className="text-[9px] text-natural-muted block mt-1.5 font-bold">
                              {new Date(notif.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit', minute: '2-digit'
                              })} • {notif.type === 'points_earned' ? 'Poin Setoran' : notif.type === 'reward_status' ? 'Status Hadiah' : 'RT 005'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-natural-border bg-natural-sidebar text-center text-[10px] text-natural-muted font-bold">
                  Sistem Pemantau Real-time Online RT 005
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Responsive Bottom Navigation Rail for Mobile Devices */}
      <div id="mobile-nav" className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-natural-border flex justify-around items-center py-2 z-40 shadow-lg">
        <button
          onClick={() => setActiveTab('setor')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'setor' ? 'text-natural-green scale-105' : 'text-natural-muted'
          }`}
        >
          <Trash2 className="w-5 h-5" />
          <span>Setor</span>
        </button>

        <button
          onClick={() => setActiveTab('tukar')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'tukar' ? 'text-natural-green scale-105' : 'text-natural-muted'
          }`}
        >
          <Gift className="w-5 h-5" />
          <span>Tukar</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'riwayat' ? 'text-natural-green scale-105' : 'text-natural-muted'
          }`}
        >
          <History className="w-5 h-5" />
          <span>Riwayat</span>
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'leaderboard' ? 'text-natural-green scale-105' : 'text-natural-muted'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span>Juara</span>
        </button>

        <button
          onClick={() => setActiveTab('jadwal')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'jadwal' ? 'text-natural-green scale-105' : 'text-natural-muted'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Jadwal</span>
        </button>
      </div>

      {/* Celebration Success Modal Overlay */}
      <AnimatePresence>
        {showCelebration && celebrationDetails && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md" id="celebration-modal">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowCelebration(false)}
            ></motion.div>

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', damping: 20, stiffness: 300 } }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-natural-card-border relative overflow-hidden text-center z-10"
            >
              {/* Decorative background blurs */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -left-12 -top-12 w-24 h-24 bg-natural-green/10 rounded-full filter blur-xl"></div>
                <div className="absolute -right-12 -bottom-12 w-24 h-24 bg-natural-coral/10 rounded-full filter blur-xl"></div>
              </div>

              {/* Animated checkmark indicator */}
              <div className="relative inline-flex items-center justify-center w-16 h-16 bg-natural-green/10 rounded-full text-natural-green mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <CheckCircle className="w-10 h-10" />
                </motion.div>
                <motion.div 
                  className="absolute inset-0 border border-natural-green/30 rounded-full"
                  animate={{ scale: [1, 1.4, 1.6], opacity: [1, 0.4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                />
              </div>

              <h3 className="font-serif font-black text-2xl text-natural-text leading-tight mb-2">Setoran Berhasil!</h3>
              <p className="text-xs text-natural-muted mb-4 font-semibold">
                Terima kasih atas kepedulian Anda memilah sampah di rumah. Anda luar biasa!
              </p>

              {/* Submission Recap Card */}
              <div className="bg-natural-bg/60 border border-natural-border/40 rounded-2xl p-4 space-y-3.5 mb-5 relative text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-natural-muted font-semibold">Kategori</span>
                  <span className="font-bold text-natural-text capitalize">
                    {celebrationDetails.category === 'plastic' && 'Plastik'}
                    {celebrationDetails.category === 'paper' && 'Kertas'}
                    {celebrationDetails.category === 'organic' && 'Organik'}
                    {celebrationDetails.category === 'metal' && 'Logam'}
                    {celebrationDetails.category === 'glass' && 'Kaca'}
                    {celebrationDetails.category === 'other' && 'Lainnya'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-natural-muted font-semibold">Berat Sampah</span>
                  <span className="font-bold text-natural-text">{celebrationDetails.weight} kg</span>
                </div>
                <div className="border-t border-natural-border/30 my-2 pt-2 flex justify-between items-center">
                  <span className="text-natural-muted font-semibold text-xs">Estimasi Poin</span>
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                    className="flex items-center gap-1 bg-natural-green text-white px-2.5 py-0.5 rounded-full font-black text-xs shadow-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>+{celebrationDetails.points} Poin</span>
                  </motion.div>
                </div>
              </div>

              <button
                id="btn-close-celebration"
                onClick={() => setShowCelebration(false)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-natural-green hover:bg-[#6C8D74] shadow-md transition-all cursor-pointer"
              >
                Kembali ke Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
