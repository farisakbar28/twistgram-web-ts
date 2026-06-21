/**
 * Mock Chat Service
 * Ref: SRS §7, §11.8
 */

import { delay } from '../../utils';
import type { User, Conversation, Message } from '../../types/index';
import { getMockUserById, mockDb, persistMockDb } from './database';
import { MOCK_USERS, mockBlocks, mockFollows } from './social';

const getConversationsDb = (): Conversation[] => mockDb.conversations;
const getMessagesDb = (): Message[] => mockDb.messages;
const getParticipantsDb = (): Record<string, string[]> => mockDb.conversationParticipants;

const getUserObject = (userId: string): User => {
  try {
    const raw = localStorage.getItem('twistgram_user');
    if (raw) {
      const user = JSON.parse(raw) as User;
      if (user.id === userId) return user;
    }
  } catch {
    // ignore
  }

  const user = getMockUserById(userId);
  if (!user) {
    return {
      id: userId,
      name: 'Unknown User',
      username: 'unknown',
      email: 'unknown@example.com',
      phone_verified: false,
      email_verified: true,
      is_private: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    ...user,
    phone: user.phone ?? undefined,
    bio: user.bio ?? undefined,
    avatar_url: user.avatar_url ?? undefined,
  };
};

const isBlocked = (userA: string, userB: string): boolean =>
  mockBlocks.some(
    (block) =>
      (block.blocker_id === userA && block.blocked_id === userB) ||
      (block.blocker_id === userB && block.blocked_id === userA)
  );

const isFollowingAccepted = (followerId: string, followingId: string): boolean =>
  mockFollows.some(
    (follow) =>
      follow.follower_id === followerId &&
      follow.following_id === followingId &&
      follow.status === 'accepted'
  );

export interface ConversationWithMeta extends Conversation {
  is_request: boolean;
  unread_count: number;
}

export const getConversations = async (currentUserId: string): Promise<ConversationWithMeta[]> => {
  await delay(400);

  const result: ConversationWithMeta[] = [];

  for (const conversation of getConversationsDb()) {
    const participantIds = getParticipantsDb()[conversation.id] || [];
    if (!participantIds.includes(currentUserId)) continue;

    const partnerId = participantIds.find((id) => id !== currentUserId);
    if (!partnerId || isBlocked(currentUserId, partnerId)) continue;

    const partner = getUserObject(partnerId);
    const currentUser = getUserObject(currentUserId);
    const conversationMessages = getMessagesDb()
      .filter((message) => message.conversation_id === conversation.id)
      .sort(
        (messageA, messageB) =>
          new Date(messageB.created_at).getTime() - new Date(messageA.created_at).getTime()
      );

    const lastMessage = conversationMessages[0];
    let isRequest = false;

    if (currentUser.is_private) {
      const isFollower = isFollowingAccepted(partnerId, currentUserId);
      if (!isFollower && lastMessage && lastMessage.sender_id !== currentUserId) {
        isRequest = true;
      }
    } else {
      const weFollow = isFollowingAccepted(currentUserId, partnerId);
      const theyFollow = isFollowingAccepted(partnerId, currentUserId);
      if (!weFollow && !theyFollow && lastMessage && lastMessage.sender_id !== currentUserId) {
        isRequest = true;
      }
    }

    result.push({
      ...conversation,
      participants: [getUserObject(currentUserId), partner],
      last_message: lastMessage
        ? { ...lastMessage, sender: getUserObject(lastMessage.sender_id) }
        : undefined,
      is_request: isRequest,
      unread_count: lastMessage && lastMessage.sender_id !== currentUserId ? 1 : 0,
    });
  }

  result.sort((convA, convB) => {
    const timeA = convA.last_message ? new Date(convA.last_message.created_at).getTime() : 0;
    const timeB = convB.last_message ? new Date(convB.last_message.created_at).getTime() : 0;
    return timeB - timeA;
  });

  return result;
};

export const startConversation = async (
  currentUserId: string,
  targetUserId: string
): Promise<Conversation> => {
  await delay(300);

  if (isBlocked(currentUserId, targetUserId)) {
    throw new Error('Tidak dapat mengirim pesan kepada pengguna yang diblokir.');
  }

  for (const [conversationId, participantIds] of Object.entries(getParticipantsDb())) {
    if (participantIds.includes(currentUserId) && participantIds.includes(targetUserId)) {
      const existing = getConversationsDb().find((conversation) => conversation.id === conversationId);
      if (existing) return existing;
    }
  }

  const newConversation: Conversation = {
    id: `conv-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  getConversationsDb().push(newConversation);
  getParticipantsDb()[newConversation.id] = [currentUserId, targetUserId];
  persistMockDb();

  return newConversation;
};

export const getMessages = async (
  conversationId: string,
  currentUserId: string
): Promise<Message[]> => {
  await delay(300);

  const participantIds = getParticipantsDb()[conversationId] || [];
  if (!participantIds.includes(currentUserId)) {
    throw new Error('Anda tidak memiliki akses ke percakapan ini.');
  }

  return getMessagesDb()
    .filter((message) => message.conversation_id === conversationId)
    .map((message) => ({
      ...message,
      sender: getUserObject(message.sender_id),
    }))
    .sort(
      (messageA, messageB) =>
        new Date(messageA.created_at).getTime() - new Date(messageB.created_at).getTime()
    );
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  payload: { content?: string; mediaUrl?: string; replyToStoryId?: string }
): Promise<Message> => {
  await delay(300);

  const participantIds = getParticipantsDb()[conversationId] || [];
  const recipientId = participantIds.find((id) => id !== senderId);
  if (!recipientId) throw new Error('Percakapan tidak valid.');
  if (isBlocked(senderId, recipientId)) {
    throw new Error('Tidak dapat mengirim pesan kepada pengguna ini (blokir aktif).');
  }

  const newMessage: Message = {
    id: `msg-${Date.now()}`,
    conversation_id: conversationId,
    sender_id: senderId,
    content: payload.content?.trim() || undefined,
    media_url: payload.mediaUrl?.trim() || undefined,
    reply_to_story_id: payload.replyToStoryId || undefined,
    created_at: new Date().toISOString(),
  };

  getMessagesDb().push(newMessage);
  persistMockDb();

  if (payload.replyToStoryId) {
    try {
      const { createNotification } = await import('./notification');
      await createNotification(recipientId, senderId, 'story_reply', payload.replyToStoryId);
    } catch {
      // ignore mock notification failure
    }
  }

  const recipient = MOCK_USERS.find((user) => user.id === recipientId);
  if (recipient && recipient.id !== 'user-001') {
    setTimeout(async () => {
      try {
        const replies = [
          'Keren banget! 👍',
          'Wah, menarik sekali infonya!',
          'Haha, seru banget!',
          'Oke siap, nanti aku kabarin lagi ya.',
          'Halo! Aku sedang sibuk, nanti kuhubungi balik ya.',
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        getMessagesDb().push({
          id: `msg-reply-${Date.now()}`,
          conversation_id: conversationId,
          sender_id: recipientId,
          content: randomReply,
          created_at: new Date().toISOString(),
        });
        persistMockDb();

        try {
          const { createNotification } = await import('./notification');
          await createNotification(senderId, recipientId, 'story_reply', newMessage.id);
        } catch {
          // ignore mock notification failure
        }
      } catch (error) {
        console.error('Auto reply bot error:', error);
      }
    }, 2500);
  }

  return {
    ...newMessage,
    sender: getUserObject(senderId),
  };
};

export const getUnreadMessagesCount = async (currentUserId: string): Promise<number> => {
  const conversations = await getConversations(currentUserId);
  return conversations.reduce((total, conversation) => total + conversation.unread_count, 0);
};
