import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { createStory } from '../../services';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import { Image, Film, Type, Sparkles } from 'lucide-react';

// ============================================================
// Constants
// ============================================================

const GRADIENTS = [
  { name: 'Cosmic Violet', value: 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700' },
  { name: 'Sunset Red', value: 'bg-gradient-to-br from-rose-500 via-red-500 to-orange-500' },
  { name: 'Ocean Cyan', value: 'bg-gradient-to-br from-blue-600 to-cyan-500' },
  { name: 'Emerald Teal', value: 'bg-gradient-to-br from-emerald-600 to-teal-500' },
  { name: 'Dark Purple', value: 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' }
];

// ============================================================
// Types
// ============================================================

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

// ============================================================
// Component
// ============================================================

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [mediaType, setMediaType] = useState<'image' | 'video' | 'text'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [urlError, setUrlError] = useState('');

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL media wajib diisi.');
      return false;
    }
    const pattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?(\?.*)?$/;
    if (!pattern.test(url)) {
      setUrlError('Masukkan URL yang valid (misal: https://images.unsplash.com/...)');
      return false;
    }
    setUrlError('');
    return true;
  };

  const handleReset = () => {
    setMediaType('image');
    setMediaUrl('');
    setTextContent('');
    setSelectedGradient(GRADIENTS[0].value);
    setUrlError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (mediaType !== 'text' && !validateUrl(mediaUrl)) return;
    if (mediaType === 'text' && !textContent.trim()) {
      toast.error('Konten teks tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createStory(currentUser.id, {
        mediaType,
        mediaUrl: mediaType === 'text' ? selectedGradient : mediaUrl.trim(),
        textContent: mediaType === 'text' ? textContent.trim() : undefined,
      });

      toast.success('Cerita berhasil dibagikan!');
      handleReset();
      onStoryCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Gagal membagikan cerita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          handleReset();
          onClose();
        }
      }}
      title="Buat Cerita Baru"
      size="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Story Type Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-neutral-400 select-none uppercase tracking-wider">
            Tipe Cerita
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => { setMediaType('image'); setUrlError(''); }}
              className={[
                'flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200',
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
                'flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200',
                mediaType === 'video'
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 shadow-glow-sm'
                  : 'bg-surface-800 border-surface-700 text-neutral-400 hover:border-surface-600 hover:text-neutral-200',
              ].join(' ')}
            >
              <Film className="h-4 w-4" />
              Video
            </button>
            <button
              type="button"
              onClick={() => { setMediaType('text'); setUrlError(''); }}
              className={[
                'flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200',
                mediaType === 'text'
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-300 shadow-glow-sm'
                  : 'bg-surface-800 border-surface-700 text-neutral-400 hover:border-surface-600 hover:text-neutral-200',
              ].join(' ')}
            >
              <Type className="h-4 w-4" />
              Teks
            </button>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-neutral-400 select-none uppercase tracking-wider">
            Pratinjau Cerita
          </label>
          <div className="relative aspect-[9/16] w-full max-h-[320px] rounded-2xl bg-surface-950 border border-surface-800 overflow-hidden flex items-center justify-center">
            {mediaType === 'text' ? (
              <div className={['w-full h-full flex items-center justify-center p-6 text-center text-white text-lg font-bold break-words', selectedGradient].join(' ')}>
                {textContent.trim() || 'Ketik teks Anda di bawah...'}
              </div>
            ) : mediaUrl && !urlError ? (
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
                  className="w-full h-full object-cover"
                  onError={() => setUrlError('Gagal memuat pratinjau media dari URL ini.')}
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-500 p-6 text-center select-none">
                <Sparkles className="h-10 w-10 text-neutral-600 animate-pulse" />
                <p className="text-xs font-semibold text-neutral-400">Belum ada pratinjau</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">Masukkan URL media di bawah untuk melihat pratinjau.</p>
              </div>
            )}
          </div>
        </div>

        {/* Inputs based on type */}
        {mediaType === 'text' ? (
          <div className="flex flex-col gap-3">
            {/* Textarea */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="story-text-content" className="text-xs font-medium text-neutral-300 select-none">
                Isi Cerita Teks
              </label>
              <textarea
                id="story-text-content"
                value={textContent}
                onChange={e => setTextContent(e.target.value.slice(0, 200))}
                placeholder="Ketik apa yang sedang kamu pikirkan..."
                rows={3}
                className="w-full bg-surface-800 rounded-xl px-4 py-3 text-xs text-neutral-50 placeholder-neutral-500 border border-surface-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all resize-none"
                disabled={isSubmitting}
                required
              />
              <span className="text-[10px] text-neutral-500 text-right self-end select-none">
                {textContent.length}/200
              </span>
            </div>

            {/* Gradient Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-300 select-none">
                Gaya Latar Belakang
              </label>
              <div className="flex gap-2">
                {GRADIENTS.map(gradient => (
                  <button
                    key={gradient.name}
                    type="button"
                    onClick={() => setSelectedGradient(gradient.value)}
                    className={[
                      'w-8 h-8 rounded-full border-2 transition-all duration-200',
                      gradient.value,
                      selectedGradient === gradient.value ? 'border-white scale-110 shadow-glow-sm' : 'border-transparent hover:scale-105'
                    ].join(' ')}
                    title={gradient.name}
                    aria-label={`Pilih warna ${gradient.name}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Input
            id="story-media-url"
            label="URL Media"
            placeholder={mediaType === 'video' ? 'https://example.com/video.mp4' : 'https://images.unsplash.com/photo-...'}
            value={mediaUrl}
            onChange={e => { setMediaUrl(e.target.value); setUrlError(''); }}
            variant={urlError ? 'error' : mediaUrl ? 'success' : 'default'}
            helperText={urlError}
            required
            disabled={isSubmitting}
          />
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Bagikan Cerita
          </Button>
        </div>
      </form>
    </Modal>
  );
};
