import apiClient from '../apiClient';
import type { Notification, NotificationType } from '../../types/index';

export const getNotifications = async (currentUserId: string): Promise<Notification[]> => {
  void currentUserId;
  const res = await apiClient.get('/notifications');
  return res.data;
};

export const markNotificationAsRead = async (notificationId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.post(`/notifications/${notificationId}/read`, {});
};

export const markAllNotificationsAsRead = async (currentUserId: string): Promise<void> => {
  void currentUserId;
  // Endpoint ini tidak ada di SRS ringkasan; implementasi sementara.
  await apiClient.post('/notifications/read-all', {});
};


export const createNotification = async (
  recipientId: string,
  actorId: string,
  type: NotificationType,
  referenceId?: string
): Promise<Notification | null> => {
  // Endpoint create notification tidak ada di SRS (biasanya server yang trigger).
  // Untuk menjaga kontrak frontend, panggil jika backend menyediakan.
  const res = await apiClient.post('/notifications', {
    recipient_id: recipientId,
    actor_id: actorId,
    type,
    reference_id: referenceId,
  });
  return res.data;
};

export const getUnreadNotificationsCount = async (currentUserId: string): Promise<number> => {
  // Kontrak tidak ada; sementara hitung dari list
  const list = await getNotifications(currentUserId);
  return list.filter(n => !n.is_read).length;
};

