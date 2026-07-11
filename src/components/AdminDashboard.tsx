/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, TrashDeposit, RewardClaim, CleanupFeedback } from '../types.ts';
import { api } from '../utils/api.ts';
import { 
  LogOut, 
  Trash2, 
  Gift, 
  Users, 
  MessageSquare, 
  Check, 
  X, 
  ShieldAlert, 
  Sparkles, 
  ChevronRight, 
  Scale, 
  TrendingUp, 
  Lock, 
  Phone, 
  MapPin, 
  Star,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'verifikasi' | 'distribusi' | 'warga' | 'umpan-balik'>('verifikasi');
  const [summary, setSummary] = useState<any>(null);
  const [deposits, setDeposits] = useState<TrashDeposit[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [citizens, setCitizens] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<CleanupFeedback[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [approveNotes, setApproveNotes] = useState<Record<string, string>>({});

  const fetchAdminData = async () => {
    try {
      const [summaryRes, depositsRes, claimsRes, leaderboardRes, feedbacksRes] = await Promise.all([
        api.get('/api/admin/summary'),
        api.get('/api/deposits'),
        api.get('/api/claims'),
        api.get('/api/leaderboard'),
        api.get('/api/feedback')
      ]);

      setSummary(summaryRes);
      setDeposits(depositsRes);
      setClaims(claimsRes);
      setCitizens(leaderboardRes);
      setFeedbacks(feedbacksRes);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAdminData().finally(() => setLoading(false));

    // Setup 5-seconds real-time updates sync
    const interval = setInterval(() => {
      fetchAdminData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleVerifyDeposit = async (id: string, status: 'approved' | 'rejected') => {
    const notes = status === 'approved' ? approveNotes[id] || '' : rejectReason[id] || '';
    
    if (status === 'rejected' && !notes) {
      alert('Alasan penolakan wajib ditulis agar warga mengetahui kendalanya!');
      return;
    }

    setActionLoading(id);
    try {
      await api.put(`/api/deposits/${id}/status`, { status, notes });
      alert(`Setoran berhasil di-${status === 'approved' ? 'setujui' : 'tolak'}!`);
      // Clean up inputs
      setRejectReason({ ...rejectReason, [id]: '' });
      setApproveNotes({ ...approveNotes, [id]: '' });
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Gagal merubah status setoran.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliverReward = async (id: string) => {
    if (!window.confirm('Apakah Anda sudah menyerahkan barang hadiah ini secara langsung ke warga yang bersangkutan?')) {
      return;
    }

    setActionLoading(id);
    try {
      await api.put(`/api/claims/${id}/status`, { status: 'completed' });
      alert('Penyerahan hadiah berhasil diselesaikan!');
      fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbaharui status klaim.');
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'plastic': return 'bg-emerald-500';
      case 'paper': return 'bg-slate-500';
      case 'metal': return 'bg-amber-500';
      case 'glass': return 'bg-blue-500';
      case 'organic': return 'bg-lime-500';
      default: return 'bg-indigo-500';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'plastic': return 'Plastik';
      case 'paper': return 'Kertas';
      case 'metal': return 'Logam';
      case 'glass': return 'Kaca / Beling';
      case 'organic': return 'Organik';
      default: return 'Lainnya';
    }
  };

  return (
    <div id="admin-hub" className="min-h-screen bg-natural-bg flex flex-col font-sans pb-16 md:pb-6 text-natural-text">
      
      {/* Top Admin Banner Navigation */}
      <header className="bg-white border-b border-natural-border shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-natural-green text-white shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-black text-natural-text block text-sm sm:text-base leading-tight">MoniRT 005 - Admin Dashboard</span>
              <span className="text-[10px] text-natural-coral font-bold block tracking-wider uppercase">Taman Buaran Indah IV, RW 013</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-natural-text font-bold bg-natural-sidebar px-3 py-1.5 rounded-full">
              Sesi: Ketua RT 005 (Pak Bambang)
            </span>
            {/* Logout */}
            <button
              id="btn-admin-logout"
              onClick={onLogout}
              className="p-2.5 rounded-xl border border-natural-coral/20 bg-natural-coral/10 hover:bg-natural-coral hover:text-white text-natural-coral transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Statistics Highlights Grid */}
      <section className="max-w-6xl mx-auto px-4 py-6 w-full">
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="admin-summary-cards">
            
            {/* Total Weight */}
            <div className="bg-white rounded-[32px] p-4 shadow-sm border border-natural-card-border">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-natural-green" />
                <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Total Sampah RT</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span id="sum-total-weight" className="text-2xl sm:text-3xl font-serif font-extrabold text-natural-text">{summary.totalWeight}</span>
                <span className="text-xs font-semibold text-natural-muted">kg</span>
              </div>
              <span className="text-[9px] text-natural-green font-bold block mt-1">Berhasil dipilah dari lingkungan</span>
            </div>

            {/* Total Points distributed */}
            <div className="bg-white rounded-[32px] p-4 shadow-sm border border-natural-card-border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-natural-green" />
                <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Poin Didistribusikan</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span id="sum-total-points" className="text-2xl sm:text-3xl font-serif font-extrabold text-natural-text">{summary.totalPointsDistributed}</span>
                <span className="text-xs font-semibold text-natural-muted">Poin</span>
              </div>
              <span className="text-[9px] text-natural-muted font-bold block mt-1">Aktivitas penimbangan aktif</span>
            </div>

            {/* Total Citizens */}
            <div className="bg-white rounded-[32px] p-4 shadow-sm border border-natural-card-border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-natural-coral" />
                <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Warga Terdaftar</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span id="sum-total-citizens" className="text-2xl sm:text-3xl font-serif font-extrabold text-natural-text">{summary.totalCitizens}</span>
                <span className="text-xs font-semibold text-natural-muted">KK / Rumah</span>
              </div>
              <span className="text-[9px] text-natural-coral font-bold block mt-1">Partisipasi aktif RT 005</span>
            </div>

            {/* Pending actions count */}
            <div className="bg-white rounded-[32px] p-4 shadow-sm border border-natural-card-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-natural-coral" />
                <span className="text-[10px] text-natural-muted uppercase font-bold tracking-wider block">Antrean Verifikasi</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span id="sum-total-pending" className="text-2xl sm:text-3xl font-serif font-extrabold text-natural-text">{summary.pendingDepositsCount}</span>
                <span className="text-xs font-semibold text-natural-muted">Setoran</span>
              </div>
              {summary.pendingClaimsCount > 0 && (
                <span className="text-[9px] text-natural-coral font-bold block mt-1">Serta {summary.pendingClaimsCount} klaim sembako siap serah</span>
              )}
            </div>

          </div>
        )}

        {/* Category Weights Breakdown Progress Bars */}
        {summary && summary.categoryWeights && (
          <div className="mt-5 bg-white rounded-[32px] p-5 shadow-sm border border-natural-card-border">
            <h3 className="font-serif font-bold text-natural-text text-xs uppercase tracking-wider mb-3">Analisis Kategori Sampah yang Terkumpul (kg)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              {Object.entries(summary.categoryWeights).map(([cat, val]: any) => {
                const total = summary.totalWeight || 1;
                const percentage = Math.min(100, Math.round((val / total) * 100));
                
                // Keep progress bar colors aligned nicely with theme
                let barColorClass = "bg-natural-green";
                if (cat === "plastic" || cat === "organic") {
                  barColorClass = "bg-[#7D9D85]";
                } else if (cat === "metal") {
                  barColorClass = "bg-[#D97757]";
                } else {
                  barColorClass = "bg-[#828771]";
                }

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-natural-text">
                      <span>{getCategoryLabel(cat)}</span>
                      <span>{val} kg</span>
                    </div>
                    <div className="w-full bg-natural-bg h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${barColorClass}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className="text-[10px] text-natural-muted font-bold block">{percentage}% dari total sampah</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 w-full grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <nav className="bg-white rounded-[32px] p-2.5 shadow-sm border border-natural-card-border space-y-1">
            <button
              onClick={() => setActiveTab('verifikasi')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                activeTab === 'verifikasi'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-muted hover:bg-natural-sidebar'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>Verifikasi Setoran Warga</span>
              </div>
              {summary && summary.pendingDepositsCount > 0 && (
                <span className="bg-natural-coral text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
                  {summary.pendingDepositsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('distribusi')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                activeTab === 'distribusi'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-muted hover:bg-natural-sidebar'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gift className="w-4 h-4 shrink-0" />
                <span>Distribusi & Klaim Hadiah</span>
              </div>
              {summary && summary.pendingClaimsCount > 0 && (
                <span className="bg-natural-coral text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {summary.pendingClaimsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('warga')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                activeTab === 'warga'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-muted hover:bg-natural-sidebar'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 shrink-0" />
                <span>Data Warga & Poin RT</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActiveTab('umpan-balik')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-2xl transition-all cursor-pointer ${
                activeTab === 'umpan-balik'
                  ? 'bg-natural-green text-white shadow-sm'
                  : 'text-natural-muted hover:bg-natural-sidebar'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Laporan Kepuasan Kebersihan</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          
          <AnimatePresence mode="wait">
            
            {/* TAB 1: VERIFIKASI SETORAN */}
            {activeTab === 'verifikasi' && (
              <motion.div
                key="verifikasi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[32px] p-5 sm:p-6 shadow-sm border border-natural-card-border"
              >
                <div className="flex justify-between items-center mb-4 border-b border-natural-border pb-3">
                  <div>
                    <h2 className="font-serif font-bold text-natural-text text-base sm:text-lg">Antrean Verifikasi Timbangan Sampah</h2>
                    <p className="text-xs text-natural-muted">Setujui setoran sampah warga untuk menambahkan poin mereka secara otomatis.</p>
                  </div>
                </div>

                <div className="space-y-4" id="verification-list">
                  {deposits.filter(d => d.status === 'pending').length === 0 ? (
                    <div className="py-16 text-center text-natural-muted text-xs flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-10 h-10 text-natural-green" />
                      <span>Semua setoran telah bersih diverifikasi! Tidak ada antrean pending.</span>
                    </div>
                  ) : (
                    deposits.filter(d => d.status === 'pending').map((dep) => (
                      <div key={dep.id} className="border border-natural-border bg-natural-sidebar/30 rounded-2xl p-4 space-y-3 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-dashed border-natural-border pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-natural-sidebar text-natural-text font-serif font-extrabold text-[10px] flex items-center justify-center">
                              {dep.userName.substring(0,2).toUpperCase()}
                            </span>
                            <div>
                              <span className="font-bold text-natural-text text-xs block">{dep.userName}</span>
                              <span className="text-[9px] text-natural-muted font-bold">{dep.date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-natural-sidebar text-natural-text px-2.5 py-0.5 rounded-full font-bold uppercase">
                              {getCategoryLabel(dep.category)}
                            </span>
                            <span className="text-xs font-bold text-natural-text">
                              Berat: <span className="text-natural-green font-black">{dep.weight} kg</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-natural-text leading-relaxed bg-white/70 p-2.5 rounded-lg border border-natural-border">
                          <span className="font-bold block text-[10px] text-natural-muted uppercase mb-0.5">Keterangan warga:</span>
                          {dep.notes || 'Tidak ada catatan tambahan.'}
                        </div>

                        {/* Validation Inputs and buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-natural-border">
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-natural-green" />
                            <span className="text-xs font-bold text-natural-text">Poin Hadiah yang Diperoleh:</span>
                            <span className="text-xs font-black text-natural-green bg-natural-green/10 px-2.5 py-0.5 rounded-full ml-1">
                              +{dep.pointsEarned} Poin
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0">
                            <input
                              type="text"
                              placeholder="Keterangan setujui/tolak..."
                              value={dep.status === 'pending' ? (approveNotes[dep.id] || rejectReason[dep.id] || '') : ''}
                              onChange={(e) => {
                                setApproveNotes({ ...approveNotes, [dep.id]: e.target.value });
                                setRejectReason({ ...rejectReason, [dep.id]: e.target.value });
                              }}
                              className="w-full sm:w-44 px-3 py-1.5 text-xs border border-natural-border rounded-xl focus:ring-1 focus:ring-natural-green focus:outline-none bg-white"
                            />

                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleVerifyDeposit(dep.id, 'approved')}
                                disabled={actionLoading === dep.id}
                                className="flex-1 sm:flex-none bg-natural-green hover:bg-natural-green/90 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Setujui
                              </button>

                              <button
                                onClick={() => handleVerifyDeposit(dep.id, 'rejected')}
                                disabled={actionLoading === dep.id}
                                className="flex-1 sm:flex-none bg-natural-coral/10 border border-natural-coral/20 hover:bg-natural-coral hover:text-white text-natural-coral font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                                Tolak
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Approved Deposit logs */}
                <div className="mt-8 border-t border-natural-border pt-6">
                  <h3 className="font-serif font-bold text-natural-text text-sm mb-3">Laporan Historis Setoran Warga (Terverifikasi)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs" id="admin-deposits-table">
                      <thead>
                        <tr className="border-b border-natural-border text-natural-muted font-bold uppercase tracking-wider">
                          <th className="py-2.5">Warga</th>
                          <th className="py-2.5">Tanggal</th>
                          <th className="py-2.5">Kategori</th>
                          <th className="py-2.5">Berat (kg)</th>
                          <th className="py-2.5">Poin RT</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-border/50">
                        {deposits.filter(d => d.status !== 'pending').slice(0, 15).map((dep) => (
                          <tr key={dep.id} className="hover:bg-natural-sidebar/30 transition-colors">
                            <td className="py-2.5 font-bold text-natural-text">{dep.userName}</td>
                            <td className="py-2.5 text-natural-muted font-medium">{dep.date}</td>
                            <td className="py-2.5 capitalize text-natural-text">{getCategoryLabel(dep.category)}</td>
                            <td className="py-2.5 font-bold text-natural-text">{dep.weight} kg</td>
                            <td className="py-2.5 font-extrabold text-natural-green">+{dep.pointsEarned}</td>
                            <td className="py-2.5">
                              {dep.status === 'approved' ? (
                                <span className="bg-natural-green/15 text-natural-green font-bold px-2 py-0.5 rounded-full text-[10px]">
                                  Disetujui
                                </span>
                              ) : (
                                <span className="bg-natural-coral/15 text-natural-coral font-bold px-2 py-0.5 rounded-full text-[10px]">
                                  Ditolak
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: DISTRIBUSI & KLAIM HADIAH */}
            {activeTab === 'distribusi' && (
              <motion.div
                key="distribusi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[32px] p-5 sm:p-6 shadow-sm border border-natural-card-border"
              >
                <div className="flex justify-between items-center mb-4 border-b border-natural-border pb-3">
                  <div>
                    <h2 className="font-serif font-bold text-natural-text text-base sm:text-lg">Distribusi & Klaim Paket Sembako Warga</h2>
                    <p className="text-xs text-natural-muted">Serahkan hadiah fisik ke warga secara langsung lalu tandai transaksi selesai.</p>
                  </div>
                </div>

                <div className="space-y-4" id="claims-list">
                  {claims.filter(c => c.status === 'pending').length === 0 ? (
                    <div className="py-16 text-center text-natural-muted text-xs flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-10 h-10 text-natural-green" />
                      <span>Semua paket hadiah warga telah diserahterimakan! Tidak ada klaim pending.</span>
                    </div>
                  ) : (
                    claims.filter(c => c.status === 'pending').map((claim) => (
                      <div key={claim.id} className="border border-natural-border bg-natural-sidebar/30 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                        <div className="flex gap-2.5 items-start">
                          <div className="p-2 bg-natural-green/10 text-natural-green rounded-xl shrink-0 mt-1">
                            <Gift className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-serif font-extrabold text-natural-text text-xs sm:text-sm block">{claim.rewardTitle}</span>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-natural-text font-medium">
                              <span>Penerima: <span className="font-bold text-natural-green">{claim.userName}</span></span>
                              <span>•</span>
                              <span>Poin Terpotong: <span className="font-black text-natural-coral">-{claim.pointsCost} Poin</span></span>
                            </div>
                            <span className="text-[10px] text-natural-muted block mt-1.5 font-bold">
                              Diajukan pada: {new Date(claim.claimedAt).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeliverReward(claim.id)}
                          disabled={actionLoading === claim.id}
                          className="w-full sm:w-auto px-4 py-2 bg-natural-green hover:bg-natural-green/90 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-all shrink-0 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Serahkan Hadiah
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Completed claims */}
                <div className="mt-8 border-t border-natural-border pt-6">
                  <h3 className="font-serif font-bold text-natural-text text-sm mb-3">Arsip Penyerahan Sembako Sukses (Completed)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs" id="admin-claims-table">
                      <thead>
                        <tr className="border-b border-natural-border text-natural-muted font-bold uppercase tracking-wider">
                          <th className="py-2.5">Warga</th>
                          <th className="py-2.5">Paket Hadiah</th>
                          <th className="py-2.5">Tukar Poin</th>
                          <th className="py-2.5">Tanggal Distribusi</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-natural-border/50">
                        {claims.filter(c => c.status === 'completed').slice(0, 15).map((claim) => (
                          <tr key={claim.id} className="hover:bg-natural-sidebar/30 transition-colors">
                            <td className="py-2.5 font-bold text-natural-text">{claim.userName}</td>
                            <td className="py-2.5 text-natural-text font-semibold">{claim.rewardTitle}</td>
                            <td className="py-2.5 text-natural-coral font-bold">-{claim.pointsCost} Poin</td>
                            <td className="py-2.5 text-natural-muted font-medium">
                              {new Date(claim.claimedAt).toLocaleDateString('id-ID')}
                            </td>
                            <td className="py-2.5">
                              <span className="bg-natural-green/15 text-natural-green font-bold px-2 py-0.5 rounded-full text-[10px]">
                                Diserahkan
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 3: DATA WARGA & POIN RT */}
            {activeTab === 'warga' && (
              <motion.div
                key="warga"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[32px] p-5 sm:p-6 shadow-sm border border-natural-card-border"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-natural-border pb-3">
                  <div>
                    <h2 className="font-serif font-bold text-natural-text text-base sm:text-lg">Database & Kepatuhan Warga RT 005</h2>
                    <p className="text-xs text-natural-muted">Daftar warga beserta saldo poin, berat sampah, dan informasi terenkripsi.</p>
                  </div>
                  
                  {/* Secure PII alert box */}
                  <div className="flex items-center gap-1.5 bg-natural-green/10 border border-natural-green/20 rounded-xl px-3 py-1.5 text-[10px] text-natural-green font-bold shadow-sm">
                    <Lock className="w-3.5 h-3.5" />
                    <span>PII terenkripsi AES-256 secara server-side</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs" id="citizens-data-table">
                    <thead>
                      <tr className="border-b border-natural-border text-natural-muted font-bold uppercase tracking-wider">
                        <th className="py-2.5">Nama Sesuai KTP</th>
                        <th className="py-2.5">Username</th>
                        <th className="py-2.5">No. HP (Kontak)</th>
                        <th className="py-2.5">Alamat Blok Rumah</th>
                        <th className="py-2.5">Total Sampah (kg)</th>
                        <th className="py-2.5">Saldo Poin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-natural-border/50">
                      {citizens.map((citizen) => (
                        <tr key={citizen.id} className="hover:bg-natural-sidebar/30 transition-colors">
                          <td className="py-3 font-bold text-natural-text flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-natural-sidebar text-natural-text font-serif font-extrabold text-[9px] flex items-center justify-center">
                              {citizen.name.substring(0,2).toUpperCase()}
                            </span>
                            {citizen.name}
                          </td>
                          <td className="py-3 font-bold text-natural-muted">@{citizen.username || 'warga'}</td>
                          <td className="py-3 text-natural-text">
                            <span className="inline-flex items-center gap-1">
                              <Phone className="w-3 h-3 text-natural-muted" />
                              {citizen.phone || '08123xxx'}
                            </span>
                          </td>
                          <td className="py-3 text-natural-text">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-natural-muted" />
                              {citizen.address || 'Blok C/12'}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-natural-text">{citizen.totalTrashWeight} kg</td>
                          <td className="py-3 font-black text-natural-green">{citizen.points} Poin</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB 4: LAPORAN KEPUASAN KEBERSIHAN */}
            {activeTab === 'umpan-balik' && (
              <motion.div
                key="umpan-balik"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-[32px] p-5 sm:p-6 shadow-sm border border-natural-card-border"
              >
                <div className="flex justify-between items-center mb-6 border-b border-natural-border pb-3">
                  <div>
                    <h2 className="font-serif font-bold text-natural-text text-base sm:text-lg">Aspirasi & Laporan Kepuasan Warga</h2>
                    <p className="text-xs text-natural-muted">Keluhan, apresiasi, dan saran kebersihan di lingkungan Buaran IV.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="feedbacks-grid">
                  {feedbacks.length === 0 ? (
                    <div className="py-16 text-center text-natural-muted text-xs col-span-2">
                      Belum ada laporan umpan balik dari warga.
                    </div>
                  ) : (
                    feedbacks.map((fb) => (
                      <div key={fb.id} className="border border-natural-border rounded-2xl p-4 bg-natural-sidebar/10 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div>
                              <span className="text-xs font-bold text-natural-text block">{fb.userName}</span>
                              <span className="text-[10px] text-natural-green bg-natural-green/10 font-bold px-2 py-0.5 rounded-xl uppercase block w-max mt-1">
                                {fb.serviceType === 'pickup' && 'Rutin Penjemputan'}
                                {fb.serviceType === 'cleanliness' && 'Saluran air / Selokan'}
                                {fb.serviceType === 'app' && 'Aplikasi RT'}
                              </span>
                            </div>
                            
                            {/* Stars rendering */}
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-3.5 h-3.5 ${
                                    star <= fb.rating ? 'fill-natural-coral text-natural-coral' : 'text-natural-border'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>

                          <p className="text-xs text-natural-text italic leading-relaxed mt-3 bg-white p-2.5 rounded-lg border border-natural-border">
                            "{fb.comment}"
                          </p>
                        </div>

                        <span className="text-[9px] text-natural-muted font-bold block mt-3 self-end">
                          Dikirim pada: {new Date(fb.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}
