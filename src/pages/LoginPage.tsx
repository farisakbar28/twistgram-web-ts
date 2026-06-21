/**
 * LoginPage — Halaman Login
 * Ref: SRS §3.2, Business Rules AUTH-04
 *
 * Fitur [MVP]:
 * - Input: email ATAU username + password
 * - Pesan error generik (tidak bocorkan apakah akun ada atau tidak) — AUTH-02
 * - Rate limit display: setelah 5x gagal → countdown 15 menit — AUTH-04
 * - Show/hide password toggle
 * - Redirect ke halaman asal setelah login berhasil
 * - Link ke: /register, /forgot-password
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { getLoginLockState } from '../services';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useToast } from '../components/common/Toast';

// ============================================================
// Component
// ============================================================

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const toast = useToast();

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/';

  // Form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockCountdown, setLockCountdown] = useState(0); // detik tersisa

  // Redirect jika sudah login
  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  // Countdown AUTH-04
  useEffect(() => {
    if (lockCountdown <= 0) return;
    const timer = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockCountdown]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;

    // Cek lock state sebelum request
    const lockState = getLoginLockState(identifier.trim());
    if (lockState.locked) {
      const secs = Math.ceil(lockState.remainingMs / 1000);
      setLockCountdown(secs);
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(secs / 60)} menit.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login({ identifier: identifier.trim(), password });
      toast.success('Selamat datang kembali! 👋');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.';
      setError(msg);

      // Cek apakah sekarang terkunci setelah gagal
      const newLock = getLoginLockState(identifier.trim());
      if (newLock.locked) {
        setLockCountdown(Math.ceil(newLock.remainingMs / 1000));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isLocked = lockCountdown > 0;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 bg-glow-brand opacity-50 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-8 animate-fade-in">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-brand-gradient">
            Twistgram
          </h1>
          <p className="text-sm text-neutral-400">
            Masuk untuk menjelajahi momen terbaik
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-900/80 backdrop-blur-md border border-surface-800 rounded-2xl p-8 shadow-modal flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-neutral-100">Masuk</h2>
            <p className="text-sm text-neutral-500">
              Gunakan email atau username Anda
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span>{error}</span>
                {isLocked && (
                  <span className="font-mono font-bold text-danger-300">
                    {formatCountdown(lockCountdown)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="login-identifier"
              label="Email atau Username"
              type="text"
              placeholder="contoh@email.com atau username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError('');
              }}
              leftIcon={<User className="h-4 w-4" />}
              disabled={isLocked || isLoading}
              autoComplete="username"
              autoFocus
              required
            />

            <Input
              id="login-password"
              label="Kata Sandi"
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              leftIcon={<Lock className="h-4 w-4" />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-neutral-400 hover:text-neutral-200 p-1 transition-colors"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              disabled={isLocked || isLoading}
              autoComplete="current-password"
              required
            />

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
              >
                Lupa kata sandi?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={isLocked || !identifier.trim() || !password.trim()}
              className="mt-1"
            >
              {isLocked ? `Tunggu ${formatCountdown(lockCountdown)}` : 'Masuk'}
            </Button>
          </form>

          {/* Register link */}
          <div className="border-t border-surface-800 pt-4 text-center text-sm text-neutral-400">
            Belum punya akun?{' '}
            <Link
              to="/register"
              className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
            >
              Daftar sekarang
            </Link>
          </div>
        </div>

        {/* Recover account link */}
        <div className="text-center">
          <Link
            to="/recover-account"
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Lupa username atau email?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
