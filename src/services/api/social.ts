import apiClient from '../apiClient';
import type {
  UserProfile,
  Follow,
  FollowRequest,
  UpdateProfilePayload,
  UpdatePrivacyPayload,
  ReportPayload,
} from '../../types/social';

export const getMyProfile = async (currentUserId: string): Promise<UserProfile> => {
  void currentUserId;
  const res = await apiClient.get('/users/me');
  return res.data;
};

export const getProfileByUsername = async (
  username: string,
  _currentUserId: string | null
): Promise<UserProfile> => {
  const res = await apiClient.get(`/users/${encodeURIComponent(username)}`);
  return res.data;
};

export const updateProfile = async (
  currentUserId: string,
  payload: UpdateProfilePayload
): Promise<any> => {
  void currentUserId;
  const res = await apiClient.patch('/users/me', payload);
  return res.data;
};

export const updatePrivacy = async (
  currentUserId: string,
  payload: UpdatePrivacyPayload
): Promise<void> => {
  void currentUserId;
  await apiClient.patch('/users/me/privacy', payload);
};

export const getInterests = async (currentUserId: string): Promise<string[]> => {
  void currentUserId;
  const res = await apiClient.get('/users/me/interests');
  return res.data.categories ?? res.data;
};

export const updateInterests = async (currentUserId: string, categories: string[]): Promise<void> => {
  void currentUserId;
  await apiClient.put('/users/me/interests', { categories });
};

export const followUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<Follow> => {
  void currentUserId;
  const res = await apiClient.post(`/users/${targetUserId}/follow`, {});
  return res.data;
};

export const unfollowUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  void currentUserId;
  await apiClient.delete(`/users/${targetUserId}/follow`);
};

export const getFollowers = async (
  targetUserId: string,
  currentUserId: string | null
): Promise<UserProfile[]> => {
  void currentUserId;
  const res = await apiClient.get(`/users/${targetUserId}/followers`);
  return res.data;
};

export const getFollowing = async (
  targetUserId: string,
  currentUserId: string | null
): Promise<UserProfile[]> => {
  void currentUserId;
  const res = await apiClient.get(`/users/${targetUserId}/following`);
  return res.data;
};

export const removeFollower = async (
  currentUserId: string,
  followerUserId: string
): Promise<void> => {
  void currentUserId;
  await apiClient.delete(`/users/me/followers/${followerUserId}`);
};

export const getFollowRequests = async (currentUserId: string): Promise<FollowRequest[]> => {
  void currentUserId;
  const res = await apiClient.get('/follow-requests');
  return res.data;
};

export const approveFollowRequest = async (requestId: string): Promise<void> => {
  await apiClient.post(`/follow-requests/${requestId}/approve`, {});
};

export const declineFollowRequest = async (requestId: string): Promise<void> => {
  await apiClient.post(`/follow-requests/${requestId}/decline`, {});
};

export const blockUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  void currentUserId;
  await apiClient.post(`/users/${targetUserId}/block`, {});
};

export const unblockUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<void> => {
  void currentUserId;
  await apiClient.delete(`/users/${targetUserId}/block`);
};

export const reportContent = async (
  _currentUserId: string,
  payload: ReportPayload
): Promise<void> => {
  await apiClient.post('/reports', payload);
};


