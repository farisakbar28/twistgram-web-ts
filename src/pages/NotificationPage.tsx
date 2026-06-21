import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services';
import {
  approveFollowRequest,
  declineFollowRequest,
} from '../services';
import type { Notification } from '../types/index';
import Avatar from '../components/common/Avatar';
import Spinner from '../components/common/Spinner';
import { useToast } from '../components/common/Toast';
import { Bell, Check, CheckCircle2, XCircle } from 'lucide-react';
import { formatRelativeTime } from '../utils';
import { Link, useNavigate } from 'react-router-dom';

// ============================================================
// Component
// ============================================================

const NotificationPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const fetchNotifs = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await getNotifications(currentUser.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  if (!currentUser) return null;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(currentUser.id);
      toast.success('Semua notifikasi ditandai sebagai terbaca.');
      fetchNotifs();
    } catch {
      toast.error('Gagal memperbarui notifikasi.');
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id, currentUser.id);
        fetchNotifs();
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Navigation logic based on type
    if (notif.type === 'like' || notif.type === 'comment') {
      if (notif.reference_id) {
        navigate(`/posts/${notif.reference_id}`);
      }
    } else if (notif.type === 'follow' || notif.type === 'follow_request') {
      if (notif.actor?.username) {
        navigate(`/profile/${notif.actor.username}`);
      }
    } else if (notif.type === 'story_reply') {
      navigate('/chat');
    }
  };

  // Follow request actions directly in notification card
  // Guard idempotency: mencegah handler ke-trigger 2x sehingga mock kedua membaca state yang sudah berubah.
  const processingNotificationIdsRef = React.useRef<Set<string>>(new Set());

  const handleFollowRequestAction = async (
    notificationId: string,
    requestId: string | undefined,
    action: 'approve' | 'decline'
  ) => {
    if (!requestId) {
      toast.error('Notifikasi permintaan follow tidak memiliki reference request yang valid.');
      return;
    }

    // Idempotency guard
    if (processingNotificationIdsRef.current.has(notificationId)) return;
    processingNotificationIdsRef.current.add(notificationId);

    // Simpan data original untuk kompensasi optimistic UI
    const original = notifications.find(n => n.id === notificationId);

    // Optimistic UI: hilangkan tombol/kartu secepat mungkin agar tidak terlihat masih pending
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    try {
      if (action === 'approve') {
        await approveFollowRequest(requestId);
        toast.success('Permintaan follow disetujui.');
      } else {
        await declineFollowRequest(requestId);
        toast.success('Permintaan follow ditolak.');
      }

      fetchNotifs();
    } catch (err: any) {
      // Jika gagal, kembalikan kartu agar user bisa retry
      if (original) {
        setNotifications(prev => {
          if (prev.some(n => n.id === notificationId)) return prev;
          return [original, ...prev];
        });
      }
      toast.error(err.message || 'Gagal memproses permintaan follow.');
    } finally {
      processingNotificationIdsRef.current.delete(notificationId);
    }
  };

  // Message builders
  const getNotificationText = (notif: Notification) => {
    const name = notif.actor?.name || 'Seseorang';
    switch (notif.type) {
      case 'like':
        return `${name} menyukai postingan Anda.`;
      case 'comment':
        return `${name} mengomentari postingan Anda.`;
      case 'follow':
        return `${name} mulai mengikuti Anda.`;
      case 'follow_request':
        return `${name} meminta untuk mengikuti Anda.`;
      case 'mention':
        return `${name} menyebut Anda dalam kiriman.`;
      case 'story_reply':
        return `${name} membalas cerita Anda.`;
      default:
        return `${name} melakukan tindakan terhadap akun Anda.`;
    }
  };

  const filteredNotifications =
    activeTab === 'all' ? notifications : notifications.filter(n => !n.is_read);

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-6 flex flex-col gap-6 text-left">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-surface-900 pb-3 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-brand-500/10 border border-brand-500/15 flex items-center justify-center text-brand-400">
            <Bell className="h-4.5 w-4.5 animate-pulse-glow" />
          </div>
          <h1 className="text-xl font-extrabold text-neutral-100">Notifikasi</h1>
        </div>

        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="text-[10px] text-brand-400 hover:text-brand-300 font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            Tandai semua terbaca
          </button>
        )}
      </div>

      {/* Tab filter switcher */}
      <div className="flex border-b border-surface-800 text-xs font-semibold select-none">
        <button
          onClick={() => setActiveTab('all')}
          className={[
            'flex-1 py-3 border-b-2 transition-all flex items-center justify-center gap-1.5',
            activeTab === 'all'
              ? 'border-brand-500 text-brand-400 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-400',
          ].join(' ')}
        >
          Semua
          <span className="px-1.5 py-0.5 rounded-full bg-surface-800 text-[8px] text-neutral-400 font-bold">
            {notifications.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={[
            'flex-1 py-3 border-b-2 transition-all flex items-center justify-center gap-1.5',
            activeTab === 'unread'
              ? 'border-brand-500 text-brand-400 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-400',
          ].join(' ')}
        >
          Belum Dibaca
          {notifications.some(n => !n.is_read) && (
            <span className="h-4 min-w-4 px-1 rounded-full bg-brand-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse">
              {notifications.filter(n => !n.is_read).length}
            </span>
          )}
        </button>
      </div>

      {/* Notifications list */}
      <div className="flex-1 min-h-[300px]">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="md" className="text-brand-500" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500 text-center select-none">
            <Bell className="h-10 w-10 text-neutral-600 mb-3" />
            <p className="text-sm font-semibold text-neutral-400">Tidak ada notifikasi</p>
            <p className="text-xs text-neutral-500 mt-1">
              {activeTab === 'all'
                ? 'Semua notifikasi aktivitas akun Anda akan muncul di sini.'
                : 'Tidak ada notifikasi baru yang belum dibaca.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredNotifications.map(notif => {
              if (!notif.actor) return null;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.type === 'follow_request') return;
                    handleNotificationClick(notif);
                  }}
                  className={[
                    'flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-900 border border-surface-800/80 rounded-xl transition-all cursor-pointer relative gap-3 group overflow-hidden',
                    !notif.is_read ? 'bg-brand-500/[0.02] border-brand-500/15 shadow-glow-sm' : '',
                  ].join(' ')}
                >
                  {/* Unread Glow Ribbon indicator */}
                  {!notif.is_read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
                  )}

                  <div className="flex items-center gap-3 overflow-hidden">
                    <Link
                      to={`/profile/${notif.actor.username}`}
                      onClick={e => e.stopPropagation()}
                      className="shrink-0"
                    >
                      <Avatar src={notif.actor.avatar_url} name={notif.actor.name} size="md" />
                    </Link>

                    <div className="flex flex-col text-left">
                      <p className="text-xs text-neutral-200 leading-normal">
                        {getNotificationText(notif)}
                      </p>
                      <span className="text-[9px] text-neutral-500 mt-1 select-none">
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Notification specific action row */}
                  {notif.type === 'follow_request' ? (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="flex gap-2 shrink-0 self-end sm:self-center"
                    >
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleFollowRequestAction(notif.id, notif.reference_id, 'approve');
                        }}
                        disabled={processingNotificationIdsRef.current.has(notif.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-gradient text-white text-[10px] font-bold rounded-lg hover:opacity-95 active:scale-95 transition-all shadow-glow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Setujui
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleFollowRequestAction(notif.id, notif.reference_id, 'decline');
                        }}
                        disabled={processingNotificationIdsRef.current.has(notif.id)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-surface-700 text-neutral-400 hover:text-neutral-200 text-[10px] font-bold rounded-lg active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Tolak
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-brand-400 group-hover:text-brand-300 font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity self-end sm:self-center mr-1 select-none">
                      Lihat
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
