import apiClient from '../apiClient';
import type { User, Post } from '../../types/index';

export const searchUsers = async (query: string, currentUserId: string): Promise<User[]> => {
  void currentUserId;
  const res = await apiClient.get('/search/users', { params: { q: query } });
  return res.data;
};

export const searchHashtags = async (query: string): Promise<string[]> => {
  const res = await apiClient.get('/search/hashtags', { params: { q: query } });
  return res.data;
};

export const getHashtagPosts = async (tag: string, currentUserId: string): Promise<Post[]> => {
  void currentUserId;
  const clean = tag.trim().replace('#', '');
  const res = await apiClient.get(`/hashtags/${encodeURIComponent(clean)}/posts`, {});
  return res.data;
};


