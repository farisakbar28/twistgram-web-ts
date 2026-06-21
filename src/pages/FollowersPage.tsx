/**
 * FollowersPage — Daftar Followers Pengguna
 * Ref: SRS §4.3 (Follow System) — GET /users/:id/followers
 *      Business Rule: pemilik akun dapat menghapus follower (Remove Follower)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import {
  getFollowers,
  removeFollower,
  followUser,
  unfollowUser,
  getProfileByUsername,
} from '../services';
import type { UserProfile } from '../types/social';
import UserListItem from '../components/common/UserListItem';
import FollowButton from '../components/common/FollowButton';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

const FollowersPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  // Load
  const load = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const profile = await getProfileByUsername(username, currentUser?.id ?? null);
      setTargetUserId(profile.id);
      const data = await getFollowers(profile.id, currentUser?.id ?? null);
      setFollowers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat followers.');
    } finally {
      setIsLoading(false);
    }
  }, [username, currentUser?.id, toast]);

  useEffect(() => { load(); }, [load]);

  const isOwnProfile = targetUserId === currentUser?.id;

  // ============================================================
  // Handlers
  // ============================================================

  const handleRemove = async (followerUserId: string, followerUsername: string) => {
    if (!currentUser || !targetUserId) return;
    try {
      await removeFollower(currentUser.id, followerUserId);
      setFollowers(prev => prev.filter(u => u.id !== followerUserId));
      toast.success(`@${followerUsername} dihapus dari daftar follower.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus follower.');
    }
  };

  const handleFollow = async (targetId: string) => {
    if (!currentUser) return;
    await followUser(currentUser.id, targetId);
    load();
  };

  const handleUnfollow = async (targetId: string) => {
    if (!currentUser) return;
    await unfollowUser(currentUser.id, targetId);
    load();
  };

  // ============================================================
  // Render
  // ============================================================

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
          <p className="text-xs text-neutral-400">Followers</p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-brand-500" />
        </div>
      ) : followers.length === 0 ? (
        <div className="py-16 px-4">
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="Belum ada followers"
            description={
              isOwnProfile
                ? 'Belum ada yang mengikutimu. Bagikan profilmu untuk mulai terhubung!'
                : 'Pengguna ini belum memiliki follower.'
            }
          />
        </div>
      ) : (
        <div className="py-2">
          {followers.map(user => (
            <UserListItem
              key={user.id}
              userId={user.id}
              name={user.name}
              username={user.username}
              bio={user.bio}
              avatarUrl={user.avatar_url}
              actionSlot={
                isOwnProfile ? (
                  /* Pemilik akun: tombol "Hapus" */
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove(user.id, user.username);
                    }}
                    className="text-danger-400 hover:text-danger-300"
                  >
                    Hapus
                  </Button>
                ) : user.is_own_profile ? null : (
                  /* Bukan milik sendiri: FollowButton normal */
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

export default FollowersPage;
