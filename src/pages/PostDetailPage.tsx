import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import {
  getPostById,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  sharePost,
  deletePost,
  archivePost,
  unarchivePost,
  updatePostCaption,
} from '../services';
import type { Post } from '../types/index';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import CommentSection from '../components/common/CommentSection';
import Modal from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { formatCount, formatRelativeTime } from '../utils';
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Share2,
  Trash2,
  Archive,
  Edit2,
  MoreVertical,
} from 'lucide-react';

const PostDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Interactive local states
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // Modals & edits
  const [showOptions, setShowOptions] = useState(false);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editCaptionText, setEditCaptionText] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load post details
  const loadPost = useCallback(async () => {
    if (!id || !currentUser) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getPostById(id, currentUser.id);
      setPost(data);
      setIsLiked(data.is_liked ?? false);
      setLikesCount(data.likes_count ?? 0);
      setIsSaved(data.is_saved ?? false);
      setEditCaptionText(data.caption ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat postingan.');
    } finally {
      setIsLoading(false);
    }
  }, [id, currentUser]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  if (!currentUser) return null;

  // Handlers
  const handleLikeToggle = async () => {
    if (!post) return;
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount(prev => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (nextLiked) {
        await likePost(post.id, currentUser.id);
      } else {
        await unlikePost(post.id, currentUser.id);
      }
    } catch {
      setIsLiked(!nextLiked);
      setLikesCount(prev => (nextLiked ? Math.max(0, prev - 1) : prev + 1));
      toast.error('Gagal menyukai postingan.');
    }
  };

  const handleSaveToggle = async () => {
    if (!post) return;
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);

    try {
      if (nextSaved) {
        await savePost(post.id, currentUser.id);
        toast.success('Postingan disimpan ke koleksi.');
      } else {
        await unsavePost(post.id, currentUser.id);
        toast.success('Postingan dihapus dari koleksi.');
      }
    } catch {
      setIsSaved(!nextSaved);
      toast.error('Gagal menyimpan postingan.');
    }
  };

  const handleShare = async () => {
    if (!post) return;
    try {
      const url = await sharePost(post.id, currentUser.id);
      await navigator.clipboard.writeText(url);
      toast.success('Tautan berhasil disalin ke papan klip!');
    } catch {
      toast.error('Gagal membagikan postingan.');
    }
  };

  const handleDeletePost = async () => {
    if (!post || !window.confirm('Apakah Anda yakin ingin menghapus postingan ini?')) return;
    setIsActionLoading(true);
    try {
      await deletePost(post.id, currentUser.id);
      toast.success('Postingan berhasil dihapus.');
      navigate(`/profile/${currentUser.username}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus postingan.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!post) return;
    setIsActionLoading(true);
    const wasArchived = post.is_archived;
    try {
      if (wasArchived) {
        await unarchivePost(post.id, currentUser.id);
        toast.success('Postingan dikembalikan dari arsip.');
      } else {
        await archivePost(post.id, currentUser.id);
        toast.success('Postingan berhasil diarsipkan.');
      }
      setShowOptions(false);
      await loadPost();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status arsip.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveCaptionEdit = async () => {
    if (!post) return;
    setIsActionLoading(true);
    try {
      const updated = await updatePostCaption(post.id, currentUser.id, editCaptionText);
      setPost(updated);
      setShowEditCaption(false);
      toast.success('Caption berhasil diperbarui.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui caption.');
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" className="text-brand-500" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <EmptyState
          icon={<ArrowLeft className="h-10 w-10" />}
          title="Postingan Tidak Ditemukan"
          description={error || 'Mungkin postingan telah dihapus oleh pembuatnya.'}
          actionLabel="Kembali"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  const isOwnPost = post.user_id === currentUser.id;
  const mediaItem = post.media?.[0];

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col">
      {/* Header Mobile / Tablet */}
      <div className="sticky top-0 z-10 bg-surface-950/80 backdrop-blur-md border-b border-surface-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-neutral-400 hover:text-neutral-100 transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-neutral-100">Postingan</span>
        </div>
        {isOwnPost && (
          <IconButton
            variant="ghost"
            size="sm"
            icon={<MoreVertical className="h-5 w-5" />}
            label="Opsi postingan"
            onClick={() => setShowOptions(true)}
            className="text-neutral-400 hover:text-neutral-100"
          />
        )}
      </div>

      {/* Main Grid View */}
      <div className="flex flex-col lg:flex-row bg-surface-900 border border-surface-800/80 rounded-2xl overflow-hidden mt-4 shadow-card">
        {/* Left Side: Media Panel */}
        <div className="flex-1 bg-surface-950 flex items-center justify-center relative aspect-square lg:aspect-auto lg:h-[500px]">
          {mediaItem?.media_type === 'video' ? (
            <video
              src={mediaItem.media_url}
              className="w-full h-full object-cover lg:max-h-full"
              controls
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={mediaItem?.media_url}
              alt="Media Detail"
              className="w-full h-full object-cover lg:max-h-full"
            />
          )}

          {post.is_archived && (
            <span className="absolute top-4 left-4 bg-brand-500/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded shadow flex items-center gap-1 select-none">
              <Archive className="h-3.5 w-3.5" />
              Diarsipkan
            </span>
          )}
        </div>

        {/* Right Side: Interactive Action & Comment Panel */}
        <div className="w-full lg:w-[380px] flex flex-col border-t lg:border-t-0 lg:border-l border-surface-800/80">
          {/* Author Header */}
          <div className="px-4 py-3.5 border-b border-surface-800/60 flex items-center justify-between">
            <Link to={`/profile/${post.user?.username}`} className="flex items-center gap-3">
              <Avatar
                src={post.user?.avatar_url}
                name={post.user?.name ?? 'User'}
                size="sm"
              />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-neutral-100">
                  {post.user?.name}
                </span>
                <span className="text-[10px] text-neutral-400">
                  @{post.user?.username}
                </span>
              </div>
            </Link>
          </div>

          {/* Caption & Metadata */}
          <div className="p-4 border-b border-surface-800/40 text-left bg-surface-900/40">
            {post.caption && (
              <p className="text-xs text-neutral-200 leading-relaxed break-words">
                <Link to={`/profile/${post.user?.username}`} className="font-bold text-neutral-100 mr-1.5 hover:underline">
                  {post.user?.username}
                </Link>
                {post.caption}
              </p>
            )}
            <span className="text-[10px] text-neutral-500 block mt-2 uppercase tracking-wider select-none">
              {formatRelativeTime(post.created_at)}
            </span>
          </div>

          {/* Comments Panel */}
          <div className="flex-1 min-h-[250px] lg:min-h-0 bg-surface-900/20">
            <CommentSection
              postId={post.id}
              currentUserId={currentUser.id}
              postOwnerId={post.user_id}
              onCommentsCountChange={loadPost}
            />
          </div>

          {/* Lower Action Buttons Panel */}
          <div className="p-4 border-t border-surface-800 bg-surface-900/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-neutral-300">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLikeToggle}
                  className={`rounded-xl h-8 w-8 flex items-center justify-center transition-all duration-200 ${isLiked ? 'text-rose-500 hover:text-rose-600' : 'text-neutral-400 hover:text-neutral-200'}`}
                  aria-label="Suka"
                >
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-rose-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-xl h-8 w-8 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-all duration-200"
                  aria-label="Bagikan"
                >
                  <Share2 className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveToggle}
                className={`rounded-xl h-8 w-8 flex items-center justify-center transition-all duration-200 ${isSaved ? 'text-brand-400 hover:text-brand-500' : 'text-neutral-400 hover:text-neutral-200'}`}
                aria-label="Simpan"
              >
                <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-brand-400' : ''}`} />
              </button>
            </div>
            <p className="text-xs font-bold text-neutral-100 text-left select-none">
              {formatCount(likesCount)} suka
            </p>
          </div>
        </div>
      </div>

      {/* Owner Options Modal */}
      <Modal
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        title="Opsi Postingan"
        size="sm"
      >
        <div className="flex flex-col gap-1 -mx-2">
          <button
            onClick={() => { setShowOptions(false); setShowEditCaption(true); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-neutral-200 hover:bg-surface-800 rounded-xl transition-colors text-left"
            disabled={isActionLoading}
          >
            <Edit2 className="h-4 w-4 text-neutral-400" />
            Ubah Caption
          </button>
          
          <button
            onClick={handleArchiveToggle}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-neutral-200 hover:bg-surface-800 rounded-xl transition-colors text-left"
            disabled={isActionLoading}
          >
            <Archive className="h-4 w-4 text-neutral-400" />
            {post.is_archived ? 'Kembalikan dari Arsip' : 'Arsipkan Postingan'}
          </button>

          <div className="border-t border-surface-800 my-1" />

          <button
            onClick={handleDeletePost}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-danger-400 hover:bg-surface-800 rounded-xl transition-colors text-left"
            disabled={isActionLoading}
          >
            <Trash2 className="h-4 w-4 text-danger-500" />
            Hapus Postingan
          </button>
        </div>
      </Modal>

      {/* Edit Caption Modal */}
      <Modal
        isOpen={showEditCaption}
        onClose={() => setShowEditCaption(false)}
        title="Ubah Caption"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <textarea
            value={editCaptionText}
            onChange={e => setEditCaptionText(e.target.value)}
            placeholder="Tulis caption baru..."
            rows={4}
            className="w-full bg-surface-800 rounded-xl px-4 py-3 text-xs text-neutral-50 placeholder-neutral-500 border border-surface-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all resize-none"
            disabled={isActionLoading}
          />
          <div className="flex gap-2 border-t border-surface-800 pt-3">
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => setShowEditCaption(false)}
              disabled={isActionLoading}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              loading={isActionLoading}
              onClick={handleSaveCaptionEdit}
            >
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PostDetailPage;
