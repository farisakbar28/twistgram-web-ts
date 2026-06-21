/*
 * Service entrypoint (Phase 7)
 *
 * Tujuan:
 * - UI/komponen tetap memanggil fungsi service dengan signature yang sama
 * - implementasi bisa switch: mock ↔ axios api
 *
 * Ref: SRS §11 — kontrak endpoint REST
 */

export type UseMockFlag = boolean;

const useMock: UseMockFlag = import.meta.env.VITE_USE_MOCK !== 'false';

// NOTE:
// TypeScript / bundler tidak mendukung export-from dengan ekspresi (ternary).
// Untuk menghindari masalah, kita lakukan static import semua modul lalu pilih
// sesuai flag.

import * as mockAuth from './mock/auth';
import * as apiAuth from './api/auth';
import * as mockSocial from './mock/social';
import * as apiSocial from './api/social';
import * as mockPost from './mock/post';
import * as apiPost from './api/post';
import * as mockStory from './mock/story';
import * as apiStory from './api/story';
import * as mockChat from './mock/chat';
import * as apiChat from './api/chat';
import * as mockNotification from './mock/notification';
import * as apiNotification from './api/notification';
import * as mockSearch from './mock/search';
import * as apiSearch from './api/search';

const auth = useMock ? mockAuth : apiAuth;
const social = useMock ? mockSocial : apiSocial;
const post = useMock ? mockPost : apiPost;
const story = useMock ? mockStory : apiStory;
const chat = useMock ? mockChat : apiChat;
const notification = useMock ? mockNotification : apiNotification;
const search = useMock ? mockSearch : apiSearch;


export const authLogin = auth.authLogin;
export const authLogout = auth.authLogout;
export const authRegister = auth.authRegister;
export const authVerifyOtp = auth.authVerifyOtp;
export const authForgotPassword = auth.authForgotPassword;
export const authResetPassword = auth.authResetPassword;
export const authRecoverUsername = auth.authRecoverUsername;
export const authRecoverEmail = auth.authRecoverEmail;
export const checkUsernameAvailable = auth.checkUsernameAvailable;
export const checkEmailAvailable = auth.checkEmailAvailable;
export const getLoginLockState = useMock
  ? mockAuth.getLoginLockState
  : (_identifier: string) => ({ locked: false, remainingMs: 0 });

export const getMyProfile = social.getMyProfile;
export const getProfileByUsername = social.getProfileByUsername;
export const updateProfile = social.updateProfile;
export const updatePrivacy = social.updatePrivacy;
export const getInterests = social.getInterests;
export const updateInterests = social.updateInterests;
export const followUser = social.followUser;
export const unfollowUser = social.unfollowUser;
export const getFollowers = social.getFollowers;
export const getFollowing = social.getFollowing;
export const removeFollower = social.removeFollower;
export const getFollowRequests = social.getFollowRequests;
export const approveFollowRequest = social.approveFollowRequest;
export const declineFollowRequest = social.declineFollowRequest;
export const blockUser = social.blockUser;
export const unblockUser = social.unblockUser;
export const reportContent = social.reportContent;

export const getFeed = post.getFeed;
export const createPost = post.createPost;
export const getPostById = post.getPostById;
export const updatePostCaption = post.updatePostCaption;
export const deletePost = post.deletePost;
export const archivePost = post.archivePost;
export const unarchivePost = post.unarchivePost;
export const getUserPosts = post.getUserPosts;
export const likePost = post.likePost;
export const unlikePost = post.unlikePost;
export const getPostComments = post.getPostComments;
export const createComment = post.createComment;
export const deleteComment = post.deleteComment;
export const savePost = post.savePost;
export const unsavePost = post.unsavePost;
export const getUserSavedPosts = post.getUserSavedPosts;
export const sharePost = post.sharePost;

export const getStoryFeed = story.getStoryFeed;
export const getStoryById = story.getStoryById;
export const markStoryViewed = story.markStoryViewed;
export const getStoryViewers = story.getStoryViewers;
export const createStory = story.createStory;
export const deleteStory = story.deleteStory;
export const hasActiveStory = story.hasActiveStory;

export const getConversations = chat.getConversations;
export const startConversation = chat.startConversation;
export const getMessages = chat.getMessages;
export const sendMessage = chat.sendMessage;
export const getUnreadMessagesCount = chat.getUnreadMessagesCount;

export const getNotifications = notification.getNotifications;
export const markNotificationAsRead = notification.markNotificationAsRead;
export const markAllNotificationsAsRead = notification.markAllNotificationsAsRead;
export const createNotification = notification.createNotification;
export const getUnreadNotificationsCount = notification.getUnreadNotificationsCount;

export const searchUsers = search.searchUsers;
export const searchHashtags = search.searchHashtags;
export const getHashtagPosts = search.getHashtagPosts;

export type { ConversationWithMeta } from './api/chat';
export type { StoryGroup } from './mock/story';


