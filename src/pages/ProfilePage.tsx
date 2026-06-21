/**
 * ProfilePage — Halaman Profil Pengguna
 * Ref: SRS §4.1 (Profil), §4.2 (Privasi), §4.3 (Follow), §4.5 (Block/Report)
 *      Business Rules: SOC-01, SOC-02
 *
 * Fitur [MVP]:
 * - Tampilkan foto profil, nama, username, bio, jumlah following/followers/post
 * - Own profile: tombol Edit Profil, link ke Follow Requests (jika privat)
 * - Other profile: FollowButton, tombol More (Block, Report)
 * - SOC-01: akun privat → konten terkunci untuk non-follower
 * - Grid post placeholder (diisi di Fase 4)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Settings,
  MoreHorizontal,
  Lock,
  Grid3X3,
  UserX,
  Flag,
  ShieldOff,
  UserCog,
  Bell,
  Bookmark,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import {
  getProfileByUsername,
  followUser,
  unfollowUser,
  blockUser,
  reportContent,
} from '../services';
import {
  getUserPosts,
  getUserSavedPosts,
} from '../services';
import type { UserProfile } from '../types/social';
import type { ReportReason } from '../types/social';
import type { Post } from '../types/index';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import FollowButton from '../components/common/FollowButton';
import Spinner from '../components/common/Spinner';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';
import { formatCount } from '../utils';

// ============================================================
// Sub-components
// ============================================================

const StatItem: React.FC<{ label: string; value: number; to?: string }> = ({ label, value, to }) => {
  const content = (
    <div className="flex flex-col items-center gap-0.5 cursor-pointer group">
      <span className="text-lg font-bold text-neutral-100 group-hover:text-brand-400 transition-colors">
        {formatCount(value)}
      </span>
      <span className="text-xs text-neutral-400">{label}</span>
    </div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return content;
};

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Konten tidak pantas' },
  { value: 'harassment', label: 'Pelecehan / Intimidasi' },
  { value: 'fake_account', label: 'Akun palsu' },
  { value: 'other', label: 'Lainnya' },
];

// ============================================================
// Component
// ============================================================

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Post states
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [isPostsLoading, setIsPostsLoading] = useState(false);

  // Modal states
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason>('spam');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Load profile
  const loadProfile = useCallback(async () => {
    if (!username) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getProfileByUsername(username, currentUser?.id ?? null);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat profil.');
    } finally {
      setIsLoading(false);
    }
  }, [username, currentUser?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load user posts & saved posts
  useEffect(() => {
    if (!profile || !currentUser) return;
    const fetchUserData = async () => {
      setIsPostsLoading(true);
      try {
        const userPosts = await getUserPosts(profile.id, currentUser.id);
        setPosts(userPosts);
        if (profile.is_own_profile) {
          const saved = await getUserSavedPosts(currentUser.id);
          setSavedPosts(saved);
        }
      } catch (err) {
        console.error('Gagal memuat data postingan profil:', err);
      } finally {
        setIsPostsLoading(false);
      }
    };
    fetchUserData();
  }, [profile, currentUser]);

  // ============================================================
  // Handlers
  // ============================================================

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    try {
      await followUser(currentUser.id, profile.id);
      await loadProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal follow.');
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser || !profile) return;
    try {
      await unfollowUser(currentUser.id, profile.id);
      await loadProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal unfollow.');
    }
  };

  const handleBlock = async () => {
    if (!currentUser || !profile) return;
    setIsActionLoading(true);
    try {
      await blockUser(currentUser.id, profile.id);
      toast.success(`@${profile.username} berhasil diblokir.`);
      setShowBlockConfirm(false);
      navigate(-1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memblock.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReport = async () => {
    if (!currentUser || !profile) return;
    setIsActionLoading(true);
    try {
      await reportContent(currentUser.id, {
        target_type: 'user',
        target_id: profile.id,
        reason: selectedReason,
      });
      toast.success('Laporan berhasil dikirim. Tim moderasi akan meninjau.');
      setShowReportModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim laporan.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ============================================================
  // Render: loading & error states
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" className="text-brand-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <EmptyState
          icon={<UserX className="h-10 w-10" />}
          title="Profil tidak ditemukan"
          description={error || 'Pengguna ini tidak ada atau sudah menghapus akunnya.'}
          actionLabel="Kembali"
          onAction={() => navigate(-1)}
        />
      </div>
    );
  }

  const isPrivateAndLocked =
    profile.is_private &&
    !profile.is_own_profile &&
    profile.follow_status !== 'following';

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="max-w-2xl mx-auto w-full">
      {/* ── Profile Header ── */}
      <div className="px-4 pt-6 pb-4 flex flex-col gap-5">

        {/* Top row: Avatar + Stats */}
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar
              src={profile.avatar_url}
              name={profile.name}
              size="2xl"
              className="ring-2 ring-brand-500/30"
            />
            {profile.is_private && (
              <span className="absolute -bottom-1 -right-1 bg-surface-800 border border-surface-700 rounded-full p-0.5">
                <Lock className="h-3 w-3 text-neutral-400" />
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex-1 flex justify-around pt-2">
            <StatItem label="Post" value={profile.post_count} />
            <StatItem
              label="Followers"
              value={profile.follower_count}
              to={`/profile/${profile.username}/followers`}
            />
            <StatItem
              label="Following"
              value={profile.following_count}
              to={`/profile/${profile.username}/following`}
            />
          </div>
        </div>

        {/* Name, Username, Bio */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-neutral-100">{profile.name}</h1>
            {profile.is_private && (
              <span className="text-xs bg-surface-800 border border-surface-700 text-neutral-400 rounded-full px-2 py-0.5 flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                Privat
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400">@{profile.username}</p>
          {profile.bio && (
            <p className="text-sm text-neutral-300 leading-relaxed mt-1 whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          {/* Interests */}
          {profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {profile.interests.map(cat => (
                <span
                  key={cat}
                  className="text-xs bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full px-2.5 py-0.5"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {profile.is_own_profile ? (
            /* Own profile actions */
            <>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                leftIcon={<UserCog className="h-3.5 w-3.5" />}
                onClick={() => navigate('/profile/edit')}
              >
                Edit Profil
              </Button>
              {profile.is_private && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Bell className="h-3.5 w-3.5" />}
                  onClick={() => navigate('/follow-requests')}
                  className="shrink-0"
                >
                  Permintaan
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/showcase')}
                className="shrink-0 px-3"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          ) : (
            /* Other profile actions */
            <>
              <div className="flex-1">
                <FollowButton
                  followStatus={profile.follow_status}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  size="sm"
                  className="w-full"
                />
              </div>
              {profile.follow_status === 'following' && (
                <Button variant="secondary" size="sm" className="shrink-0">
                  Pesan
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreMenu(true)}
                className="shrink-0 px-2"
                aria-label="Opsi lainnya"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-surface-800 mx-4" />

      {/* ── Tab Bar (Grid Postingan dan Tersimpan jika profil sendiri) ── */}
      <div className="flex border-b border-surface-800 select-none">
        <button
          onClick={() => setActiveTab('posts')}
          className={[
            'flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors',
            activeTab === 'posts'
              ? 'text-neutral-100 border-b-2 border-brand-500'
              : 'text-neutral-500 hover:text-neutral-300',
          ].join(' ')}
        >
          <Grid3X3 className="h-4 w-4" />
          <span>Postingan</span>
        </button>
        {profile.is_own_profile && (
          <button
            onClick={() => setActiveTab('saved')}
            className={[
              'flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors',
              activeTab === 'saved'
                ? 'text-neutral-100 border-b-2 border-brand-500'
                : 'text-neutral-500 hover:text-neutral-300',
            ].join(' ')}
          >
            <Bookmark className="h-4 w-4" />
            <span>Tersimpan</span>
          </button>
        )}
      </div>

      {/* ── Post Grid / Locked State ── */}
      {isPrivateAndLocked ? (
        /* SOC-01: akun privat, bukan follower */
        <div className="flex flex-col items-center gap-4 py-16 px-6 text-center select-none">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-800 border border-surface-700">
            <Lock className="h-8 w-8 text-neutral-500" />
          </div>
          <div>
            <p className="text-base font-semibold text-neutral-300">Akun Privat</p>
            <p className="text-sm text-neutral-500 mt-1">
              Follow akun ini untuk melihat foto dan videonya.
            </p>
          </div>
          {profile.follow_status === 'pending' && (
            <span className="text-xs bg-surface-800 border border-surface-700 text-neutral-400 rounded-full px-3 py-1">
              Permintaan follow sedang menunggu persetujuan
            </span>
          )}
        </div>
      ) : isPostsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" className="text-brand-500" />
        </div>
      ) : (
        /* Post Grid Asli */
        <div>
          {activeTab === 'posts' ? (
            /* Tab Postingan */
            posts.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  icon={<Grid3X3 className="h-10 w-10" />}
                  title="Belum ada postingan"
                  description={
                    profile.is_own_profile
                      ? 'Mulai bagikan momen pertamamu!'
                      : 'Pengguna ini belum memposting apa pun.'
                  }
                  actionLabel={profile.is_own_profile ? 'Buat Postingan' : undefined}
                  onAction={profile.is_own_profile ? () => navigate('/posts/create') : undefined}
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                {posts.map(item => {
                  const media = item.media?.[0];
                  return (
                    <Link
                      key={item.id}
                      to={`/posts/${item.id}`}
                      className="relative aspect-square bg-surface-800 overflow-hidden group border border-surface-900"
                    >
                      {media?.media_type === 'video' ? (
                        <video
                          src={media.media_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={media?.media_url}
                          alt="Thumbnail Post"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}

                      {/* Video indicator icon in top right */}
                      {media?.media_type === 'video' && (
                        <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white pointer-events-none">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold text-xs select-none">
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-4 w-4 fill-white" />
                          {formatCount(item.likes_count ?? 0)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="h-4 w-4 fill-white" />
                          {formatCount(item.comments_count ?? 0)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          ) : (
            /* Tab Tersimpan */
            savedPosts.length === 0 ? (
              <div className="py-16">
                <EmptyState
                  icon={<Bookmark className="h-10 w-10" />}
                  title="Belum ada postingan disimpan"
                  description="Postingan yang Anda simpan akan muncul di sini."
                  actionLabel="Jelajahi Beranda"
                  onAction={() => navigate('/')}
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                {savedPosts.map(item => {
                  const media = item.media?.[0];
                  return (
                    <Link
                      key={item.id}
                      to={`/posts/${item.id}`}
                      className="relative aspect-square bg-surface-800 overflow-hidden group border border-surface-900"
                    >
                      {media?.media_type === 'video' ? (
                        <video
                          src={media.media_url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={media?.media_url}
                          alt="Thumbnail Saved Post"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}

                      {media?.media_type === 'video' && (
                        <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white pointer-events-none">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold text-xs select-none">
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-4 w-4 fill-white" />
                          {formatCount(item.likes_count ?? 0)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="h-4 w-4 fill-white" />
                          {formatCount(item.comments_count ?? 0)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ── More Menu Modal ── */}
      <Modal
        isOpen={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        title="Opsi"
        size="sm"
      >
        <div className="flex flex-col gap-1 -mx-2">
          <button
            onClick={() => { setShowMoreMenu(false); setShowReportModal(true); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-warning-400 hover:bg-surface-800 rounded-xl transition-colors text-left"
          >
            <Flag className="h-4 w-4" />
            Laporkan pengguna ini
          </button>
          <div className="border-t border-surface-800 my-1" />
          <button
            onClick={() => { setShowMoreMenu(false); setShowBlockConfirm(true); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-danger-400 hover:bg-surface-800 rounded-xl transition-colors text-left"
          >
            <ShieldOff className="h-4 w-4" />
            Blokir @{profile.username}
          </button>
        </div>
      </Modal>

      {/* ── Block Confirmation Modal ── */}
      <Modal
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        title={`Blokir @${profile.username}?`}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-400 leading-relaxed">
            Setelah diblokir, @{profile.username} tidak dapat melihat profil, postingan, atau mengirim pesan kepadamu. Relasi follow keduanya akan dihapus otomatis.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => setShowBlockConfirm(false)}
              disabled={isActionLoading}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="md"
              fullWidth
              loading={isActionLoading}
              onClick={handleBlock}
            >
              Blokir
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Report Modal ── */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="Laporkan Pengguna"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-400">Pilih alasan laporan:</p>
          <div className="flex flex-col gap-1">
            {REPORT_REASONS.map(r => (
              <button
                key={r.value}
                onClick={() => setSelectedReason(r.value)}
                className={[
                  'flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm transition-colors text-left',
                  selectedReason === r.value
                    ? 'bg-brand-500/10 border border-brand-500/30 text-brand-300'
                    : 'text-neutral-300 hover:bg-surface-800',
                ].join(' ')}
              >
                <span className={[
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                  selectedReason === r.value ? 'border-brand-500' : 'border-surface-600',
                ].join(' ')}>
                  {selectedReason === r.value && (
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                  )}
                </span>
                {r.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2 border-t border-surface-800">
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => setShowReportModal(false)}
              disabled={isActionLoading}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              loading={isActionLoading}
              onClick={handleReport}
            >
              Kirim Laporan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
