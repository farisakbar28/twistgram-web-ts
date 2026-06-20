import apiClient from '../apiClient';
import type { Story, StoryView, User } from '../../types/index';

export interface StoryGroup {
  user: User;
  stories: Story[];
  hasUnviewed: boolean;
}

export const getStoryFeed = async (currentUserId: string): Promise<StoryGroup[]> => {
  void currentUserId;
  const res = await apiClient.get('/stories/feed');
  return res.data;
};

export const getStoryById = async (storyId: string, currentUserId: string): Promise<Story> => {
  void currentUserId;
  const res = await apiClient.get(`/stories/${storyId}`);
  return res.data;
};

export const markStoryViewed = async (storyId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.post(`/stories/${storyId}/view`, {});
};

export const getStoryViewers = async (storyId: string, currentUserId: string): Promise<StoryView[]> => {
  void currentUserId;
  const res = await apiClient.get(`/stories/${storyId}/viewers`);
  return res.data;
};

export const createStory = async (
  currentUserId: string,
  payload: { mediaUrl?: string; mediaType: 'image' | 'video' | 'text'; textContent?: string }
): Promise<Story> => {
  void currentUserId;
  const body = {
    media_url: payload.mediaUrl,
    media_type: payload.mediaType,
    text_content: payload.textContent,
  };
  const res = await apiClient.post('/stories', body);
  return res.data;
};

export const deleteStory = async (storyId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.delete(`/stories/${storyId}`);
};

export const hasActiveStory = async (userId: string): Promise<boolean> => {
  // Kontrak tidak ada di SRS bagian 11 untuk helper ini.
  // Untuk sementara, default false. Setelah backend ada, implementasi disesuaikan.
  void userId;
  return false;
};


