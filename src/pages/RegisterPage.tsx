/**
 * RegisterPage — Halaman Registrasi Akun
 * Ref: SRS §3.1, Business Rules AUTH-01
 *
 * Fitur [MVP]:
 * - Input: nama lengkap, email, username (auto-suggest dari nama), password, HP (opsional)
 * - Validasi real-time: username & email availability check (debounced)
 * - AUTH-01: password min 8 char, huruf besar di awal kata pertama
 * - Show/hide password + konfirmasi password
 * - Setelah submit → redirect ke /verify-otp dengan state email
 * - Link ke /login
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  AtSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { checkUsernameAvailable, checkEmailAvailable } from '../services';
import { suggestUsername } from '../utils';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

// ============================================================
// Helpers
// ============================================================

/** AUTH-01: min 8 char, huruf besar di awal */
const validatePassword = (pw: string): string => {
  if (pw.length < 8) return 'Password minimal 8 karakter.';
  if (!/^[A-Z]/.test(pw)) return 'Password harus diawali huruf kapital.';
  return '';
};

const validateEmail = (email: string): string => {
  if (!email) return 'Email wajib diisi.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format email tidak valid.';
  return '';
};

const validateUsername = (username: string): string => {
  if (!username) return 'Username wajib diisi.';
  if (username.length < 3) return 'Username minimal 3 karakter.';
  if (username.length > 30) return 'Username maksimal 30 karakter.';
  if (!/^[a-z0-9_.]+$/.test(username))
    return 'Hanya huruf kecil, angka, titik, dan underscore.';
  return '';
};

// ============================================================
// Availability status type
// ============================================================

type AvailStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

