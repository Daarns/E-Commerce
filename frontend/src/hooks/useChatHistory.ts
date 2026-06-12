import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DEFAULT_CHAT_SUBJECT } from '@/constants/chat.constants';
import { useChatSocket } from '@/hooks/use-socket';
import { chatService } from '@/services/chat';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { ChatMessage, Conversation, TypingIndicator } from '@/types/chat';
import { isChatConversationReadOnly } from '@/utils/chat.utils';

const MESSAGE_PAGE_SIZE = 50;

interface UseChatHistoryReturn {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  isCreatingNew: boolean;
  isLoadingOlderMessages: boolean;
  hasOlderMessages: boolean;
  typingUsers: TypingIndicator[];
  messageInput: string;
  newConversationSubject: string;
  newConversationMessage: string;
  isCurrentConversationReadOnly: boolean;
  setMessageInput: (value: string) => void;
  handleMessageInputChange: (value: string) => void;
  setNewConversationSubject: (value: string) => void;
  setNewConversationMessage: (value: string) => void;
  selectConversation: (conversation: Conversation) => void;
  sendCurrentMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  openNewChat: () => void;
  cancelNewChat: () => void;
  createNewConversation: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  loadOlderMessages: () => Promise<void>;
}

export function useChatHistory(): UseChatHistoryReturn {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const userId = user?.id ?? null;

  const {
    ownerUserId,
    conversations,
    currentConversation,
    messages,
    isLoading,
    loadConversation,
    createConversation,
    sendMessage,
    addMessage,
    prependMessages,
    upsertConversation,
    setCurrentConversation,
    resetForUser,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState('');
  const [newConversationSubject, setNewConversationSubject] = useState(DEFAULT_CHAT_SUBJECT);
  const [newConversationMessage, setNewConversationMessage] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageOffset, setMessageOffset] = useState(MESSAGE_PAGE_SIZE);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const typingTimerRef = useRef<number | null>(null);
  const { isConnected, joinConversation, on, setTyping } = useChatSocket(currentConversation?.id || '');

  const isCurrentConversationReadOnly = currentConversation
    ? isChatConversationReadOnly(currentConversation.status)
    : false;

  useEffect(() => {
    resetForUser(userId);
  }, [resetForUser, userId]);

  useEffect(() => {
    if (isAuthenticated && userId && ownerUserId === userId) {
      void useChatStore.getState().loadConversations();
    }
  }, [isAuthenticated, ownerUserId, userId]);

  const clearTypingTimer = useCallback((): void => {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (currentConversation && messages.length < MESSAGE_PAGE_SIZE) {
      setHasOlderMessages(false);
    }
  }, [currentConversation, messages.length]);

  useEffect(() => {
    if (!currentConversation || !isConnected) {
      return;
    }

    joinConversation();
  }, [currentConversation, isConnected, joinConversation]);

  useEffect(() => {
    return () => {
      clearTypingTimer();
      setTyping(false);
    };
  }, [clearTypingTimer, setTyping]);

  useEffect(() => {
    const removeMessageListener = on('message:new', (payload) => {
      if (isChatMessage(payload) && payload.conversation_id === currentConversation?.id) {
        addMessage(payload);
      }
    });
    const removeConversationListener = on('conversation:updated', (payload) => {
      if (isConversation(payload)) {
        upsertConversation(payload);
      }
    });
    const removeTypingListener = on('typing:update', (payload) => {
      if (!isTypingPayload(payload) || payload.user_id === userId) {
        return;
      }

      setTypingUsers((current) => {
        const otherTypingUsers = current.filter(
          (entry) =>
            entry.conversation_id !== payload.conversation_id ||
            entry.user_id !== payload.user_id
        );

        return payload.is_typing ? [...otherTypingUsers, payload] : otherTypingUsers;
      });
    });

    return () => {
      removeMessageListener();
      removeConversationListener();
      removeTypingListener();
    };
  }, [addMessage, currentConversation?.id, on, upsertConversation, userId]);

  const selectConversation = (conversation: Conversation): void => {
    setIsCreatingNew(false);
    setMessageInput('');
    setTypingUsers([]);
    clearTypingTimer();
    setTyping(false);
    setMessageOffset(MESSAGE_PAGE_SIZE);
    setHasOlderMessages(true);
    void loadConversation(conversation.id);
  };

  const handleMessageInputChange = (value: string): void => {
    setMessageInput(value);

    if (!currentConversation || isCurrentConversationReadOnly || !isConnected) {
      return;
    }

    setTyping(true);
    clearTypingTimer();
    typingTimerRef.current = window.setTimeout(() => {
      setTyping(false);
      typingTimerRef.current = null;
    }, 1500);
  };

  const sendCurrentMessage = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!currentConversation) {
      toast.error('Pilih percakapan dulu ya.');
      return;
    }
    if (isChatConversationReadOnly(currentConversation.status)) {
      toast.error('Percakapan ini sudah selesai. Mulai chat baru ya kalau masih butuh bantuan.');
      return;
    }
    if (!messageInput.trim()) {
      return;
    }

    setIsSending(true);
    try {
      clearTypingTimer();
      setTyping(false);
      await sendMessage(currentConversation.id, messageInput);
      setMessageInput('');
    } finally {
      setIsSending(false);
    }
  };

  const openNewChat = (): void => {
    setCurrentConversation(null);
    setTypingUsers([]);
    clearTypingTimer();
    setTyping(false);
    setNewConversationSubject(DEFAULT_CHAT_SUBJECT);
    setNewConversationMessage('');
    setIsCreatingNew(true);
  };

  const cancelNewChat = (): void => {
    setIsCreatingNew(false);
    setTypingUsers([]);
    clearTypingTimer();
    setTyping(false);
    setNewConversationSubject(DEFAULT_CHAT_SUBJECT);
    setNewConversationMessage('');
  };

  const createNewConversation = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!newConversationMessage.trim()) {
      toast.error('Tulis pesan dulu ya.');
      return;
    }

    setIsSending(true);
    try {
      const conversation = await createConversation(
        newConversationSubject.trim() || DEFAULT_CHAT_SUBJECT,
        newConversationMessage.trim()
      );
      if (conversation) {
        setIsCreatingNew(false);
        setNewConversationSubject(DEFAULT_CHAT_SUBJECT);
        setNewConversationMessage('');
        setMessageOffset(MESSAGE_PAGE_SIZE);
        setHasOlderMessages(false);
        void loadConversation(conversation.id);
      }
    } finally {
      setIsSending(false);
    }
  };

  const loadOlderMessages = async (): Promise<void> => {
    if (!currentConversation || isLoadingOlderMessages || !hasOlderMessages) {
      return;
    }

    setIsLoadingOlderMessages(true);
    try {
      const result = await chatService.getMessages(currentConversation.id, {
        limit: MESSAGE_PAGE_SIZE,
        offset: messageOffset,
      });
      const olderMessages = [...result.messages].reverse();
      prependMessages(olderMessages);
      setMessageOffset((current) => current + olderMessages.length);
      if (olderMessages.length < MESSAGE_PAGE_SIZE) {
        setHasOlderMessages(false);
      }
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isAuthLoading,
    conversations,
    currentConversation,
    messages,
    isLoading,
    isSending,
    isCreatingNew,
    isLoadingOlderMessages,
    hasOlderMessages,
    typingUsers,
    messageInput,
    newConversationSubject,
    newConversationMessage,
    isCurrentConversationReadOnly,
    setMessageInput,
    handleMessageInputChange,
    setNewConversationSubject,
    setNewConversationMessage,
    selectConversation,
    sendCurrentMessage,
    openNewChat,
    cancelNewChat,
    createNewConversation,
    loadOlderMessages,
  };
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

function isTypingPayload(payload: unknown): payload is TypingIndicator {
  if (typeof payload !== 'object' || payload === null) return false;
  const candidate = payload as Record<string, unknown>;
  return (
    typeof candidate.conversation_id === 'string' &&
    typeof candidate.user_id === 'string' &&
    typeof candidate.is_typing === 'boolean'
  );
}
