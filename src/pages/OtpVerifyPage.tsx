/**
 * OtpVerifyPage — Input kode OTP 6 digit
 * Ref: SRS §3.1 (register verification), §3.3 (reset password), §3.4 (recovery)
 *      Business Rules AUTH-03: OTP 10 menit, sekali pakai
 *
 * Digunakan untuk semua purpose melalui react-router state:
 *   { purpose: OtpPurpose, identifier: string }
 *
 * Fitur:
 * - 6 input digit terpisah (auto-focus next, backspace prev, paste support)
 * - Countdown timer 10 menit
 * - Resend OTP (reset timer)
 * - Setelah verified → redirect sesuai purpose
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { authVerifyOtp, authForgotPassword, authRecoverUsername, authRecoverEmail } from '../services';
import { useAuth } from '../features/auth/AuthContext';
import type { OtpPurpose } from '../types/auth';
import Button from '../components/common/Button';
import { useToast } from '../components/common/Toast';

// ============================================================
// Constants
// ============================================================

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECS = 10 * 60; // AUTH-03: 10 menit

const PURPOSE_LABELS: Record<OtpPurpose, string> = {
  register: 'Verifikasi Email Akun',
  reset_password: 'Reset Kata Sandi',
  recover_username: 'Pemulihan Username',
  recover_email: 'Pemulihan Email',
};

const PURPOSE_DESC: Record<OtpPurpose, string> = {
  register: 'Masukkan kode 6 digit yang dikirim ke email Anda untuk mengaktifkan akun.',
  reset_password: 'Masukkan kode OTP untuk memverifikasi identitas Anda sebelum membuat kata sandi baru.',
  recover_username: 'Masukkan kode OTP yang kami kirim ke email Anda.',
  recover_email: 'Masukkan kode OTP yang kami kirim ke nomor telepon Anda.',
};

// ============================================================
// Component
// ============================================================

const OtpVerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, markEmailVerified } = useAuth();
  const toast = useToast();

  // Ambil state dari navigation
  const state = location.state as {
    purpose: OtpPurpose;
    identifier: string; // email atau username tergantung purpose
    phone?: string;     // untuk recover_email
  } | null;

  const purpose: OtpPurpose =
    state?.purpose ?? (currentUser && !currentUser.email_verified ? 'register' : 'register');
  const identifier =
    state?.identifier ??
    (purpose === 'register' && currentUser && !currentUser.email_verified ? currentUser.email : '');

  // OTP digits
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECS);
  const [canResend, setCanResend] = useState(false);

  // UI
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');

  // Jika tidak ada state (akses langsung URL), redirect ke login
  useEffect(() => {
    const canRecoverRegisterFlow =
      purpose === 'register' && !!currentUser && !currentUser.email_verified && !!identifier;

    if (!state?.identifier && !canRecoverRegisterFlow) {
      navigate('/login', { replace: true });
    }
  }, [state, navigate, currentUser, purpose, identifier]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ============================================================
  // OTP input handlers
  // ============================================================

  const handleDigitChange = (idx: number, value: string) => {
    const single = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = single;
    setDigits(next);
    setError('');
    if (single && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < OTP_LENGTH; i++) next[i] = pasted[i] ?? '';
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  // ============================================================
  // Submit
  // ============================================================

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH;

  const handleSubmit = useCallback(async () => {
    if (!isComplete) return;
    setIsLoading(true);
    setError('');

    try {
      const result = await authVerifyOtp({ otp, purpose, identifier });

      if (purpose === 'register') {
        markEmailVerified();
        toast.success('Email berhasil diverifikasi! Selamat datang 🎉');
        navigate('/', { replace: true });

      } else if (purpose === 'reset_password') {
        toast.success('OTP terverifikasi! Buat kata sandi baru.');
        navigate('/reset-password', {
          state: { resetToken: result.resetToken, identifier },
          replace: true,
        });

      } else if (purpose === 'recover_username') {
        toast.success('Username ditemukan!');
        navigate('/recover-account', {
          state: { step: 'result_username', username: result.username },
          replace: true,
        });

      } else if (purpose === 'recover_email') {
        toast.success('Email ditemukan!');
        navigate('/recover-account', {
          state: { step: 'result_email', maskedEmail: result.maskedEmail },
          replace: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi gagal. Coba lagi.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [isComplete, otp, purpose, identifier, markEmailVerified, toast, navigate]);

  // Auto-submit saat semua digit terisi
  useEffect(() => {
    if (isComplete) handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // ============================================================
  // Resend OTP
  // ============================================================

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setDigits(Array(OTP_LENGTH).fill(''));

    try {
      if (purpose === 'reset_password') {
        await authForgotPassword({ email: identifier });
      } else if (purpose === 'recover_username') {
        await authRecoverUsername({ email: identifier });
      } else if (purpose === 'recover_email' && state?.phone) {
        await authRecoverEmail({ username: identifier, phone: state.phone });
      }
      // register: tidak perlu resend API call di mock — OTP sudah ada di console

      setCountdown(OTP_EXPIRY_SECS);
      setCanResend(false);
      toast.info('Kode OTP baru telah dikirim.');
    } catch {
      toast.error('Gagal mengirim ulang OTP. Coba lagi.');
    } finally {
      setIsResending(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-glow-brand opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6 animate-fade-in">
        {/* Back */}
        <Link
          to={purpose === 'register' ? '/register' : '/forgot-password'}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors self-start"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>

        {/* Card */}
        <div className="bg-surface-900/80 backdrop-blur-md border border-surface-800 rounded-2xl p-8 shadow-modal flex flex-col gap-6">
          {/* Icon + title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20">
              <ShieldCheck className="h-7 w-7 text-brand-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-100">{PURPOSE_LABELS[purpose]}</h2>
              <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
                {PURPOSE_DESC[purpose]}
              </p>
              <p className="text-xs text-brand-400 font-medium mt-2 truncate">
                {identifier}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* OTP Input boxes */}
          <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={isLoading}
                className={[
                  'w-11 h-13 text-center text-xl font-bold rounded-xl border-2',
                  'bg-surface-800 text-neutral-100',
                  'transition-all duration-150 focus:outline-none',
                  error
                    ? 'border-danger-500 focus:border-danger-400'
                    : d
                    ? 'border-brand-500 focus:border-brand-400'
                    : 'border-surface-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                  isLoading ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
                aria-label={`Digit OTP ke-${i + 1}`}
              />
            ))}
          </div>

          {/* Timer & resend */}
          <div className="flex flex-col items-center gap-2 text-center">
            {!canResend ? (
              <p className="text-sm text-neutral-400">
                Kode berlaku selama{' '}
                <span className="font-mono font-bold text-brand-400">
                  {formatTimer(countdown)}
                </span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? 'Mengirim...' : 'Kirim ulang kode'}
              </button>
            )}

            <p className="text-xs text-neutral-500">
              Cek folder <span className="text-neutral-400 font-medium">Spam</span> jika tidak masuk.{' '}
              Kode juga tampil di <span className="font-mono text-neutral-400">Console</span> (mode development).
            </p>
          </div>

          {/* Manual submit (jika auto-submit tidak terpicu) */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!isComplete || isLoading}
            onClick={handleSubmit}
          >
            Verifikasi
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerifyPage;
