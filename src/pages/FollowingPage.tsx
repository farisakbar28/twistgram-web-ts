/**
 * FollowingPage — Daftar Following Pengguna
 * Ref: SRS §4.3 (Follow System) — GET /users/:id/following
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import {
  getFollowing,
  followUser,
  unfollowUser,
  getProfileByUsername,
} from '../services';
import type { UserProfile } from '../types/social';
import UserListItem from '../components/common/UserListItem';
import FollowButton from '../components/common/FollowButton';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

const FollowingPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [following, setFollowing] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const profile = await getProfileByUsername(username, currentUser?.id ?? null);
      setTargetUserId(profile.id);
      const data = await getFollowing(profile.id, currentUser?.id ?? null);
      setFollowing(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat following.');
    } finally {
      setIsLoading(false);
    }
  }, [username, currentUser?.id, toast]);

  useEffect(() => { load(); }, [load]);

  const isOwnProfile = targetUserId === currentUser?.id;

  const handleFollow = async (targetId: string) => {
    if (!currentUser) return;
    try {
      await followUser(currentUser.id, targetId);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal follow.');
    }
  };

  const handleUnfollow = async (targetId: string) => {
    if (!currentUser) return;
    try {
      await unfollowUser(currentUser.id, targetId);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal unfollow.');
    }
  };

  return (
    <div className="max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-950/80 backdrop-blur-md border-b border-surface-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-neutral-400 hover:text-neutral-100 transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-sm font-bold text-neutral-100">@{username}</h1>
          <p className="text-xs text-neutral-400">Following</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-brand-500" />
        </div>
      ) : following.length === 0 ? (
        <div className="py-16 px-4">
          <EmptyState
            icon={<UserPlus className="h-10 w-10" />}
            title="Belum follow siapa pun"
            description={
              isOwnProfile
                ? 'Temukan orang-orang menarik untuk diikuti dan perluas jaringanmu!'
                : 'Pengguna ini belum mengikuti siapa pun.'
            }
            actionLabel={isOwnProfile ? 'Cari Pengguna' : undefined}
            onAction={isOwnProfile ? () => navigate('/search') : undefined}
          />
        </div>
      ) : (
        <div className="py-2">
          {following.map(user => (
            <UserListItem
              key={user.id}
              userId={user.id}
              name={user.name}
              username={user.username}
              bio={user.bio}
              avatarUrl={user.avatar_url}
              actionSlot={
                user.is_own_profile ? null : (
                  <FollowButton
                    followStatus={user.follow_status}
                    onFollow={() => handleFollow(user.id)}
                    onUnfollow={() => handleUnfollow(user.id)}
                    size="sm"
                  />
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowingPage;
