import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { deleteStory, markStoryViewed, startConversation, sendMessage } from '../../services';
import type { StoryGroup } from '../../services';
import { StoryViewersModal } from './StoryViewersModal';
import { useToast } from '../../components/common/Toast';
import { ChevronLeft, ChevronRight, Trash2, Eye, Send, X, Play, Pause } from 'lucide-react';
import { formatRelativeTime } from '../../utils';
import Avatar from '../../components/common/Avatar';

// ============================================================
// Types
// ============================================================

interface StoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  storyGroups: StoryGroup[];
  initialGroupIndex: number;
  onStoryDeleted: () => void;
}

const STORY_DURATION = 5000; // 5 seconds per story
const PROGRESS_INTERVAL = 50; // Update progress every 50ms

// ============================================================
// Component
// ============================================================

export const StoryViewer: React.FC<StoryViewerProps> = ({
  isOpen,
  onClose,
  storyGroups,
  initialGroupIndex,
  onStoryDeleted,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isViewersOpen, setIsViewersOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // Get active group and active story
  const activeGroup = storyGroups[groupIndex];
  const activeStory = activeGroup?.stories[storyIndex];

  // Sync initialGroupIndex when it changes
  useEffect(() => {
    setGroupIndex(initialGroupIndex);
    setStoryIndex(0);
    setProgress(0);
  }, [initialGroupIndex, isOpen]);

  // Mark story as viewed when active story changes
  useEffect(() => {
    if (isOpen && currentUser && activeStory) {
      markStoryViewed(activeStory.id, currentUser.id).catch(console.error);
    }
  }, [activeStory, currentUser, isOpen]);

  // Reset progress and handle timer
  useEffect(() => {
    setProgress(0);
  }, [groupIndex, storyIndex]);

  // Timer loop for auto-progress
  useEffect(() => {
    if (!isOpen || isPaused || isViewersOpen || !activeStory) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + (100 / (STORY_DURATION / PROGRESS_INTERVAL));
      });
    }, PROGRESS_INTERVAL);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, isViewersOpen, groupIndex, storyIndex, activeStory]);

  if (!isOpen || !activeGroup || !activeStory) return null;

  const handlePrevStory = () => {
    if (storyIndex > 0) {
      // Go to previous story in same group
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      // Go to last story of previous group
      const prevGroup = storyGroups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  };

  const handleNextStory = () => {
    if (storyIndex < activeGroup.stories.length - 1) {
      // Go to next story in same group
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < storyGroups.length - 1) {
      // Go to first story of next group
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      // End of all stories, close viewer
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !activeStory) return;
    if (!window.confirm('Hapus cerita ini secara permanen?')) return;

    try {
      await deleteStory(activeStory.id, currentUser.id);
      toast.success('Cerita berhasil dihapus.');
      onStoryDeleted();

      // Handle next slide after deletion
      if (activeGroup.stories.length === 1) {
        // If it was the only story in the group, close or go to next group
        if (storyGroups.length === 1) {
          onClose();
        } else if (groupIndex < storyGroups.length - 1) {
          setGroupIndex(groupIndex); // will trigger reload
          setStoryIndex(0);
        } else {
          onClose();
        }
      } else {
        // If there are other stories in the group
        if (storyIndex >= activeGroup.stories.length - 1) {
          setStoryIndex(storyIndex - 1);
        } else {
          // Stay on same index, the next one will shift down
          setProgress(0);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus cerita.');
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeStory || !replyText.trim()) return;
    if (activeStory.user_id === currentUser.id) return;

    setIsReplying(true);
    try {
      const conversation = await startConversation(currentUser.id, activeStory.user_id);
      await sendMessage(conversation.id, currentUser.id, {
        content: replyText.trim(),
        replyToStoryId: activeStory.id,
      });

      setReplyText('');
      setIsPaused(false);
      onClose();
      toast.success('Balasan cerita terkirim sebagai pesan langsung.');
      navigate('/chat', {
        state: { conversationId: conversation.id },
      });
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim balasan cerita.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleMouseDown = () => {
    // Only pause on hold if modals are not open
    if (!isViewersOpen) {
      setIsPaused(true);
    }
  };

  const handleMouseUp = () => {
    setIsPaused(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-0 sm:p-4 select-none"
      role="dialog"
      aria-modal="true"
    >
      {/* Background close click */}
      <div className="absolute inset-0 z-0" onClick={onClose} />

      {/* Main Container */}
      <div className="relative w-full max-w-md h-full sm:h-[85vh] sm:max-h-[800px] bg-neutral-950 sm:rounded-2xl border border-surface-900 overflow-hidden flex flex-col z-10 shadow-2xl">
        
        {/* Segmented Progress Bars */}
        <div className="absolute top-3 left-4 right-4 z-30 flex gap-1.5">
          {activeGroup.stories.map((story, idx) => {
            let fillWidth = '0%';
            if (idx < storyIndex) fillWidth = '100%';
            if (idx === storyIndex) fillWidth = `${progress}%`;

            return (
              <div key={story.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ width: fillWidth }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Header Row */}
        <div className="absolute top-6 left-4 right-4 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar
              src={activeGroup.user.avatar_url}
              name={activeGroup.user.name}
              size="sm"
              className="ring-1 ring-white/20"
            />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white leading-tight">
                {activeGroup.user.name}
              </span>
              <span className="text-[10px] text-white/60">
                {formatRelativeTime(activeStory.created_at)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white">
            {/* Pause/Play toggle */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={isPaused ? 'Putar' : 'Jeda'}
            >
              {isPaused ? <Play className="h-4.5 w-4.5" /> : <Pause className="h-4.5 w-4.5" />}
            </button>

            {/* Delete button (owner only) */}
            {currentUser && activeStory.user_id === currentUser.id && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg hover:bg-danger-500/20 hover:text-danger-400 transition-colors"
                title="Hapus Cerita"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Tutup"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Overlays (Invisible click areas for tap-navigation) */}
        <div className="absolute top-20 bottom-20 left-0 w-1/4 z-20 cursor-pointer" onClick={handlePrevStory} />
        <div className="absolute top-20 bottom-20 right-0 w-1/4 z-20 cursor-pointer" onClick={handleNextStory} />

        {/* Slide Content */}
        <div
          className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
        >
          {activeStory.media_type === 'text' ? (
            <div className={['w-full h-full flex items-center justify-center px-8 text-center text-white text-xl font-bold break-words', activeStory.media_url || 'bg-gradient-to-br from-purple-600 to-blue-700'].join(' ')}>
              {activeStory.text_content}
            </div>
          ) : activeStory.media_type === 'video' ? (
            <video
              src={activeStory.media_url}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              loop
            />
          ) : (
            <img
              src={activeStory.media_url}
              alt="Story Content"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Footer Interaction */}
        <div className="p-4 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col gap-2">
          {currentUser && activeStory.user_id === currentUser.id ? (
            // Owner view - Show viewer count
            <button
              onClick={() => {
                setIsPaused(true);
                setIsViewersOpen(true);
              }}
              className="flex items-center gap-2 self-start bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-semibold text-white hover:bg-white/15 transition-all active:scale-95"
            >
              <Eye className="h-4 w-4" />
              <span>Dilihat {activeStory.views_count || 0} orang</span>
            </button>
          ) : (
            // Guest view - Reply input
            <form onSubmit={handleReplySubmit} className="flex gap-2 w-full">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                placeholder={`Balas ke @${activeGroup.user.username}...`}
                className="flex-1 bg-white/10 border border-white/10 focus:border-white/30 rounded-xl px-4 py-3 text-xs text-white placeholder-white/50 focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isReplying || !replyText.trim()}
                className="h-10 w-10 flex items-center justify-center bg-white text-neutral-900 rounded-xl font-semibold hover:bg-neutral-100 disabled:opacity-50 transition-all cursor-pointer shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Navigation Buttons (Desktop only sides) */}
      <button
        onClick={handlePrevStory}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-30 h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/10 hover:bg-white/20 hover:scale-105 transition-all"
        aria-label="Cerita sebelumnya"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={handleNextStory}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-30 h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/10 hover:bg-white/20 hover:scale-105 transition-all"
        aria-label="Cerita berikutnya"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Story Viewers Modal (only if owner) */}
      {isViewersOpen && activeStory && (
        <StoryViewersModal
          isOpen={isViewersOpen}
          onClose={() => {
            setIsViewersOpen(false);
            setIsPaused(false);
          }}
          storyId={activeStory.id}
        />
      )}
    </div>
  );
};
