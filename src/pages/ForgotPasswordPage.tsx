/**
 * ForgotPasswordPage — Halaman Lupa Kata Sandi
 * Ref: SRS §3.3 (Reset password via OTP email)
 *
 * Flow:
 * 1. Pengguna memasukkan email.
 * 2. Panggil API `authForgotPassword` untuk generate OTP (mock).
 * 3. Redirect ke `/verify-otp` dengan state purpose 'reset_password' & identifier email.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, KeyRound } from 'lucide-react';
import { authForgotPassword } from '../services';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { useToast } from '../components/common/Toast';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Format email tidak valid.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authForgotPassword({ email: cleanEmail });
      toast.info('Jika email terdaftar, kode OTP reset password telah dikirim.');
      // Redirect ke verifikasi OTP
      navigate('/verify-otp', {
        state: {
          purpose: 'reset_password',
          identifier: cleanEmail,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 bg-glow-brand opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6 animate-fade-in">
        {/* Back link */}
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Login
        </Link>

        {/* Card */}
        <div className="bg-surface-900/80 backdrop-blur-md border border-surface-800 rounded-2xl p-8 shadow-modal flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20">
              <KeyRound className="h-7 w-7 text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-100">Lupa Kata Sandi</h2>
              <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
                Masukkan email Anda yang terdaftar. Kami akan mengirimkan kode verifikasi OTP untuk mengatur ulang kata sandi.
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              id="forgot-email"
              label="Alamat Email"
              type="email"
              placeholder="contoh@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={isLoading}
              required
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={!email.trim() || isLoading}
            >
              Kirim Kode OTP
            </Button>
          </form>

          {/* Helper links */}
          <div className="border-t border-surface-800 pt-4 text-center text-sm text-neutral-500">
            Butuh bantuan lain?{' '}
            <Link
              to="/recover-account"
              className="text-brand-400 hover:text-brand-300 font-semibold transition-colors"
            >
              Pulihkan Akun
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
