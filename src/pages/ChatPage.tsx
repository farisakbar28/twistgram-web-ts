import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getConversations, getMessages, sendMessage } from '../services';
import type { ConversationWithMeta } from '../services';
import type { Message, Story } from '../types/index';
import Avatar from '../components/common/Avatar';
import Spinner from '../components/common/Spinner';
import { useToast } from '../components/common/Toast';
import {
  Send,
  Image as ImageIcon,
  ArrowLeft,
  SendHorizontal,
  MessageCircle,
  Link2,
  Eye,
} from 'lucide-react';
import { formatRelativeTime } from '../utils';

// ============================================================
// Helpers
// ============================================================

const getStoryFromDb = (storyId: string): Story | null => {
  try {
    const raw = localStorage.getItem('twistgram_stories');
    if (raw) {
      const stories = JSON.parse(raw) as Story[];
      return stories.find(s => s.id === storyId) || null;
    }
  } catch {}
  return null;
};

// ============================================================
// Component
// ============================================================

const ChatPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const location = useLocation();

  // Conversations states
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationWithMeta | null>(null);
  const activeConvRef = useRef<ConversationWithMeta | null>(null);

  const [activeTab, setActiveTab] = useState<'main' | 'requests'>('main');
  const [isConvsLoading, setIsConvsLoading] = useState(true);

  // Messages states
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMsgsLoading, setIsMsgsLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showImageAttach, setShowImageAttach] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pollIntervalRef = useRef<any>(null);

  // Track last message id for the active conversation to avoid unnecessary refetches/spinners
  const lastActiveLastMessageIdRef = useRef<string | null>(null);
  const pendingConversationIdRef = useRef<string | null>(
    (location.state as { conversationId?: string } | null)?.conversationId ?? null
  );

  // Keep ref in sync to avoid stale reads without re-creating polling callbacks
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  useEffect(() => {
    const requestedConversationId =
      (location.state as { conversationId?: string } | null)?.conversationId ?? null;
    if (requestedConversationId) {
      pendingConversationIdRef.current = requestedConversationId;
    }
  }, [location.state]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConvs = useCallback(
    async (silent = false) => {
      if (!currentUser) return;
      if (!silent) setIsConvsLoading(true);

      try {
        const data = await getConversations(currentUser.id);

        // Update sidebar conversations immediately
        setConversations(data);

        // If active conversation exists, detect last_message changes and refetch messages (silent) to update chat panel
        const active = activeConvRef.current;
        if (active) {
          const updatedActive = data.find(c => c.id === active.id);
          const updatedLastId = updatedActive?.last_message?.id ?? null;

          if (updatedLastId && lastActiveLastMessageIdRef.current !== updatedLastId) {
            lastActiveLastMessageIdRef.current = updatedLastId;
            const msgs = await getMessages(active.id, currentUser.id);
            setMessages(msgs);
            setTimeout(scrollToBottom, 50);
          }
        }

        // Finally sync activeConv object for any other UI needs
        setActiveConv(prev => {
          if (!prev) return prev;
          const updated = data.find(c => c.id === prev.id);
          return updated ?? prev;
        });

        if (pendingConversationIdRef.current) {
          const requestedConversation = data.find(
            c => c.id === pendingConversationIdRef.current
          );

          if (requestedConversation) {
            setActiveConv(requestedConversation);
            setActiveTab(requestedConversation.is_request ? 'requests' : 'main');
            pendingConversationIdRef.current = null;
          }
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        if (!silent) setIsConvsLoading(false);
      }
    },
    [currentUser]
  );

  // Polling for incoming messages
  useEffect(() => {
    if (currentUser) {
      fetchConvs();
      pollIntervalRef.current = setInterval(() => {
        fetchConvs(true);
      }, 3000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [currentUser, fetchConvs]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    const fetchMessagesList = async () => {
      if (!currentUser || !activeConv) return;
      setIsMsgsLoading(true);
      try {
        const data = await getMessages(activeConv.id, currentUser.id);
        setMessages(data);

        // Initialize last message id tracking for silent polling updates
        lastActiveLastMessageIdRef.current = activeConv.last_message?.id ?? null;

        setTimeout(scrollToBottom, 50);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setIsMsgsLoading(false);
      }
    };
    fetchMessagesList();
  }, [activeConv?.id, currentUser]);

  // Watch for new messages to auto scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!currentUser) return null;

  // Active chat partner info
  const activePartner = activeConv?.participants?.find(p => p.id !== currentUser.id);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || (!inputText.trim() && !imageUrlInput.trim())) return;

    setIsSending(true);
    try {
      const newMsg = await sendMessage(activeConv.id, currentUser.id, {
        content: inputText.trim() || undefined,
        mediaUrl: imageUrlInput.trim() || undefined,
      });

      setMessages(prev => [...prev, newMsg]);
      setInputText('');
      setImageUrlInput('');
      setShowImageAttach(false);
      fetchConvs(true);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim pesan.');
    } finally {
      setIsSending(false);
    }
  };

  // Filter conversations based on tab
  const mainConversations = conversations.filter(c => !c.is_request);
  const requestConversations = conversations.filter(c => c.is_request);
  const currentTabConversations = activeTab === 'main' ? mainConversations : requestConversations;

  return (
    <div className="max-w-5xl mx-auto w-full h-[calc(100vh-80px)] md:h-[80vh] flex bg-surface-900 border border-surface-800/80 rounded-2xl overflow-hidden shadow-2xl animate-fade-in text-left">
      {/* 1. Sidebar - Threads List */}
      <div
        className={[
          'w-full md:w-80 border-r border-surface-800 flex flex-col shrink-0',
          activeConv ? 'hidden md:flex' : 'flex',
        ].join(' ')}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-surface-800 flex items-center justify-between">
          <h1 className="text-base font-extrabold text-neutral-100 select-none">Pesan Langsung</h1>
          <Link
            to="/search"
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold px-2 py-1 bg-brand-500/5 hover:bg-brand-500/10 border border-brand-500/10 hover:border-brand-500/20 rounded-lg transition-all"
          >
            Obrolan Baru
          </Link>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-surface-800 text-center text-xs font-semibold select-none">
          <button
            onClick={() => setActiveTab('main')}
            className={[
              'flex-1 py-3 border-b-2 transition-all flex items-center justify-center gap-1.5',
              activeTab === 'main'
                ? 'border-brand-500 text-brand-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-400',
            ].join(' ')}
          >
            Utama
            {mainConversations.some(c => c.unread_count > 0) && (
              <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={[
              'flex-1 py-3 border-b-2 transition-all flex items-center justify-center gap-1.5',
              activeTab === 'requests'
                ? 'border-brand-500 text-brand-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-400',
            ].join(' ')}
          >
            Permintaan
            {requestConversations.length > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-surface-700 text-neutral-300 text-[8px] font-bold flex items-center justify-center">
                {requestConversations.length}
              </span>
            )}
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {isConvsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner size="sm" className="text-brand-500" />
            </div>
          ) : currentTabConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 text-center px-4 select-none">
              <MessageCircle className="h-8 w-8 text-neutral-600 mb-2" />
              <p className="text-xs font-semibold text-neutral-400">Tidak ada obrolan</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {activeTab === 'main'
                  ? 'Obrolan aktif Anda akan muncul di sini.'
                  : 'Permintaan pesan dari non-follower akan muncul di sini.'}
              </p>
            </div>
          ) : (
            currentTabConversations.map(conv => {
              const partner = conv.participants?.find(p => p.id !== currentUser.id);
              if (!partner) return null;
              const isActive = activeConv?.id === conv.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    // Mark as read in state
                    setActiveConv(conv);
                  }}
                  className={[
                    'w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group',
                    isActive
                      ? 'bg-brand-500/10 border border-brand-500/20 text-neutral-50 shadow-glow-sm'
                      : 'hover:bg-surface-800 text-neutral-400 hover:text-neutral-200 border border-transparent',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar src={partner.avatar_url} name={partner.name} size="md" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-neutral-100 group-hover:text-brand-400 transition-colors truncate">
                        {partner.name}
                      </span>
                      <span
                        className={[
                          'text-[10px] truncate mt-0.5 max-w-[140px]',
                          conv.unread_count > 0
                            ? 'text-neutral-50 font-semibold'
                            : 'text-neutral-500',
                        ].join(' ')}
                      >
                        {conv.last_message?.content ||
                          (conv.last_message?.media_url ? '📷 Foto' : 'Mulai obrolan...')}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 select-none">
                    {conv.last_message && (
                      <span className="text-[8px] text-neutral-500">
                        {formatRelativeTime(conv.last_message.created_at)}
                      </span>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse-glow" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Active Chat Window */}
      <div
        className={[
          'flex-1 flex flex-col bg-surface-950/20',
          activeConv ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {activeConv && activePartner ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-surface-800 flex items-center justify-between bg-surface-900/40 backdrop-blur-sm z-10 shrink-0">
              <div className="flex items-center gap-3">
                {/* Back button (Mobile only) */}
                <button
                  onClick={() => setActiveConv(null)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-surface-800 text-neutral-400 hover:text-neutral-200 transition-all mr-1"
                  title="Kembali"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>

                <Avatar src={activePartner.avatar_url} name={activePartner.name} size="md" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-neutral-100 leading-tight">
                    {activePartner.name}
                  </span>
                  <span className="text-[9px] text-neutral-400">@{activePartner.username}</span>
                </div>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin">
              {isMsgsLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Spinner size="md" className="text-brand-500" />
                </div>
              ) : (
                <>
                  {messages.map(msg => {
                    const isSelf = msg.sender_id === currentUser.id;
                    const storyReplied = msg.reply_to_story_id
                      ? getStoryFromDb(msg.reply_to_story_id)
                      : null;

                    return (
                      <div
                        key={msg.id}
                        className={[
                          'flex flex-col max-w-[75%]',
                          isSelf ? 'self-end items-end' : 'self-start items-start',
                        ].join(' ')}
                      >
                        {/* Render story reply preview card */}
                        {msg.reply_to_story_id && (
                          <div
                            className={[
                              'mb-1.5 p-2 rounded-xl border flex items-center gap-2.5 text-[10px] w-full max-w-[200px] select-none text-left',
                              isSelf
                                ? 'bg-brand-500/10 border-brand-500/25 text-brand-300'
                                : 'bg-surface-800 border-surface-700 text-neutral-400',
                            ].join(' ')}
                          >
                            <div className="w-8 h-12 bg-neutral-900 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-[7px] font-bold text-white relative">
                              {storyReplied ? (
                                storyReplied.media_type === 'text' ? (
                                  <div className="p-1 w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700 to-indigo-700 text-[6px] truncate text-center">
                                    {storyReplied.text_content}
                                  </div>
                                ) : (
                                  <img
                                    src={storyReplied.media_url}
                                    className="w-full h-full object-cover"
                                    alt=""
                                  />
                                )
                              ) : (
                                <div className="text-neutral-600 flex flex-col items-center">
                                  <Eye className="h-3 w-3" />
                                  <span>Expired</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col overflow-hidden leading-snug">
                              <span className="font-semibold text-neutral-200">
                                Membalas cerita
                              </span>
                              <span className="truncate text-neutral-400 mt-0.5">
                                {storyReplied?.text_content || 'Cerita tidak tersedia'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Message Bubble wrapper */}
                        <div
                          className={[
                            'px-4 py-2.5 rounded-2xl text-xs leading-normal shadow-sm border text-left break-words',
                            isSelf
                              ? 'bg-brand-gradient border-brand-500/30 text-white rounded-tr-none'
                              : 'bg-surface-800 border-surface-700 text-neutral-100 rounded-tl-none',
                          ].join(' ')}
                        >
                          {/* Image inside chat */}
                          {msg.media_url && (
                            <div className="mb-1.5 max-w-[220px] rounded-lg overflow-hidden border border-black/10 select-none">
                              <img
                                src={msg.media_url}
                                alt="Attached"
                                className="max-h-[160px] w-full object-cover"
                              />
                            </div>
                          )}
                          <p>{msg.content}</p>
                        </div>

                        <span className="text-[7.5px] text-neutral-500 mt-1 select-none">
                          {formatRelativeTime(msg.created_at)}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input message forms container */}
            <div className="p-4 border-t border-surface-800 bg-surface-900/40 z-10 shrink-0">
              <form onSubmit={handleSend} className="flex flex-col gap-2.5">
                {/* Media URL Attach Overlay */}
                {showImageAttach && (
                  <div className="flex items-center gap-2 border border-surface-800 bg-surface-950 p-2.5 rounded-xl animate-fade-in">
                    <ImageIcon className="h-4.5 w-4.5 text-brand-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Masukkan URL foto (misal: https://example.com/image.jpg)..."
                      value={imageUrlInput}
                      onChange={e => setImageUrlInput(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrlInput('');
                        setShowImageAttach(false);
                      }}
                      className="text-[10px] text-neutral-500 hover:text-neutral-300 font-bold uppercase px-1.5"
                    >
                      Batal
                    </button>
                  </div>
                )}

                {/* Text bar input */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImageAttach(!showImageAttach)}
                    className={[
                      'h-11 w-11 flex items-center justify-center rounded-xl border transition-all duration-200 shrink-0',
                      showImageAttach
                        ? 'bg-brand-500/10 border-brand-500/35 text-brand-400'
                        : 'bg-surface-800 border-surface-700 text-neutral-400 hover:border-surface-600 hover:text-neutral-200',
                    ].join(' ')}
                    title="Lampirkan Gambar"
                  >
                    <Link2 className="h-4.5 w-4.5" />
                  </button>

                  <input
                    type="text"
                    placeholder="Ketik pesan Anda..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-xs text-neutral-50 placeholder-neutral-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                  />

                  <button
                    type="submit"
                    disabled={isSending || (!inputText.trim() && !imageUrlInput.trim())}
                    className="h-11 w-11 flex items-center justify-center bg-brand-gradient text-white rounded-xl shadow-glow-sm hover:shadow-glow-md disabled:opacity-50 transition-all cursor-pointer shrink-0"
                  >
                    <SendHorizontal className="h-4.5 w-4.5" />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          // Empty State - No active chat
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 text-center p-6 select-none animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/15 flex items-center justify-center text-brand-400 shadow-glow-sm mb-4">
              <Send className="h-8 w-8 -rotate-12 mt-[-4px]" />
            </div>
            <h2 className="text-base font-extrabold text-neutral-200">Pesan Anda</h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-[280px]">
              Kirim pesan dan foto privat kepada teman atau keluarga secara instan dan aman di
              Twistgram.
            </p>
            <button
              onClick={() => {
                // Navigate to search
                window.location.pathname = '/search';
              }}
              className="mt-4 px-4 py-2 bg-brand-gradient text-white text-xs font-semibold rounded-xl shadow-glow-sm hover:shadow-glow-md transition-all cursor-pointer"
            >
              Cari Pengguna
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
