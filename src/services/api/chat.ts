import apiClient from '../apiClient';
import type { Conversation, Message } from '../../types/index';

export interface ConversationWithMeta extends Conversation {
  is_request: boolean;
  unread_count: number;
}

export const getConversations = async (currentUserId: string): Promise<ConversationWithMeta[]> => {
  void currentUserId;
  const res = await apiClient.get('/conversations');
  return res.data;
};

export const startConversation = async (currentUserId: string, targetUserId: string): Promise<Conversation> => {
  void currentUserId;
  const res = await apiClient.post('/conversations', { target_user_id: targetUserId });
  return res.data;
};

export const getMessages = async (conversationId: string, currentUserId: string): Promise<Message[]> => {
  void currentUserId;
  const res = await apiClient.get(`/conversations/${conversationId}/messages`);
  return res.data;
};


export const sendMessage = async (
  conversationId: string,
  senderId: string,
  payload: { content?: string; mediaUrl?: string; replyToStoryId?: string }
): Promise<Message> => {
  const body = {
    content: payload.content,
    media_url: payload.mediaUrl,
    reply_to_story_id: payload.replyToStoryId,
    sender_id: senderId,
  };
  const res = await apiClient.post(`/conversations/${conversationId}/messages`, body);
  return res.data;
};

export const getUnreadMessagesCount = async (currentUserId: string): Promise<number> => {
  // Kontrak tidak ada untuk helper ini di SRS.
  void currentUserId;
  return 0;
};

