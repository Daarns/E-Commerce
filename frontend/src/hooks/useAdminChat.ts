'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { chatService, getChatErrorMessage } from '@/services/chat';
import { useAuthStore } from '@/stores/auth-store';
import { useChatSocket } from '@/hooks/use-socket';
import type { ChatMessage, Conversation, ConversationStatus, TypingIndicator } from '@/types/chat';
import { uniqueChatMessages } from '@/utils/chat.utils';

const DEFAULT_LIMIT = 20;
const MESSAGE_LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 1500;

export function useAdminChat() {
  const user = useAuthStore((state) => state.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('open');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [reply, setReply] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [messageOffset, setMessageOffset] = useState(MESSAGE_LIMIT);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const isSearchPending = search.trim() !== debouncedSearch;
  const selectedConversationRef = useRef<Conversation | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const { isConnected, joinConversation, on, setTyping } = useChatSocket(selectedConversation?.id ?? '');

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => () => {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (selectedConversation && messages.length < MESSAGE_LIMIT) {
      setHasOlderMessages(false);
    }
  }, [messages.length, selectedConversation]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [search]);

  const loadConversations = useCallback(async (): Promise<void> => {
    setIsLoadingList(true);
    try {
      const result = await chatService.getAdminConversations({
        page,
        limit: DEFAULT_LIMIT,
        status: statusFilter,
        search: debouncedSearch,
      });
      setConversations(result.conversations);
      setTotalPages(result.meta.total_pages);
    } catch (error) {
      console.error('Failed to load admin chat conversations:', error);
      toast.error('Gagal memuat inbox chat.');
    } finally {
      setIsLoadingList(false);
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const selectConversation = useCallback(async (conversation: Conversation): Promise<void> => {
    setSelectedConversation(conversation);
    setTypingUsers([]);
    setIsLoadingMessages(true);
    try {
      const [conversationDetail, messageResult] = await Promise.all([
        chatService.getConversation(conversation.id, true),
        chatService.getMessages(conversation.id, {
          admin: true,
          limit: MESSAGE_LIMIT,
          offset: 0,
        }),
      ]);
      setSelectedConversation(conversationDetail);
      const nextMessages = uniqueChatMessages([...messageResult.messages].reverse());
      setMessages(nextMessages);
      setMessageOffset(MESSAGE_LIMIT);
      setHasOlderMessages(nextMessages.length >= MESSAGE_LIMIT);
      await chatService.markAdminConversationAsRead(conversation.id);
      setConversations((current) => current.map((entry) => (
        entry.id === conversation.id ? { ...entry, unread_agent_count: 0, unread_count: 0 } : entry
      )));
    } catch (error) {
      console.error('Failed to load admin chat messages:', error);
      toast.error('Gagal memuat pesan chat.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const refreshSelectedMessages = useCallback(async (): Promise<void> => {
    const conversation = selectedConversationRef.current;
    if (!conversation) return;

    try {
      const messageResult = await chatService.getMessages(conversation.id, {
        admin: true,
        limit: MESSAGE_LIMIT,
        offset: 0,
      });
      const nextMessages = uniqueChatMessages([...messageResult.messages].reverse());
      setMessages(nextMessages);
      setMessageOffset((current) => Math.max(current, nextMessages.length));
      setHasOlderMessages((current) => current && nextMessages.length >= MESSAGE_LIMIT);
      await chatService.markAdminConversationAsRead(conversation.id);
      setConversations((current) => current.map((entry) => (
        entry.id === conversation.id ? { ...entry, unread_agent_count: 0, unread_count: 0 } : entry
      )));
    } catch (error) {
      console.error('Failed to refresh admin chat messages:', error);
    }
  }, []);

  const loadOlderMessages = useCallback(async (): Promise<void> => {
    const conversation = selectedConversationRef.current;
    if (!conversation || isLoadingOlderMessages || !hasOlderMessages) return;

    setIsLoadingOlderMessages(true);
    try {
      const messageResult = await chatService.getMessages(conversation.id, {
        admin: true,
        limit: MESSAGE_LIMIT,
        offset: messageOffset,
      });
      const olderMessages = [...messageResult.messages].reverse();
      setMessages((current) => uniqueChatMessages([...olderMessages, ...current]));
      setMessageOffset((current) => current + olderMessages.length);
      if (olderMessages.length < MESSAGE_LIMIT) {
        setHasOlderMessages(false);
      }
    } catch (error) {
      console.error('Failed to load older admin chat messages:', error);
      toast.error('Gagal memuat pesan lama.');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [hasOlderMessages, isLoadingOlderMessages, messageOffset]);

  useEffect(() => {
    const inboxTimer = window.setInterval(() => {
      void loadConversations();
    }, 15000);

    return () => window.clearInterval(inboxTimer);
  }, [loadConversations]);

  useEffect(() => {
    const messagesTimer = window.setInterval(() => {
      void refreshSelectedMessages();
    }, 5000);

    return () => window.clearInterval(messagesTimer);
  }, [refreshSelectedMessages]);

  useEffect(() => {
    if (!selectedConversation || !isConnected) {
      return;
    }

    joinConversation();
  }, [isConnected, joinConversation, selectedConversation]);

  useEffect(() => {
    const removeMessageListener = on('message:new', (payload) => {
      if (!isChatMessage(payload)) return;

      const selected = selectedConversationRef.current;
      if (selected?.id === payload.conversation_id) {
        setMessages((current) => uniqueChatMessages([...current, payload]));
        void chatService.markAdminConversationAsRead(payload.conversation_id);
      }
      void loadConversations();
    });

    const removeConversationListener = on('conversation:updated', (payload) => {
      if (!isConversation(payload)) return;
      setConversations((current) => {
        const exists = current.some((conversation) => conversation.id === payload.id);
        return exists
          ? current.map((conversation) => (conversation.id === payload.id ? { ...conversation, ...payload } : conversation))
          : [payload, ...current];
      });
      setSelectedConversation((current) => (
        current?.id === payload.id ? { ...current, ...payload } : current
      ));
    });

    const removeTypingListener = on('typing:update', (payload) => {
      if (!isTypingPayload(payload) || payload.user_id === user?.id) return;
      const selected = selectedConversationRef.current;
      if (selected?.id !== payload.conversation_id) return;

      setTypingUsers((current) => {
        const withoutExisting = current.filter((entry) => (
          entry.conversation_id !== payload.conversation_id || entry.user_id !== payload.user_id
        ));
        return payload.is_typing ? [...withoutExisting, payload] : withoutExisting;
      });
    });

    return () => {
      removeMessageListener();
      removeConversationListener();
      removeTypingListener();
    };
  }, [loadConversations, on, user?.id]);

  const handleSendReply = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedConversation || !reply.trim()) return;

    setIsSending(true);
    try {
      setTyping(false);
      const message = await chatService.sendMessage(
        selectedConversation.id,
        { message: reply.trim() },
        true
      );
      setMessages((current) => uniqueChatMessages([...current, message]));
      setReply('');
      await loadConversations();
    } catch (error) {
      console.error('Failed to send admin chat reply:', error);
      toast.error(getChatErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  }, [loadConversations, reply, selectedConversation, setTyping]);

  const updateStatus = useCallback(async (status: ConversationStatus): Promise<void> => {
    if (!selectedConversation) return;

    try {
      await chatService.updateConversationStatus(selectedConversation.id, status);
      const nextConversation = { ...selectedConversation, status };
      setSelectedConversation(nextConversation);
      setConversations((current) => current.map((conversation) => (
        conversation.id === selectedConversation.id ? nextConversation : conversation
      )));
      toast.success('Conversation status updated');
    } catch (error) {
      console.error('Failed to update conversation status:', error);
      toast.error('Gagal mengubah status percakapan.');
    }
  }, [selectedConversation]);

  const resetSearch = useCallback((): void => {
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  const updateReply = useCallback((value: string): void => {
    setReply(value);
    if (!selectedConversationRef.current || selectedConversationRef.current.status === 'closed' || !isConnected) {
      return;
    }

    setTyping(true);
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      setTyping(false);
    }, 1500);
  }, [isConnected, setTyping]);

  return {
    user,
    conversations,
    selectedConversation,
    messages,
    statusFilter,
    search,
    page,
    totalPages,
    reply,
    isLoadingList,
    isLoadingMessages,
    isLoadingOlderMessages,
    isSending,
    isSearchPending,
    hasOlderMessages,
    typingUsers,
    setSearch,
    setStatusFilter,
    setPage,
    setReply: updateReply,
    resetSearch,
    selectConversation,
    handleSendReply,
    updateStatus,
    loadOlderMessages,
    refresh: loadConversations,
  };
}

function isTypingPayload(payload: unknown): payload is TypingIndicator {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.conversation_id === 'string' &&
    typeof candidate.user_id === 'string' &&
    typeof candidate.is_typing === 'boolean'
  );
}

function isChatMessage(payload: unknown): payload is ChatMessage {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.conversation_id === 'string' &&
    typeof candidate.sender_id === 'string' &&
    typeof candidate.message === 'string'
  );
}

function isConversation(payload: unknown): payload is Conversation {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.user_id === 'string' &&
    typeof candidate.status === 'string'
  );
}
