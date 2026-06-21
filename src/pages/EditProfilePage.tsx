/**
 * EditProfilePage — Edit profil pengguna
 * Ref: SRS §4.1 (Edit profil), §4.2 (Privasi toggle), §4.7 SOC-05 (username 1x/bulan)
 *
 * Fitur [MVP]:
 * - Edit nama, username, bio, avatar (URL), link eksternal
 * - Toggle privasi akun (publik / privat)
 * - Pilih minat/kategori konten (multi-select, maks. 5)
 * - SOC-05: peringatan bahwa username hanya bisa diubah 1x per bulan
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  AtSign,
  FileText,
  Link as LinkIcon,
  Lock,
  Globe,
  Camera,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import {
  getMyProfile,
  updateProfile,
  updatePrivacy,
  getInterests,
  updateInterests,
} from '../services';
import { INTEREST_CATEGORIES } from '../types/social';
import type { UserProfile } from '../types/social';
import Avatar from '../components/common/Avatar';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { useToast } from '../components/common/Toast';

const MAX_INTERESTS = 5;

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // UI states
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Load profile on mount
  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getMyProfile(currentUser.id);
        setProfile(data);
        setName(data.name);
        setUsername(data.username);
        setBio(data.bio ?? '');
        setAvatarUrl(data.avatar_url ?? '');
        setIsPrivate(data.is_private);
        const interests = await getInterests(currentUser.id);
        setSelectedInterests(interests);
      } catch {
        toast.error('Gagal memuat profil.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [currentUser, toast]);

  // ============================================================
  // Handlers
  // ============================================================

  const toggleInterest = (cat: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(cat)) return prev.filter(c => c !== cat);
      if (prev.length >= MAX_INTERESTS) {
        toast.warning(`Maksimal ${MAX_INTERESTS} minat yang dapat dipilih.`);
        return prev;
      }
      return [...prev, cat];
    });
  };

  const validateForm = (): boolean => {
    let valid = true;
    if (!name.trim()) {
      setNameError('Nama wajib diisi.');
      valid = false;
    } else {
      setNameError('');
    }
    if (!username.trim() || username.length < 3) {
      setUsernameError('Username minimal 3 karakter.');
      valid = false;
    } else if (!/^[a-z0-9_.]+$/.test(username)) {
      setUsernameError('Hanya huruf kecil, angka, titik, dan underscore.');
      valid = false;
    } else {
      setUsernameError('');
    }
    return valid;
  };

  const handleSave = async () => {
    if (!currentUser || !validateForm()) return;
    setIsSaving(true);
    try {
      await updateProfile(currentUser.id, {
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        external_link: externalLink.trim() || undefined,
      });
      await updatePrivacy(currentUser.id, { is_private: isPrivate });
      await updateInterests(currentUser.id, selectedInterests);
      toast.success('Profil berhasil diperbarui!');
      navigate(`/profile/${username.trim()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" className="text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold text-neutral-100">Edit Profil</h1>

      {/* Avatar Preview */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar
            src={avatarUrl || null}
            name={name || profile?.name || ''}
            size="2xl"
            className="ring-2 ring-brand-500/30"
          />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center border-2 border-surface-950 cursor-pointer">
            <Camera className="h-4 w-4 text-white" />
          </div>
        </div>
        <p className="text-xs text-neutral-500 text-center">
          Upload foto profil akan tersedia di Fase backend.
        </p>
      </div>

      {/* Avatar URL (sementara) */}
      <Input
        id="edit-avatar-url"
        label="URL Foto Profil (sementara)"
        placeholder="https://example.com/photo.jpg"
        value={avatarUrl}
        onChange={e => setAvatarUrl(e.target.value)}
        leftIcon={<Camera className="h-4 w-4" />}
        helperText="Tempel URL gambar untuk pratinjau. Upload file tersedia setelah backend terhubung."
      />

      {/* Nama */}
      <Input
        id="edit-name"
        label="Nama Lengkap"
        placeholder="Nama yang tampil di profil"
        value={name}
        onChange={e => { setName(e.target.value); setNameError(''); }}
        leftIcon={<User className="h-4 w-4" />}
        variant={nameError ? 'error' : name ? 'success' : 'default'}
        helperText={nameError}
        required
      />

      {/* Username */}
      <div className="flex flex-col gap-1.5">
        <Input
          id="edit-username"
          label="Username"
          placeholder="username (huruf kecil, angka, . _)"
          value={username}
          onChange={e => {
            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''));
            setUsernameError('');
          }}
          leftIcon={<AtSign className="h-4 w-4" />}
          variant={usernameError ? 'error' : username ? 'success' : 'default'}
          helperText={usernameError}
          required
        />
        {/* SOC-05 warning */}
        <div className="flex items-start gap-2 text-xs text-warning-400 bg-warning-400/5 border border-warning-400/20 rounded-xl px-3 py-2.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Username hanya dapat diubah <strong>1 kali per bulan</strong> setelah profil disimpan (SOC-05).</span>
        </div>
      </div>

      {/* Bio */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300 select-none">
          Bio
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-3 text-neutral-500 pointer-events-none">
            <FileText className="h-4 w-4" />
          </span>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 150))}
            placeholder="Tulis bio singkat tentang dirimu..."
            rows={3}
            className="w-full bg-surface-800 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-50 placeholder-neutral-500 border border-surface-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all resize-none"
          />
          <span className="absolute bottom-2 right-3 text-xs text-neutral-500">
            {bio.length}/150
          </span>
        </div>
      </div>

      {/* Link eksternal */}
      <Input
        id="edit-link"
        label="Link Eksternal"
        placeholder="https://portfolio.com"
        value={externalLink}
        onChange={e => setExternalLink(e.target.value)}
        leftIcon={<LinkIcon className="h-4 w-4" />}
        helperText="Tampil di header profil (website, portfolio, dll.)"
      />

      {/* Toggle Privasi */}
      <div className="bg-surface-900/60 border border-surface-800 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isPrivate ? (
            <Lock className="h-5 w-5 text-brand-400 shrink-0" />
          ) : (
            <Globe className="h-5 w-5 text-success-400 shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium text-neutral-200">
              {isPrivate ? 'Akun Privat' : 'Akun Publik'}
            </p>
            <p className="text-xs text-neutral-500">
              {isPrivate
                ? 'Hanya follower yang disetujui yang bisa melihat postinganmu.'
                : 'Siapa pun bisa melihat dan langsung follow akunmu.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPrivate}
          onClick={() => setIsPrivate(v => !v)}
          className={[
            'relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 shrink-0',
            isPrivate ? 'bg-brand-500' : 'bg-surface-700',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300',
              isPrivate ? 'translate-x-6' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Minat / Kategori Konten */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">Minat Konten</h3>
            <p className="text-xs text-neutral-500">Pilih hingga {MAX_INTERESTS} kategori</p>
          </div>
          <span className={[
            'text-xs font-semibold px-2.5 py-1 rounded-full',
            selectedInterests.length >= MAX_INTERESTS
              ? 'bg-brand-500/10 text-brand-400'
              : 'bg-surface-800 text-neutral-400',
          ].join(' ')}>
            {selectedInterests.length}/{MAX_INTERESTS}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {INTEREST_CATEGORIES.map(cat => {
            const selected = selectedInterests.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleInterest(cat)}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                  selected
                    ? 'bg-brand-500/15 border-brand-500/40 text-brand-300'
                    : 'bg-surface-800 border-surface-700 text-neutral-400 hover:border-surface-600 hover:text-neutral-300',
                ].join(' ')}
              >
                {selected && <CheckCircle2 className="inline h-3 w-3 mr-1 -mt-px" />}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error general */}
      {(nameError || usernameError) && (
        <div className="flex items-start gap-2 text-xs text-danger-400 bg-danger-500/5 border border-danger-500/20 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Periksa kembali form di atas sebelum menyimpan.</span>
        </div>
      )}

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-2 pb-8">
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => navigate(-1)}
          disabled={isSaving}
        >
          Batal
        </Button>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isSaving}
          onClick={handleSave}
          disabled={isSaving}
        >
          Simpan Perubahan
        </Button>
      </div>
    </div>
  );
};

export default EditProfilePage;