// ============================================================
// Component
// ============================================================

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Validation states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  // Availability states
  const [emailStatus, setEmailStatus] = useState<AvailStatus>('idle');
  const [usernameStatus, setUsernameStatus] = useState<AvailStatus>('idle');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Auto-suggest username dari nama (SRS §3.1)
  useEffect(() => {
    if (name && !username) {
      setUsername(suggestUsername(name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Debounced email availability check
  const checkEmail = useCallback(async (val: string) => {
    const err = validateEmail(val);
    if (err) { setEmailError(err); setEmailStatus('idle'); return; }
    setEmailError('');
    setEmailStatus('checking');
    try {
      const avail = await checkEmailAvailable(val);
      setEmailStatus(avail ? 'available' : 'taken');
      if (!avail) setEmailError('Email sudah terdaftar. Gunakan email lain.');
    } catch {
      setEmailStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!email) { setEmailStatus('idle'); return; }
    const t = setTimeout(() => checkEmail(email), 500);
    return () => clearTimeout(t);
  }, [email, checkEmail]);

  // Debounced username availability check
  const checkUsername = useCallback(async (val: string) => {
    const err = validateUsername(val);
    if (err) { setUsernameError(err); setUsernameStatus('idle'); return; }
    setUsernameError('');
    setUsernameStatus('checking');
    try {
      const avail = await checkUsernameAvailable(val);
      setUsernameStatus(avail ? 'available' : 'taken');
      if (!avail) setUsernameError('Username sudah digunakan.');
    } catch {
      setUsernameStatus('error');
    }
  }, []);

  useEffect(() => {
    if (!username) { setUsernameStatus('idle'); return; }
    const t = setTimeout(() => checkUsername(username), 500);
    return () => clearTimeout(t);
  }, [username, checkUsername]);

  // ============================================================
  // Submit
  // ============================================================

  const isFormValid =
    !!name.trim() &&
    emailStatus === 'available' &&
    usernameStatus === 'available' &&
    !passwordError &&
    password.length >= 8 &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validasi
    if (!name.trim()) { setNameError('Nama wajib diisi.'); return; }
    const pwErr = validatePassword(password);
    if (pwErr) { setPasswordError(pwErr); return; }
    if (password !== confirmPassword) { setConfirmError('Konfirmasi password tidak cocok.'); return; }

    setIsLoading(true);
    setSubmitError('');

    try {
      const registeredEmail = await register({
        name: name.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        phone: phone.trim() || undefined,
      });

      navigate('/verify-otp', {
        state: { purpose: 'register', identifier: registeredEmail },
        replace: true,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Registrasi gagal. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // Availability icon helper
  // ============================================================

  const AvailIcon = ({ status }: { status: AvailStatus }) => {
    if (status === 'checking') return <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />;
    if (status === 'available') return <CheckCircle2 className="h-4 w-4 text-success-400" />;
    if (status === 'taken') return <XCircle className="h-4 w-4 text-danger-400" />;
    return null;
  };

  const inputVariant = (status: AvailStatus, error: string): 'default' | 'error' | 'success' => {
    if (error) return 'error';
    if (status === 'available') return 'success';
    return 'default';
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4 py-8">
      <div className="fixed inset-0 bg-glow-brand opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6 animate-fade-in">
        {/* Brand */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-brand-gradient">
            Twistgram
          </h1>
          <p className="text-sm text-neutral-400">
            Bergabung dan bagikan momen terbaikmu
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-900/80 backdrop-blur-md border border-surface-800 rounded-2xl p-8 shadow-modal flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-neutral-100">Buat Akun</h2>
            <p className="text-sm text-neutral-500">
              Isi semua kolom wajib di bawah ini
            </p>
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Nama */}
            <Input
              id="reg-name"
              label="Nama Lengkap"
              placeholder="Nama tampil di profil Anda"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(e.target.value.trim() ? '' : 'Nama wajib diisi.');
              }}
              variant={nameError ? 'error' : name ? 'success' : 'default'}
              helperText={nameError}
              leftIcon={<User className="h-4 w-4" />}
              required
              autoFocus
            />

            {/* Email */}
            <Input
              id="reg-email"
              label="Email"
              type="email"
              placeholder="contoh@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailStatus('idle'); setEmailError(''); }}
              variant={inputVariant(emailStatus, emailError)}
              helperText={emailError || (emailStatus === 'available' ? 'Email tersedia ✓' : '')}
              leftIcon={<Mail className="h-4 w-4" />}
              rightAction={<AvailIcon status={emailStatus} />}
              autoComplete="email"
              required
            />

            {/* Username */}
            <Input
              id="reg-username"
              label="Username"
              placeholder="huruf kecil, angka, . atau _"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''));
                setUsernameStatus('idle');
                setUsernameError('');
              }}
              variant={inputVariant(usernameStatus, usernameError)}
              helperText={usernameError || (usernameStatus === 'available' ? 'Username tersedia ✓' : 'Bisa diubah setelah daftar (1x per bulan)')}
              leftIcon={<AtSign className="h-4 w-4" />}
              rightAction={<AvailIcon status={usernameStatus} />}
              autoComplete="username"
              required
            />

            {/* Password */}
            <Input
              id="reg-password"
              label="Kata Sandi"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 karakter, diawali huruf kapital"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(validatePassword(e.target.value));
              }}
              variant={passwordError ? 'error' : password && !passwordError ? 'success' : 'default'}
              helperText={passwordError || 'Min. 8 karakter, diawali huruf kapital (AUTH-01)'}
              leftIcon={<Lock className="h-4 w-4" />}
              rightAction={
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="text-neutral-400 hover:text-neutral-200 p-1 transition-colors"
                  aria-label={showPassword ? 'Sembunyikan' : 'Tampilkan'} tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              autoComplete="new-password"
              required
            />

            {/* Konfirmasi password */}
            <Input
              id="reg-confirm"
              label="Konfirmasi Kata Sandi"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Ketik ulang kata sandi"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmError(e.target.value !== password ? 'Konfirmasi tidak cocok.' : '');
              }}
              variant={confirmError ? 'error' : confirmPassword && !confirmError ? 'success' : 'default'}
              helperText={confirmError}
              leftIcon={<Lock className="h-4 w-4" />}
              rightAction={
                <button type="button" onClick={() => setShowConfirm((v) => !v)}
                  className="text-neutral-400 hover:text-neutral-200 p-1 transition-colors"
                  aria-label={showConfirm ? 'Sembunyikan' : 'Tampilkan'} tabIndex={-1}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              autoComplete="new-password"
              required
            />

            {/* Nomor HP (opsional) */}
            <Input
              id="reg-phone"
              label="Nomor Telepon (opsional)"
              type="tel"
              placeholder="+62812xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="h-4 w-4" />}
              helperText="Digunakan untuk pemulihan akun. Bisa diisi nanti."
              autoComplete="tel"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isLoading}
              disabled={!isFormValid || isLoading}
              className="mt-1"
            >
              Daftar
            </Button>
          </form>

          {/* Login link */}
          <div className="border-t border-surface-800 pt-4 text-center text-sm text-neutral-400">
            Sudah punya akun?{' '}
            <Link to="/login"
              className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
