import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { createPost } from '../services';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useToast } from '../components/common/Toast';
import { ArrowLeft, Image, Film, FileText } from 'lucide-react';

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  // Form Fields
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL media wajib diisi.');
      return false;
    }
    // Simple URL regex check
    const pattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?(\?.*)?$/;
    if (!pattern.test(url)) {
      setUrlError('Masukkan URL yang valid (misal: https://images.unsplash.com/...)');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!validateUrl(mediaUrl)) return;

    setIsSubmitting(true);
    try {
      await createPost(currentUser.id, {
        mediaUrl: mediaUrl.trim(),
        mediaType,
        caption: caption.trim() || undefined,
      });
      toast.success('Postingan berhasil dibagikan!');
      navigate(`/profile/${currentUser.username}`);
    } catch {
      toast.error('Gagal membuat postingan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-neutral-400 hover:text-neutral-100 transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-neutral-100">Buat Postingan</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Media Preview Box */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-300 select-none">Pratinjau Media</label>
          <div className="relative aspect-square w-full rounded-2xl bg-surface-900 border border-dashed border-surface-700/80 overflow-hidden flex items-center justify-center">
            {mediaUrl && !urlError ? (
              mediaType === 'video' ? (
                <video
                  src={mediaUrl}
                  className="w-full h-full object-cover"
                  controls
                  muted
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt="Preview"
                  className="w-full h-full object-cover animate-fade-in"
                  onError={() => setUrlError('Gagal memuat pratinjau media dari URL ini. Silakan periksa URL Anda.')}
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-3 text-neutral-500 p-6 select-none text-center">
                <Image className="h-12 w-12 text-neutral-600 animate-pulse" />
                <div>
                  <p className="text-xs font-semibold text-neutral-400">Belum ada pratinjau</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Masukkan URL media di bawah untuk melihat hasil.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Media Type Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-neutral-300 select-none">Tipe Media</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setMediaType('image'); setUrlError(''); }}
              className={[
                'flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold border transition-all',
                mediaType === 'image'
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 shadow-glow-sm'
                  : 'bg-surface-800 border-surface-700 text-neutral-400 hover:border-surface-600 hover:text-neutral-200',
              ].join(' ')}
            >
              <Image className="h-4 w-4" />
              Gambar
            </button>
            <button
              type="button"
              onClick={() => { setMediaType('video'); setUrlError(''); }}
              className={[
                'flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold border transition-all',
                mediaType === 'video'
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 shadow-glow-sm'
                  : 'bg-surface-800 border-surface-700 text-neutral-400 hover:border-surface-600 hover:text-neutral-200',
              ].join(' ')}
            >
              <Film className="h-4 w-4" />
              Video
            </button>
          </div>
        </div>

        {/* Media URL Input */}
        <Input
          id="create-media-url"
          label="URL Media"
          placeholder="https://images.unsplash.com/photo-..."
          value={mediaUrl}
          onChange={e => { setMediaUrl(e.target.value); setUrlError(''); }}
          variant={urlError ? 'error' : mediaUrl ? 'success' : 'default'}
          helperText={urlError}
          required
        />

        {/* Caption Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="create-caption" className="text-sm font-medium text-neutral-300 select-none">
            Caption
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-neutral-500 pointer-events-none">
              <FileText className="h-4 w-4" />
            </span>
            <textarea
              id="create-caption"
              value={caption}
              onChange={e => setCaption(e.target.value.slice(0, 500))}
              placeholder="Tulis deskripsi menarik untuk postinganmu (gunakan #hashtag)..."
              rows={4}
              className="w-full bg-surface-800 rounded-xl pl-10 pr-4 py-3 text-xs text-neutral-50 placeholder-neutral-500 border border-surface-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all resize-none"
              disabled={isSubmitting}
            />
            <span className="absolute bottom-2.5 right-3.5 text-[10px] text-neutral-500 select-none">
              {caption.length}/500
            </span>
          </div>
        </div>

        {/* Notice text */}
        <p className="text-[10px] text-neutral-500 text-left select-none -mt-2">
          Postingan ini akan dibagikan ke publik atau follower Anda bergantung pada privasi akun Anda.
        </p>

        {/* Form Actions */}
        <div className="flex gap-3 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            fullWidth
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Bagikan Postingan
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
