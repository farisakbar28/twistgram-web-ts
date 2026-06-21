import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getStoryFeed } from '../../services';
import type { StoryGroup } from '../../services';
import Avatar from '../../components/common/Avatar';
import Spinner from '../../components/common/Spinner';
import { Plus } from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface StoriesBarProps {
  onSelectStoryGroup: (groups: StoryGroup[], index: number) => void;
  onOpenCreateStory: () => void;
  refreshTrigger: number;
}

// ============================================================
// Component
// ============================================================

export const StoriesBar: React.FC<StoriesBarProps> = ({
  onSelectStoryGroup,
  onOpenCreateStory,
  refreshTrigger,
}) => {
  const { currentUser } = useAuth();
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStories = useCallback(async () => {
    if (!currentUser) return;
    try {
      const feed = await getStoryFeed(currentUser.id);
      setStoryGroups(feed);
    } catch (err) {
      console.error('Gagal mengambil feed story:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories, refreshTrigger]);

  if (!currentUser) return null;

  // Check if currentUser has own active stories
  const ownGroupIndex = storyGroups.findIndex(g => g.user.id === currentUser.id);
  const ownGroup = ownGroupIndex !== -1 ? storyGroups[ownGroupIndex] : null;
  const hasOwnStories = ownGroup && ownGroup.stories.length > 0;

  const handleOwnClick = (e: React.MouseEvent) => {
    // If clicking the small plus icon, or if they don't have stories, open create
    const target = e.target as HTMLElement;
    const isPlusClick = target.closest('.plus-button-overlay');
    
    if (isPlusClick || !hasOwnStories) {
      onOpenCreateStory();
    } else {
      onSelectStoryGroup(storyGroups, ownGroupIndex);
    }
  };

  return (
    <div className="w-full bg-surface-900 border border-surface-800/80 rounded-2xl p-4 mb-4 flex items-center gap-4 overflow-x-auto scrollbar-none select-none">
      {isLoading ? (
        <div className="flex items-center justify-center py-2 px-4 w-full">
          <Spinner size="sm" className="text-brand-500 mr-2" />
          <span className="text-xs text-neutral-400 font-medium">Memuat cerita...</span>
        </div>
      ) : (
        <>
          {/* Cerita Anda Bubble */}
          <div className="flex flex-col items-center shrink-0 cursor-pointer group select-none">
            <div
              onClick={handleOwnClick}
              className={[
                'w-14 h-14 rounded-full p-[2px] transition-all flex items-center justify-center relative',
                hasOwnStories
                  ? ownGroup?.hasUnviewed
                    ? 'bg-gradient-to-tr from-brand-500 to-accent-400'
                    : 'border border-surface-700/80'
                  : 'bg-surface-800 border border-surface-700 group-hover:border-neutral-500'
              ].join(' ')}
            >
              <div className="w-full h-full bg-surface-950 rounded-full p-[2px] flex items-center justify-center overflow-hidden">
                <Avatar name={currentUser.name} size="md" src={currentUser.avatar_url} />
              </div>
              
              {/* Plus Button Overlay */}
              {(!hasOwnStories || ownGroup) && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCreateStory();
                  }}
                  className="plus-button-overlay absolute bottom-0 right-0 w-4 h-4 bg-brand-500 hover:bg-brand-600 rounded-full border-2 border-surface-900 flex items-center justify-center text-white transition-colors"
                  title="Tambah Cerita"
                >
                  <Plus className="h-2.5 w-2.5 stroke-[4px]" />
                </div>
              )}
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 truncate max-w-[60px]">Cerita Anda</span>
          </div>

          {/* Followings Stories Bubbles */}
          {storyGroups.map((group, idx) => {
            // Skip own stories since we rendered it first
            if (group.user.id === currentUser.id) return null;

            return (
              <div
                key={group.user.id}
                onClick={() => onSelectStoryGroup(storyGroups, idx)}
                className="flex flex-col items-center shrink-0 cursor-pointer group"
              >
                <div
                  className={[
                    'w-14 h-14 rounded-full p-[2px] transition-all flex items-center justify-center',
                    group.hasUnviewed
                      ? 'bg-gradient-to-tr from-brand-500 to-accent-400 shadow-glow-sm group-hover:scale-[1.03]'
                      : 'border border-surface-700/80 group-hover:border-surface-600'
                  ].join(' ')}
                >
                  <div className="w-full h-full bg-surface-950 rounded-full p-[2px] flex items-center justify-center overflow-hidden">
                    <Avatar name={group.user.name} size="md" src={group.user.avatar_url} />
                  </div>
                </div>
                <span className="text-[10px] text-neutral-400 mt-1 truncate max-w-[62px]">
                  {group.user.username}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
export default StoriesBar;
