import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Send, CornerDownRight, Trash2 } from 'lucide-react';
import type { Comment } from '../../types/index';
import Avatar from './Avatar';
import Spinner from './Spinner';
import { formatRelativeTime } from '../../utils';
import { getPostComments, createComment, deleteComment } from '../../services';
import { useToast } from './Toast';

interface CommentSectionProps {
  postId: string;
  currentUserId: string;
  postOwnerId: string;
  onCommentsCountChange?: () => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  currentUserId,
  postOwnerId,
  onCommentsCountChange,
}) => {
  const toast = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; username: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPostComments(postId, currentUserId);
      setComments(data);
    } catch {
      toast.error('Gagal memuat komentar.');
    } finally {
      setIsLoading(false);
    }
  }, [postId, currentUserId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Submit comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment(postId, currentUserId, {
        content: text.trim(),
        parentCommentId: replyTarget?.id,
      });
      setText('');
      setReplyTarget(null);
      await load();
      onCommentsCountChange?.();
      toast.success('Komentar berhasil ditambahkan.');
    } catch {
      toast.error('Gagal menambahkan komentar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Hapus komentar ini?')) return;
    try {
      await deleteComment(commentId, currentUserId);
      await load();
      onCommentsCountChange?.();
      toast.success('Komentar berhasil dihapus.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus komentar.');
    }
  };

  const startReply = (commentId: string, username: string) => {
    setReplyTarget({ id: commentId, username });
    // Focus input
    const input = document.getElementById('comment-input');
    if (input) input.focus();
  };

  // Render individual comment item
  const renderCommentItem = (item: Comment, isReply = false) => {
    const isAuthor = item.user_id === currentUserId;
    const isPostOwner = postOwnerId === currentUserId;
    const canDelete = isAuthor || isPostOwner;

    return (
      <div key={item.id} className={`flex gap-3 text-left ${isReply ? 'mt-3 pl-8' : 'mt-4 border-b border-surface-800/40 pb-4'}`}>
        {isReply && <CornerDownRight className="h-4 w-4 text-neutral-600 mt-1 shrink-0" />}
        <Link to={`/profile/${item.user?.username}`} className="shrink-0">
          <Avatar
            src={item.user?.avatar_url}
            name={item.user?.name ?? 'User'}
            size="xs"
            className="ring-1 ring-brand-500/5"
          />
        </Link>
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <Link to={`/profile/${item.user?.username}`} className="text-xs font-bold text-neutral-100 hover:underline">
              {item.user?.username}
            </Link>
            {item.user_id === postOwnerId && (
              <span className="text-[9px] bg-brand-500/10 border border-brand-500/20 text-brand-400 font-semibold px-1 rounded">
                Pembuat
              </span>
            )}
            <span className="text-[10px] text-neutral-500">
              {formatRelativeTime(item.created_at)}
            </span>
          </div>

          {/* Body */}
          <p className="text-xs text-neutral-200 mt-1 leading-relaxed break-words pr-2">
            {item.content}
          </p>

          {/* Footer Actions */}
          <div className="flex items-center gap-3 mt-1.5 select-none">
            {!isReply && (
              <button
                onClick={() => startReply(item.id, item.user?.username ?? '')}
                className="text-[10px] font-semibold text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Balas
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => handleDelete(item.id)}
                className="text-[10px] font-semibold text-danger-400 hover:text-danger-300 transition-colors flex items-center gap-0.5"
              >
                <Trash2 className="h-3 w-3" />
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface-900 border border-surface-800 rounded-2xl p-4 shadow-card">
      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 border-b border-surface-800 pb-2 select-none">
        Komentar ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0)})
      </h4>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" className="text-brand-500" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-neutral-500 py-12 text-center select-none">
            Belum ada komentar. Jadilah yang pertama berkomentar!
          </p>
        ) : (
          <div className="flex flex-col">
            {comments.map(c => (
              <div key={c.id}>
                {renderCommentItem(c, false)}
                {c.replies && c.replies.map(reply => renderCommentItem(reply, true))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="mt-4 pt-3 border-t border-surface-800">
        {/* Reply Tag Indicator */}
        {replyTarget && (
          <div className="flex items-center justify-between text-xs text-brand-400 bg-brand-500/5 border border-brand-500/10 rounded-lg px-2.5 py-1 mb-2">
            <span>Membalas <strong>@{replyTarget.username}</strong></span>
            <button
              type="button"
              onClick={() => setReplyTarget(null)}
              className="text-[10px] text-neutral-400 hover:text-neutral-200 uppercase font-semibold"
            >
              Batal
            </button>
          </div>
        )}

        <div className="relative flex items-center">
          <input
            id="comment-input"
            type="text"
            placeholder={replyTarget ? `Balas @${replyTarget.username}...` : 'Tulis komentar baru...'}
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-surface-800 rounded-xl pl-4 pr-12 py-2.5 text-xs text-neutral-50 placeholder-neutral-500 border border-surface-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
            required
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!text.trim() || isSubmitting}
            className="absolute right-2.5 text-brand-400 hover:text-brand-300 disabled:text-neutral-600 disabled:cursor-not-allowed transition-colors"
            title="Kirim"
          >
            {isSubmitting ? (
              <Spinner size="xs" />
            ) : (
              <Send className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;
