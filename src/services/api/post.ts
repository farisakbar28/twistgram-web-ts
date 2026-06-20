import apiClient from '../apiClient';
import type { Post, Comment } from '../../types/index';

export const getFeed = async (currentUserId: string): Promise<Post[]> => {
  void currentUserId;
  const res = await apiClient.get('/feed');
  return res.data;
};

export const createPost = async (
  currentUserId: string,
  payload: { mediaUrl: string; mediaType: 'image' | 'video'; caption?: string }
): Promise<Post> => {
  void currentUserId;
  const res = await apiClient.post('/posts', payload);
  return res.data;
};

export const getPostById = async (postId: string, currentUserId: string): Promise<Post> => {
  void currentUserId;
  const res = await apiClient.get(`/posts/${postId}`);
  return res.data;
};

export const updatePostCaption = async (
  postId: string,
  currentUserId: string,
  caption: string
): Promise<Post> => {
  void currentUserId;
  const res = await apiClient.patch(`/posts/${postId}`, { caption });
  return res.data;
};

export const deletePost = async (postId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.delete(`/posts/${postId}`);
};

export const archivePost = async (postId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.post(`/posts/${postId}/archive`, {});
};

export const unarchivePost = async (postId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.post(`/posts/${postId}/unarchive`, {});
};

export const getUserPosts = async (targetUserId: string, currentUserId: string): Promise<Post[]> => {
  void currentUserId;
  const res = await apiClient.get(`/users/${targetUserId}/posts`);
  return res.data;
};

export const likePost = async (postId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.post(`/posts/${postId}/like`, {});
};

export const unlikePost = async (postId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.delete(`/posts/${postId}/like`);
};

export const getPostComments = async (postId: string, currentUserId: string): Promise<any> => {
  void currentUserId;
  const res = await apiClient.get(`/posts/${postId}/comments`);
  return res.data;
};

export const createComment = async (
  postId: string,
  currentUserId: string,
  payload: { content: string; parentCommentId?: string }
): Promise<Comment> => {
  void currentUserId;
  const res = await apiClient.post(`/posts/${postId}/comments`, payload);
  return res.data;
};

export const deleteComment = async (commentId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.delete(`/comments/${commentId}`);
};

export const savePost = async (postId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.post(`/posts/${postId}/save`, {});
};

export const unsavePost = async (postId: string, currentUserId: string): Promise<void> => {
  void currentUserId;
  await apiClient.delete(`/posts/${postId}/save`);
};

export const getUserSavedPosts = async (currentUserId: string): Promise<Post[]> => {
  void currentUserId;
  const res = await apiClient.get('/users/me/saved');
  return res.data;
};

export const sharePost = async (postId: string, currentUserId: string): Promise<string> => {
  void currentUserId;
  const res = await apiClient.post(`/posts/${postId}/share`, {});
  return res.data.link;
};


