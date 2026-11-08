import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  Cpu,
  ArrowLeft,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/useAuth';

interface AdminLoginViewProps {
  onNavigate: (view: string) => void;
  onLoginSuccess?: () => void;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({ onNavigate, onLoginSuccess }) => {
  const { login, logout, user } = useAuth();

  const [email, setEmail] = useState('demo@careerlens.ai');
  const [password, setPassword] = useState('CareerLens2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // Execute authentication
      await login(email.trim(), password);

      // We read the updated token or let auth context settle
      // Check user permissions directly from response or auth state
      // If the account is already known to be non-admin, deny access
      const token = localStorage.getItem('careerlens_token');
      if (!token) {
        throw new Error('Authentication token not received.');
      }

      // Check current user profile from backend to ensure admin verification
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to verify administrative authorization level.');
      }

      const userData = await res.json();
      const staffRoles = ['admin', 'superadmin', 'super_admin', 'ml_engineer', 'reviewer', 'support', 'analyst'];
      const isAdmin = Boolean(userData.is_admin) || staffRoles.includes(userData.role || '');

      if (!isAdmin) {
        // Not an administrator - clear credentials and deny
        logout();
        setErrorMessage(
          'Access Denied: Account does not possess staff or administrator privileges. Only authorized CareerLens AI operations personnel can access this portal.'
        );
        return;
      }

      // Successful admin login
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        onNavigate('admin');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      setErrorMessage(err.message || 'Invalid credentials or connection timeout.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillSuperAdmin = () => {
    setEmail('admin@careerlens.ai');
    setPassword('admin123456');
    setErrorMessage(null);
  };

  const handleFillDemoAdmin = () => {
    setEmail('demo@careerlens.ai');
    setPassword('CareerLens2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 relative overflow-hidden font-sans select-none">
      {/* Futuristic Background Accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Return to Candidate Portal</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
            SECURE RESTRICTED GATEWAY
          </span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl relative"
        >
          {/* Badge & Lock Icon */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/25">
              <Shield className="w-7 h-7" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                <Cpu className="w-3 h-3" />
                <span>Level-4 RBAC Staff Verification</span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Admin Command Center
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Authorized access for AI model training, vector RAG indexers, candidate records, and ATS engine calibration.
              </p>
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="mt-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{errorMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@careerlens.ai"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-xs transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">
                  Security Passkey
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 text-xs transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials & RBAC...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate & Enter Command Center</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Admin Credentials Autofill */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleFillSuperAdmin}
                className="py-2 px-3 rounded-xl border border-indigo-500/30 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Super Admin</span>
              </button>
              <button
                type="button"
                onClick={handleFillDemoAdmin}
                className="py-2 px-3 rounded-xl border border-blue-500/30 bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Demo Admin</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Super Admin: <code className="text-slate-400 font-mono">admin@careerlens.ai</code> | Demo: <code className="text-slate-400 font-mono">demo@careerlens.ai</code>
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full py-4 text-center border-t border-slate-800/60 text-[11px] text-slate-500">
        CareerLens AI Autonomous Intelligence Engine • End-to-End Encrypted Admin Session
      </footer>
    </div>
  );
};

