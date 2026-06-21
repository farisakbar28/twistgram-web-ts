/**
 * FollowRequestsPage — Daftar Permintaan Follow Masuk
 * Ref: SRS §4.2 (Privasi Akun) — GET /follow-requests
 *      Aksi: Approve (Setujui), Decline (Tolak)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import {
  getFollowRequests,
  approveFollowRequest,
  declineFollowRequest,
} from '../services';
import type { FollowRequest } from '../types/social';
import UserListItem from '../components/common/UserListItem';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../components/common/Toast';

const FollowRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Load follow requests
  const loadRequests = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const data = await getFollowRequests(currentUser.id);
      setRequests(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat permintaan follow.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Handlers
  const handleApprove = async (requestId: string, username: string) => {
    setActionLoadingId(requestId);
    try {
      await approveFollowRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success(`Berhasil menyetujui permintaan follow dari @${username}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyetujui permintaan.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (requestId: string, username: string) => {
    setActionLoadingId(requestId);
    try {
      await declineFollowRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success(`Menolak permintaan follow dari @${username}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menolak permintaan.');
    } finally {
      setActionLoadingId(null);
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
          <h1 className="text-sm font-bold text-neutral-100">Permintaan Follow</h1>
          <p className="text-xs text-neutral-400">Kelola siapa yang dapat mengikuti Anda</p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" className="text-brand-500" />
        </div>
      ) : requests.length === 0 ? (
        <div className="py-16 px-4">
          <EmptyState
            icon={<UserPlus className="h-10 w-10" />}
            title="Tidak ada permintaan follow"
            description="Ketika seseorang meminta untuk mengikuti akun privat Anda, permintaannya akan muncul di sini."
          />
        </div>
      ) : (
        <div className="py-2">
          {requests.map(request => (
            <UserListItem
              key={request.id}
              userId={request.from_user.id}
              name={request.from_user.name}
              username={request.from_user.username}
              bio={request.from_user.bio}
              avatarUrl={request.from_user.avatar_url}
              linkToProfile={true}
              actionSlot={
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="xs"
                    loading={actionLoadingId === request.id}
                    disabled={actionLoadingId !== null}
                    onClick={(e) => {
                      e.preventDefault();
                      handleApprove(request.id, request.from_user.username);
                    }}
                  >
                    Setujui
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    disabled={actionLoadingId !== null}
                    onClick={(e) => {
                      e.preventDefault();
                      handleDecline(request.id, request.from_user.username);
                    }}
                    className="text-neutral-400 hover:text-neutral-200 border-transparent hover:border-surface-600 bg-transparent hover:bg-surface-800"
                  >
                    Tolak
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowRequestsPage;
