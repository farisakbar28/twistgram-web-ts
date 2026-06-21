import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import type { Post } from '../../types/index';
import Avatar from './Avatar';
import { formatCount, formatRelativeTime } from '../../utils';
import { likePost, unlikePost, savePost, unsavePost, sharePost } from '../../services';
import { useToast } from './Toast';

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onPostUpdate?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId, onPostUpdate }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [isLiked, setIsLiked] = useState(post.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes_count ?? 0);
  const [isSaved, setIsSaved] = useState(post.is_saved ?? false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const lastTap = useRef<number | null>(null);

  const mediaItem = post.media?.[0];
  const postAuthor = post.user;

  // Handle Like/Unlike
  const handleLikeToggle = async () => {
    const nextLikedState = !isLiked;
    setIsLiked(nextLikedState);
    setLikesCount(prev => (nextLikedState ? prev + 1 : Math.max(0, prev - 1)));

    try {
      if (nextLikedState) {
        await likePost(post.id, currentUserId);
      } else {
        await unlikePost(post.id, currentUserId);
      }
      onPostUpdate?.();
    } catch {
      // Revert state on error
      setIsLiked(!nextLikedState);
      setLikesCount(prev => (nextLikedState ? Math.max(0, prev - 1) : prev + 1));
      toast.error('Gagal menyukai postingan.');
    }
  };

  // Double tap to like gesture
  const handleDoubleTap = async () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      if (!isLiked) {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        try {
          await likePost(post.id, currentUserId);
          onPostUpdate?.();
        } catch {
          setIsLiked(false);
          setLikesCount(prev => Math.max(0, prev - 1));
        }
      }
      // Show anim overlay
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 800);
    } else {
      lastTap.current = now;
    }
  };

  // Handle Save/Unsave
  const handleSaveToggle = async () => {
    const nextSavedState = !isSaved;
    setIsSaved(nextSavedState);

    try {
      if (nextSavedState) {
        await savePost(post.id, currentUserId);
        toast.success('Postingan berhasil disimpan ke koleksi.');
      } else {
        await unsavePost(post.id, currentUserId);
        toast.success('Postingan dihapus dari koleksi.');
      }
      onPostUpdate?.();
    } catch {
      setIsSaved(!nextSavedState);
      toast.error('Gagal menyimpan postingan.');
    }
  };

  // Handle Share
  const handleShare = async () => {
    try {
      const shareUrl = await sharePost(post.id, currentUserId);
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Tautan disalin ke papan klip!');
    } catch {
      toast.error('Gagal membagikan postingan.');
    }
  };

  // Render text caption with hashtag styling
  const renderCaption = (text?: string) => {
    if (!text) return null;
    const parts = text.split(/(\s+)/);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-brand-400 font-medium hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      if (part.startsWith('@')) {
        const username = part.replace(/[^a-zA-Z0-9_.]/g, '').substring(1);
        return (
          <Link key={index} to={`/profile/${username}`} className="text-brand-300 font-medium hover:underline">
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  return (
    <article className="w-full bg-surface-900 border border-surface-800/80 rounded-2xl overflow-hidden mb-4 shadow-card">
      {/* 1. Header (User Info) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/60">
        <Link to={`/profile/${postAuthor?.username}`} className="flex items-center gap-3 group">
          <Avatar
            src={postAuthor?.avatar_url}
            name={postAuthor?.name ?? 'Twistgram User'}
            size="sm"
            className="ring-1 ring-brand-500/10 group-hover:ring-brand-500/30 transition-all"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-100 group-hover:text-brand-400 transition-colors">
              {postAuthor?.name}
            </span>
            <span className="text-xs text-neutral-400">
              @{postAuthor?.username}
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => navigate(`/posts/${post.id}`)}
          className="text-neutral-500 hover:text-neutral-200 rounded-xl h-8 w-8 flex items-center justify-center transition-all duration-200"
          aria-label="Opsi postingan"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* 2. Media Display with Double-Tap Support */}
      <div
        className="relative aspect-square w-full bg-surface-950 overflow-hidden cursor-pointer select-none"
        onClick={handleDoubleTap}
      >
        {mediaItem?.media_type === 'video' ? (
          <video
            src={mediaItem.media_url}
            className="w-full h-full object-cover"
            controls
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={mediaItem?.media_url ?? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800'}
            alt="Media Postingan"
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            loading="lazy"
          />
        )}

        {/* Double-tap heart splash animation */}
        {showHeartOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] animate-fade-in pointer-events-none">
            <Heart className="h-20 w-20 text-rose-500 fill-rose-500 animate-scale-in" />
          </div>
        )}
      </div>

      {/* 3. Action Buttons Row */}
      <div className="flex items-center justify-between px-4 py-2 text-neutral-300">
        <div className="flex items-center gap-1.5">
          {/* Like */}
          <button
            type="button"
            onClick={handleLikeToggle}
            className={`rounded-xl h-8 w-8 flex items-center justify-center transition-all duration-200 ${isLiked ? 'text-rose-500 hover:text-rose-600' : 'text-neutral-400 hover:text-neutral-200'}`}
            aria-label="Suka"
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-rose-500' : ''}`} />
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={() => navigate(`/posts/${post.id}`)}
            className="rounded-xl h-8 w-8 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-all duration-200"
            aria-label="Komentar"
          >
            <MessageCircle className="h-5 w-5" />
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            className="rounded-xl h-8 w-8 flex items-center justify-center text-neutral-400 hover:text-neutral-200 transition-all duration-200"
            aria-label="Bagikan"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSaveToggle}
          className={`rounded-xl h-8 w-8 flex items-center justify-center transition-all duration-200 ${isSaved ? 'text-brand-400 hover:text-brand-500' : 'text-neutral-400 hover:text-neutral-200'}`}
          aria-label="Simpan"
        >
          <Bookmark className={`h-5 w-5 ${isSaved ? 'fill-brand-400' : ''}`} />
        </button>
      </div>

      {/* 4. Details / Caption Section */}
      <div className="px-4 pb-4 flex flex-col gap-1.5">
        {/* Likes Count */}
        <p className="text-sm font-bold text-neutral-100 select-none">
          {formatCount(likesCount)} suka
        </p>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-neutral-200 leading-relaxed">
            <Link to={`/profile/${postAuthor?.username}`} className="font-bold text-neutral-100 mr-2 hover:underline">
              {postAuthor?.username}
            </Link>
            {renderCaption(post.caption)}
          </p>
        )}

        {/* Comments Count Shortcut */}
        {post.comments_count !== undefined && post.comments_count > 0 && (
          <Link
            to={`/posts/${post.id}`}
            className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors mt-1 select-none"
          >
            Lihat semua {post.comments_count} komentar
          </Link>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-neutral-500 uppercase tracking-wide mt-1 select-none">
          {formatRelativeTime(post.created_at)}
        </p>
      </div>
    </article>
  );
};

export default PostCard;
