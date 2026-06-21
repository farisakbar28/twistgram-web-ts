/**
 * RecoverAccountPage — Halaman Pemulihan Akun (Lupa Username / Lupa Email)
 * Ref: SRS §3.4 (Skenario A & B)
 *
 * Flow:
 * 1. Pengguna memilih mode pemulihan (Lupa Username atau Lupa Email).
 * 2. Lupa Username (Skenario A):
 *    - Input: Email terdaftar.
 *    - Panggil API `authRecoverUsername`.
 *    - Redirect ke `/verify-otp` (purpose: 'recover_username', identifier: email).
 *    - Setelah OTP sukses, `/verify-otp` redirect kembali ke halaman ini dengan state:
 *      { step: 'result_username', username: '...' }.
 * 3. Lupa Email (Skenario B):
 *    - Input: Username & Nomor Telepon terverifikasi.
 *    - Panggil API `authRecoverEmail`.
 *    - Redirect ke `/verify-otp` (purpose: 'recover_email', identifier: username, phone).
 *    - Setelah OTP sukses, `/verify-otp` redirect kembali ke halaman ini dengan state:
 *      { step: 'result_email', maskedEmail: '...' }.
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserSearch, MailWarning, User, Mail, Phone, ArrowLeft, AlertCircle, HelpCircle } from 'lucide-react';
import { authRecoverUsername, authRecoverEmail } from '../services';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

type RecoveryMode = 'username' | 'email';

const RecoverAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Ambil state hasil verifikasi OTP
  const state = location.state as {
    step?: 'result_username' | 'result_email';
    username?: string;
    maskedEmail?: string;
  } | null;

  const currentStep = state?.step ?? 'select';

  // Form states
  const [mode, setMode] = useState<RecoveryMode>('username');
  const [email, setEmail] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [phone, setPhone] = useState('');

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ============================================================
  // Handlers
  // ============================================================

  const handleRecoverUsername = async (e: React.FormEvent) => {
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
      await authRecoverUsername({ email: cleanEmail });
      // Redirect ke verifikasi OTP
      navigate('/verify-otp', {
        state: {
          purpose: 'recover_username',
          identifier: cleanEmail,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses permintaan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = usernameInput.trim();
    const cleanPhone = phone.trim();
    if (!cleanUsername || !cleanPhone) return;

    setIsLoading(true);
    setError('');

    try {
      await authRecoverEmail({ username: cleanUsername, phone: cleanPhone });
      // Redirect ke verifikasi OTP
      navigate('/verify-otp', {
        state: {
          purpose: 'recover_email',
          identifier: cleanUsername,
          phone: cleanPhone,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses permintaan.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Render Steps
  // ============================================================

  // Step 1: Input Forms (Default)
  const renderForm = () => (
    <div className="flex flex-col gap-6">
      {/* Mode Tabs */}
      <div className="flex bg-surface-950 p-1 rounded-xl border border-surface-800">
        <button
          type="button"
          onClick={() => {
            setMode('username');
            setError('');
          }}
          className={[
            'flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
            mode === 'username'
              ? 'bg-surface-800 text-neutral-100 shadow-sm border border-surface-700/50'
              : 'text-neutral-400 hover:text-neutral-200',
          ].join(' ')}
        >
          <UserSearch className="h-3.5 w-3.5" />
          Lupa Username
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('email');
            setError('');
          }}
          className={[
            'flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
            mode === 'email'
              ? 'bg-surface-800 text-neutral-100 shadow-sm border border-surface-700/50'
              : 'text-neutral-400 hover:text-neutral-200',
          ].join(' ')}
        >
          <MailWarning className="h-3.5 w-3.5" />
          Lupa Email
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {mode === 'username' ? (
        /* Form Lupa Username */
        <form onSubmit={handleRecoverUsername} className="flex flex-col gap-4" noValidate>
          <Input
            id="recover-email"
            label="Alamat Email Akun"
            type="email"
            placeholder="Masukkan email terdaftar"
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
            Kirim OTP Pemulihan
          </Button>
        </form>
      ) : (
        /* Form Lupa Email */
        <form onSubmit={handleRecoverEmail} className="flex flex-col gap-4" noValidate>
          <div className="text-xs text-neutral-400 leading-relaxed bg-surface-950/40 p-3 rounded-xl border border-surface-800/80 mb-1">
            <span className="font-semibold text-brand-400 block mb-0.5">Catatan:</span>
            Pemulihan email otomatis hanya berlaku jika Anda telah mengisi dan memverifikasi nomor telepon di profil Anda.
          </div>
          <Input
            id="recover-username"
            label="Username Twistgram"
            type="text"
            placeholder="Masukkan username Anda"
            value={usernameInput}
            onChange={(e) => {
              setUsernameInput(e.target.value);
              setError('');
            }}
            leftIcon={<User className="h-4 w-4" />}
            disabled={isLoading}
            required
          />
          <Input
            id="recover-phone"
            label="Nomor Telepon Terdaftar"
            type="tel"
            placeholder="Contoh: +628123456789"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError('');
            }}
            leftIcon={<Phone className="h-4 w-4" />}
            disabled={isLoading}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!usernameInput.trim() || !phone.trim() || isLoading}
          >
            Kirim OTP Pemulihan
          </Button>
        </form>
      )}
    </div>
  );

  // Step 2: Show recovered Username (Scenario A result)
  const renderUsernameResult = () => (
    <div className="flex flex-col gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-success-500/10 border border-success-500/20">
          <UserSearch className="h-7 w-7 text-success-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-100 font-sans">Username Ditemukan!</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Gunakan username berikut untuk masuk ke akun Anda.
          </p>
        </div>
      </div>

      <div className="bg-surface-950 border border-surface-800 rounded-xl p-4 font-mono text-xl font-bold text-transparent bg-clip-text bg-brand-gradient select-all">
        @{state?.username}
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => navigate('/login', { replace: true })}
      >
        Masuk Sekarang
      </Button>
    </div>
  );

  // Step 3: Show recovered Email (Scenario B result)
  const renderEmailResult = () => (
    <div className="flex flex-col gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-success-500/10 border border-success-500/20">
          <MailWarning className="h-7 w-7 text-success-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-100">Email Ditemukan!</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Alamat email Anda yang tersamar telah diverifikasi.
          </p>
        </div>
      </div>

      <div className="bg-surface-950 border border-surface-800 rounded-xl p-4 font-mono text-base font-semibold text-neutral-200">
        {state?.maskedEmail}
      </div>

      <div className="text-xs text-neutral-400 leading-relaxed text-left bg-surface-950/40 p-3 rounded-xl border border-surface-800/80">
        Jika Anda memerlukan akses masuk kembali, silakan gunakan username Anda atau alamat email di atas untuk memulihkan kata sandi.
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => navigate('/login', { replace: true })}
      >
        Kembali ke Login
      </Button>
    </div>
  );

  // ============================================================
  // Master Render
  // ============================================================

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 bg-glow-brand opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6 animate-fade-in">
        {currentStep === 'select' && (
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors self-start"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Login
          </Link>
        )}

        {/* Card */}
        <div className="bg-surface-900/80 backdrop-blur-md border border-surface-800 rounded-2xl p-8 shadow-modal flex flex-col gap-6">
          {currentStep === 'select' && (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20">
                <HelpCircle className="h-7 w-7 text-brand-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-100">Pemulihan Akun</h2>
                <p className="text-sm text-neutral-400 mt-1">
                  Pilih opsi pemulihan kredensial Twistgram Anda.
                </p>
              </div>
            </div>
          )}

          {currentStep === 'select' && renderForm()}
          {currentStep === 'result_username' && renderUsernameResult()}
          {currentStep === 'result_email' && renderEmailResult()}
        </div>
      </div>
    </div>
  );
};

export default RecoverAccountPage;
