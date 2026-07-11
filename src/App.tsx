import React, { useState, useEffect } from 'react';
import { User } from './types.ts';
import { api } from './utils/api.ts';
import LoginRegister from './components/LoginRegister.tsx';
import CitizenDashboard from './components/CitizenDashboard.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import { Leaf, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Attempt to restore user session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const storedId = localStorage.getItem('rt005_user_id');
      if (storedId) {
        try {
          const res = await api.get('/api/auth/me');
          if (res.user) {
            setUser(res.user);
          } else {
            localStorage.removeItem('rt005_user_id');
          }
        } catch (err) {
          console.error('Session restoration failed:', err);
          localStorage.removeItem('rt005_user_id');
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('rt005_user_id');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-natural-bg text-natural-text flex flex-col items-center justify-center font-sans gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="text-natural-green"
        >
          <Leaf className="w-10 h-10" />
        </motion.div>
        <div className="text-center">
          <p className="text-natural-text font-bold text-sm tracking-wide">Pilah Sampah RT 005</p>
          <p className="text-natural-muted text-xs mt-0.5 font-medium">Menghubungkan layanan enkripsi data warga...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginRegister onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  return (
    <div className="bg-natural-bg text-natural-text min-h-screen font-sans">
      {user.role === 'admin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <CitizenDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

