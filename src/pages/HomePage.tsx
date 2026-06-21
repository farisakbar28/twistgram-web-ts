import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import {
  getFeed,
  getProfileByUsername,
  followUser,
  unfollowUser,
} from '../services';

import type { Post } from '../types/index';
import type { UserProfile } from '../types/social';
import PostCard from '../components/common/PostCard';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import Avatar from '../components/common/Avatar';
import FollowButton from '../components/common/FollowButton';
import { Link } from 'react-router-dom';
import { Sparkles, Users } from 'lucide-react';

// Stories
import { StoriesBar } from '../features/story/StoriesBar';
import { StoryViewer } from '../features/story/StoryViewer';
import { CreateStoryModal } from '../features/story/CreateStoryModal';
import type { StoryGroup } from '../services';

const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Suggestions list
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);

  // Stories States
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [viewerStoryGroups, setViewerStoryGroups] = useState<StoryGroup[]>([]);
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState(0);
  const [storyRefreshTrigger, setStoryRefreshTrigger] = useState(0);

  // Fetch feed posts
  const fetchFeed = useCallback(async () => {
    if (!currentUser) return;
    try {
      const feedPosts = await getFeed(currentUser.id);
      setPosts(feedPosts);
    } catch (err) {
      console.error('Gagal memuat feed postingan:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Load suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const usersToFetch = ['claraclarissa', 'andiwirawan', 'budisantoso'];
      const data: UserProfile[] = [];
      for (const username of usersToFetch) {
        if (username !== currentUser.username) {
          try {
            const p = await getProfileByUsername(username, currentUser.id);
            if (p.follow_status === 'not_following') {
              data.push(p);
            }
          } catch {
            // ignore
          }
        }
      }
      setSuggestedUsers(data.slice(0, 3));
    } catch {
      // ignore
    }
  }, [currentUser]);

  const handleSuggestionFollow = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;
      try {
        await followUser(currentUser.id, targetUserId);
        // refresh UI agar follow_status/tombol konsisten dengan state mock server
        await fetchSuggestions();
      } catch {
        // ignore (error handling handled in FollowButton if needed later)
      }
    },
    [currentUser, fetchSuggestions]
  );

  const handleSuggestionUnfollow = useCallback(
    async (targetUserId: string) => {
      if (!currentUser) return;
      try {
        await unfollowUser(currentUser.id, targetUserId);
        await fetchSuggestions();
      } catch {
        // ignore
      }
    },
    [currentUser, fetchSuggestions]
  );

  useEffect(() => {
    if (currentUser) {
      fetchFeed();
      fetchSuggestions();
    }
  }, [currentUser, fetchFeed, fetchSuggestions]);

  if (!currentUser) return null;

  const handleSelectStoryGroup = (groups: StoryGroup[], index: number) => {
    setViewerStoryGroups(groups);
    setActiveStoryGroupIndex(index);
    setIsStoryViewerOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-6 flex gap-6 items-start">
      {/* Feed Column */}
      <div className="flex-1 max-w-lg mx-auto flex flex-col">
        {/* Dynamic Stories Bar */}
        <StoriesBar
          onSelectStoryGroup={handleSelectStoryGroup}
          onOpenCreateStory={() => setIsCreateStoryOpen(true)}
          refreshTrigger={storyRefreshTrigger}
        />

        {/* Feed Posts */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" className="text-brand-500" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="Feed Anda Kosong"
            description="Ikuti pengguna lain atau pilih minat baru untuk melihat postingan di beranda Anda."
            actionLabel="Cari Teman"
            onAction={() => (window.location.pathname = '/search')}
          />
        ) : (
          <div className="flex flex-col">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser.id}
                onPostUpdate={fetchFeed}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Column (Desktop Only Sidebar Suggestions) */}
      <div className="hidden lg:flex flex-col w-72 shrink-0 sticky top-20 gap-6">
        {/* User profile summary */}
        <div className="flex items-center justify-between">
          <Link to={`/profile/${currentUser.username}`} className="flex items-center gap-3 group">
            <Avatar
              src={currentUser.avatar_url}
              name={currentUser.name}
              size="md"
              className="ring-1 ring-brand-500/10 group-hover:ring-brand-500/30 transition-all"
            />
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-neutral-100 group-hover:text-brand-400 transition-colors">
                {currentUser.name}
              </span>
              <span className="text-xs text-neutral-400">@{currentUser.username}</span>
            </div>
          </Link>
          <span className="text-xs text-brand-400 font-semibold cursor-pointer hover:text-brand-300">
            Profil
          </span>
        </div>

        {/* Suggestions Title */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-surface-900 pb-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              Saran Untuk Anda
            </span>
            <Link
              to="/search"
              className="text-[10px] text-neutral-500 hover:text-neutral-300 font-semibold uppercase"
            >
              Cari Semua
            </Link>
          </div>

          {/* Suggestions List */}
          {suggestedUsers.length === 0 ? (
            <span className="text-xs text-neutral-500 select-none">Tidak ada saran baru</span>
          ) : (
            <div className="flex flex-col gap-3.5">
              {suggestedUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between">
                  <Link
                    to={`/profile/${user.username}`}
                    className="flex items-center gap-2.5 group"
                  >
                    <Avatar src={user.avatar_url} name={user.name} size="sm" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-neutral-100 group-hover:text-brand-400 transition-colors truncate max-w-[120px]">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-neutral-500 truncate max-w-[120px]">
                        @{user.username}
                      </span>
                    </div>
                  </Link>

                  {user.is_own_profile ? null : (
                    <FollowButton
                      followStatus={user.follow_status}
                      size="sm"
                      onFollow={() => handleSuggestionFollow(user.id)}
                      onUnfollow={() => handleSuggestionUnfollow(user.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini footer */}
        <footer className="text-[10px] text-neutral-600 flex flex-col gap-1 text-left select-none">
          <p>© 2026 TWISTGRAM FROM GOOGLE DEEPMIND</p>
          <p className="mt-1">
            Dibuat sebagai implementasi frontend media sosial berkualitas tinggi.
          </p>
        </footer>
      </div>

      {/* Story Modals */}
      {isCreateStoryOpen && (
        <CreateStoryModal
          isOpen={isCreateStoryOpen}
          onClose={() => setIsCreateStoryOpen(false)}
          onStoryCreated={() => setStoryRefreshTrigger(prev => prev + 1)}
        />
      )}

      {isStoryViewerOpen && (
        <StoryViewer
          isOpen={isStoryViewerOpen}
          onClose={() => setIsStoryViewerOpen(false)}
          storyGroups={viewerStoryGroups}
          initialGroupIndex={activeStoryGroupIndex}
          onStoryDeleted={() => setStoryRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
};

export default HomePage;
