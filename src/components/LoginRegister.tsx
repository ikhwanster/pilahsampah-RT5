/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { api } from '../utils/api.ts';
import { User } from '../types.ts';
import { 
  User as UserIcon, 
  Lock, 
  MapPin, 
  Phone, 
  ShieldAlert, 
  Leaf, 
  Eye, 
  EyeOff, 
  UserCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface LoginRegisterProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginRegister({ onLoginSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register Fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan Password wajib diisi!');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { username, password });
      if (data.success && data.user) {
        localStorage.setItem('rt005_user_id', data.user.id);
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal masuk. Periksa kembali username dan sandi Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password || !address || !phone) {
      setError('Semua kolom pendaftaran wajib diisi!');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', {
        name,
        username,
        password,
        address,
        phone
      });
      if (data.success && data.user) {
        setSuccess('Pendaftaran berhasil! Mengalihkan ke dashboard...');
        setTimeout(() => {
          localStorage.setItem('rt005_user_id', data.user.id);
          onLoginSuccess(data.user);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar. Silakan coba username lain.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setIsLogin(true);
    setError('');
  };

  return (
    <div id="login-screen" className="min-h-screen bg-natural-bg text-natural-text flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-natural-sidebar text-natural-green mb-4 shadow-sm border border-natural-border"
        >
          <Leaf className="w-8 h-8" />
        </motion.div>
        <h2 className="text-3xl font-serif font-bold text-natural-text tracking-tight">
          Pilah Sampah RT 005
        </h2>
        <p className="mt-1 text-sm text-natural-green font-serif italic font-semibold">
          Taman Buaran Indah IV, RW 013
        </p>
        <p className="mt-2 text-xs text-natural-muted max-w-xs mx-auto font-medium">
          Mencatat berat setoran, mengumpulkan poin, mengklaim hadiah sembako menarik, dan menjaga kelestarian lingkungan kita.
        </p>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-6 shadow-sm rounded-[32px] border border-natural-card-border sm:px-10">
          
          {/* Tabs */}
          <div className="flex border-b border-natural-card-border mb-6" id="auth-tabs">
            <button
              id="tab-login"
              className={`w-1/2 pb-3 font-semibold text-sm border-b-2 text-center transition-all ${
                isLogin 
                  ? 'border-natural-green text-natural-green font-serif italic' 
                  : 'border-transparent text-natural-muted hover:text-natural-text'
              }`}
              onClick={() => { setIsLogin(true); setError(''); setSuccess(''); }}
            >
              Masuk Aplikasi
            </button>
            <button
              id="tab-register"
              className={`w-1/2 pb-3 font-semibold text-sm border-b-2 text-center transition-all ${
                !isLogin 
                  ? 'border-natural-green text-natural-green font-serif italic' 
                  : 'border-transparent text-natural-muted hover:text-natural-text'
              }`}
              onClick={() => { setIsLogin(false); setError(''); setSuccess(''); }}
            >
              Daftar Warga Baru
            </button>
          </div>

          {error && (
            <div id="auth-error" className="mb-4 p-3 bg-rose-50 border-l-4 border-natural-coral rounded-xl text-xs text-rose-900 flex items-start gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-natural-coral" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div id="auth-success" className="mb-4 p-3 bg-emerald-50 border-l-4 border-natural-green rounded-xl text-xs text-emerald-900 flex items-start gap-2 font-medium">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-natural-green" />
              <span>{success}</span>
            </div>
          )}

          {isLogin ? (
            <form id="login-form" onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-natural-text uppercase tracking-wider mb-1">
                  Username Warga
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-natural-muted">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    id="login-username"
                    type="text"
                    required
                    placeholder="Masukkan username (contoh: siti)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-natural-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-[#FDFCF8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-natural-text uppercase tracking-wider mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-natural-muted">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 text-sm border border-natural-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-[#FDFCF8]"
                  />
                  <button
                    id="toggle-password"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-natural-muted hover:text-natural-text focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-natural-green hover:bg-[#6c8c74] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-natural-green transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Menghubungkan...' : 'Masuk ke Dashboard'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          ) : (
            <form id="register-form" onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-natural-text uppercase tracking-wider mb-1">
                  Nama Lengkap Sesuai KTP
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-natural-muted">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    placeholder="Contoh: Siti Rahma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-natural-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-[#FDFCF8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-natural-text uppercase tracking-wider mb-1">
                    Username Baru
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    required
                    placeholder="Contoh: siticerdas"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-natural-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-[#FDFCF8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-natural-text uppercase tracking-wider mb-1">
                    Kata Sandi
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-natural-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-[#FDFCF8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-natural-text uppercase tracking-wider mb-1">
                  Nomor HP (WhatsApp)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-natural-muted">
                    <Phone className="w-4 h-4" />
                  </span>
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-natural-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-[#FDFCF8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-natural-text uppercase tracking-wider mb-1">
                  Alamat Rumah di RT 005
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-natural-muted">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    id="reg-address"
                    type="text"
                    required
                    placeholder="Contoh: Blok C No. 12"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-natural-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-natural-green focus:border-natural-green bg-[#FDFCF8]"
                  />
                </div>
              </div>

              {/* Data Encryption Assurance Label */}
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[10px] text-blue-900 flex gap-1.5 items-start">
                <UserCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-700" />
                <div>
                  <span className="font-semibold">🔒 Privasi Terjamin:</span> Alamat dan No. HP dienkripsi kuat menggunakan algoritme <span className="font-semibold">AES-256-CBC</span> secara server-side sebelum disimpan di database demi keamanan privasi Anda.
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-submit-register"
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-natural-green hover:bg-[#6c8c74] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-natural-green transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Mendaftarkan Akun...' : 'Daftar Sebagai Warga'}
                  {!loading && <Sparkles className="w-4 h-4" />}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Demo Fast Access Section */}
        <div id="demo-accounts-panel" className="mt-6 bg-white border border-natural-card-border rounded-[32px] p-5 shadow-sm">
          <p className="text-xs font-bold text-natural-text mb-3 flex items-center gap-1.5 font-serif italic">
            <Sparkles className="w-4 h-4 text-natural-coral animate-pulse" />
            Akses Cepat Uji Coba (RT 005)
          </p>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-natural-muted font-bold block mb-1 uppercase tracking-wider">Akses Pengurus RT (Admin)</span>
              <button
                id="demo-admin"
                onClick={() => fillDemoAccount('admin', 'admin123')}
                className="w-full text-left px-3 py-1.5 border border-natural-border hover:bg-[#F4F1E9] rounded-xl text-xs flex justify-between items-center text-natural-text font-medium transition-colors cursor-pointer"
              >
                <span>Pak Bambang (Ketua RT 005)</span>
                <span className="text-[10px] bg-natural-sidebar text-natural-text border border-natural-border px-2 py-0.5 rounded-full font-bold uppercase">Admin</span>
              </button>
            </div>
            <div>
              <span className="text-[10px] text-natural-muted font-bold block mb-1 uppercase tracking-wider">Akses Warga RT 005 (Pilih Salah Satu)</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="demo-citizen-siti"
                  onClick={() => fillDemoAccount('siti', 'siti123')}
                  className="text-left p-2 border border-natural-card-border hover:bg-natural-bg rounded-xl text-xs flex flex-col transition-colors cursor-pointer"
                >
                  <span className="font-bold text-natural-text">Siti Rahma</span>
                  <span className="text-[9px] text-natural-muted">Poin: 240 | Blok C/12</span>
                </button>
                <button
                  id="demo-citizen-budi"
                  onClick={() => fillDemoAccount('budi', 'budi123')}
                  className="text-left p-2 border border-natural-card-border hover:bg-natural-bg rounded-xl text-xs flex flex-col transition-colors cursor-pointer"
                >
                  <span className="font-bold text-natural-text">Budi Santoso</span>
                  <span className="text-[9px] text-natural-muted">Poin: 180 | Blok D/5</span>
                </button>
                <button
                  id="demo-citizen-dewi"
                  onClick={() => fillDemoAccount('dewi', 'dewi123')}
                  className="text-left p-2 border border-natural-card-border hover:bg-natural-bg rounded-xl text-xs flex flex-col transition-colors cursor-pointer"
                >
                  <span className="font-bold text-natural-text">Dewi Lestari</span>
                  <span className="text-[9px] text-natural-muted">Poin: 310 | Blok A/8</span>
                </button>
                <button
                  id="demo-citizen-agus"
                  onClick={() => fillDemoAccount('agus', 'agus123')}
                  className="text-left p-2 border border-natural-card-border hover:bg-natural-bg rounded-xl text-xs flex flex-col transition-colors cursor-pointer"
                >
                  <span className="font-bold text-natural-text">Agus Salim</span>
                  <span className="text-[9px] text-natural-muted">Poin: 95 | Blok B/3</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
