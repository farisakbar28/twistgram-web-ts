/**
 * ResetPasswordPage — Halaman Atur Ulang Kata Sandi
 * Ref: SRS §3.3 (Reset password), §3.6 (Business Rules AUTH-01 & AUTH-05)
 *
 * Flow:
 * 1. Menerima resetToken dan identifier dari location state (di-set oleh OtpVerifyPage).
 * 2. Mengambil input password baru + konfirmasi password baru.
 * 3. Validasi business rule AUTH-01 (min 8 karakter, huruf besar di awal).
 * 4. Panggil API `authResetPassword`.
 * 5. Sukses → redirect ke `/login` (AUTH-05 otomatis dipicu di mock service untuk clear session).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check, X, AlertCircle } from 'lucide-react';
import { authResetPassword } from '../services';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useToast } from '../components/common/Toast';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // State dari navigation
  const state = location.state as {
    resetToken: string;
    identifier: string;
  } | null;

  const resetToken = state?.resetToken ?? '';
  const identifier = state?.identifier ?? '';

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Validasi jika diakses tanpa token
  useEffect(() => {
    if (!resetToken) {
      toast.error('Akses tidak sah. Silakan lakukan proses lupa kata sandi kembali.');
      navigate('/forgot-password', { replace: true });
    }
  }, [resetToken, navigate, toast]);

  // Validasi rule AUTH-01
  const isMinLength = password.length >= 8;
  const isCapitalStart = /^[A-Z]/.test(password);
  const isMatching = password === confirmPassword && confirmPassword.length > 0;
  const isValid = isMinLength && isCapitalStart && isMatching;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      await authResetPassword({ resetToken, newPassword: password });
      toast.success('Kata sandi berhasil diatur ulang! Silakan masuk kembali. 🔐');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengatur ulang kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 bg-glow-brand opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6 animate-fade-in">
        {/* Card */}
        <div className="bg-surface-900/80 backdrop-blur-md border border-surface-800 rounded-2xl p-8 shadow-modal flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20">
              <Lock className="h-7 w-7 text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-100">Atur Ulang Kata Sandi</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Buat kata sandi baru untuk akun <span className="text-brand-400 font-medium">{identifier}</span>
              </p>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Input
              id="new-password"
              label="Kata Sandi Baru"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimal 8 karakter (Huruf besar di awal)"
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
              disabled={isLoading}
              required
            />

            <Input
              id="confirm-password"
              label="Konfirmasi Kata Sandi Baru"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              leftIcon={<Lock className="h-4 w-4" />}
              rightAction={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="text-neutral-400 hover:text-neutral-200 p-1 transition-colors"
                  aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              disabled={isLoading}
              required
            />

            {/* Checklist Validasi */}
            <div className="bg-surface-950/50 rounded-xl p-4 border border-surface-800 flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Ketentuan Kata Sandi (AUTH-01):
              </span>
              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2">
                  {isMinLength ? (
                    <Check className="h-3.5 w-3.5 text-success-500" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-neutral-500" />
                  )}
                  <span className={isMinLength ? 'text-success-400' : 'text-neutral-400'}>
                    Minimal 8 karakter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isCapitalStart ? (
                    <Check className="h-3.5 w-3.5 text-success-500" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-neutral-500" />
                  )}
                  <span className={isCapitalStart ? 'text-success-400' : 'text-neutral-400'}>
                    Diawali dengan huruf besar (A-Z)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isMatching ? (
                    <Check className="h-3.5 w-3.5 text-success-500" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-neutral-500" />
                  )}
                  <span className={isMatching ? 'text-success-400' : 'text-neutral-400'}>
                    Kata sandi cocok
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={!isValid || isLoading}
            >
              Atur Ulang Kata Sandi
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
