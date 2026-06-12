import { useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react';
import { toast } from 'sonner';
import { DEFAULT_CHAT_SUBJECT } from '@/constants/chat.constants';
import { useChatSocket } from '@/hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { ChatMessage, Conversation, TypingIndicator } from '@/types/chat';
import { isChatConversationReadOnly } from '@/utils/chat.utils';

interface OpenChatSupportEventDetail {
  subject?: string;
  message?: string;
}
interface UseChatWidgetReturn {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ReturnType<typeof useChatStore.getState>['messages'];
  typingUsers: TypingIndicator[];
  isLoading: boolean;
  isOpen: boolean;
  isMinimized: boolean;
  messageInput: string;
  isSending: boolean;
  newConversationSubject: string;
  showNewConversationForm: boolean;
  isConnected: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  setIsMinimized: Dispatch<SetStateAction<boolean>>;
  setMessageInput: (value: string) => void;
  setNewConversationSubject: (value: string) => void;
  setShowNewConversationForm: (show: boolean) => void;
  selectConversation: (conversation: Conversation) => void;
  startNewConversation: () => void;
  cancelNewConversation: () => void;
  handleSendMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleStartConversation: (event?: FormEvent) => Promise<void>;
}
export function useChatWidget(): UseChatWidgetReturn {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id ?? null;
  const {
    ownerUserId,
    conversations,
    currentConversation,
    messages,
    typingUsers,
    isLoading,
    createConversation,
    sendMessage,
    addMessage,
    upsertConversation,
    setTypingUser,
    removeTypingUser,
    loadConversation,
    refreshConversationMessages,
    setCurrentConversation,
    resetForUser,
  } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [newConversationSubject, setNewConversationSubject] = useState('');
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  const { isConnected, joinConversation, on, setTyping } = useChatSocket(currentConversation?.id || '');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    resetForUser(userId);
  }, [resetForUser, userId]);

  useEffect(() => () => {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (isOpen && userId && ownerUserId === userId) {
      void useChatStore.getState().loadConversations();
    }
  }, [isOpen, ownerUserId, userId]);

  useEffect(() => {
    const handleOpenSupport = (event: Event): void => {
      const detail = (event as CustomEvent<OpenChatSupportEventDetail>).detail;
      setIsOpen(true);
      setIsMinimized(false);
      setCurrentConversation(null);
      setShowNewConversationForm(true);
      setNewConversationSubject(detail?.subject ?? DEFAULT_CHAT_SUBJECT);
      if (detail?.message) {
        setMessageInput(detail.message);
      }
    };

    window.addEventListener('open-chat-support', handleOpenSupport);
    return () => window.removeEventListener('open-chat-support', handleOpenSupport);
  }, [setCurrentConversation]);

  useEffect(() => {
    if (!isOpen || !currentConversation) {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshConversationMessages(currentConversation.id);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [currentConversation, isOpen, refreshConversationMessages]);

  useEffect(() => {
    if (!isOpen || !currentConversation || !isConnected) {
      return;
    }

    joinConversation();
  }, [currentConversation, isConnected, isOpen, joinConversation]);

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
      if (payload.is_typing) {
        setTypingUser(payload);
      } else {
        removeTypingUser(payload.conversation_id, payload.user_id);
      }
    });
    return () => {
      removeMessageListener();
      removeConversationListener();
      removeTypingListener();
    };
  }, [
    addMessage,
    currentConversation?.id,
    on,
    removeTypingUser,
    setTypingUser,
    upsertConversation,
    userId,
  ]);

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!messageInput.trim()) return;

    if (!currentConversation) {
      toast.error('Pilih percakapan dulu ya.');
      return;
    }

    if (isChatConversationReadOnly(currentConversation.status)) {
      toast.error('Percakapan ini sudah selesai. Mulai chat baru ya kalau masih butuh bantuan.');
      return;
    }

    setIsSending(true);
    try {
      setTyping(false);
      await sendMessage(currentConversation.id, messageInput);
      setMessageInput('');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversation = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault();

    if (!messageInput.trim()) {
      toast.error('Tulis pesan dulu ya.');
      return;
    }

    setIsSending(true);
    try {
      const conversation = await createConversation(
        newConversationSubject || DEFAULT_CHAT_SUBJECT,
        messageInput
      );

      if (conversation) {
        setCurrentConversation(conversation);
        setMessageInput('');
        setNewConversationSubject('');
        setShowNewConversationForm(false);
        void loadConversation(conversation.id);
      }
    } finally {
      setIsSending(false);
    }
  };

  const selectConversation = (conversation: Conversation): void => {
    setCurrentConversation(conversation);
    void loadConversation(conversation.id);
  };

  const startNewConversation = (): void => {
    setCurrentConversation(null);
    setShowNewConversationForm(true);
    setNewConversationSubject(DEFAULT_CHAT_SUBJECT);
    setMessageInput('');
  };

  const updateMessageInput = (value: string): void => {
    setMessageInput(value);
    if (!currentConversation || isChatConversationReadOnly(currentConversation.status) || !isConnected) {
      return;
    }

    setTyping(true);
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      setTyping(false);
    }, 1500);
  };

  const cancelNewConversation = (): void => {
    setShowNewConversationForm(false);
    setMessageInput('');
  };

  return {
    user,
    conversations,
    currentConversation,
    messages,
    typingUsers,
    isLoading,
    isOpen,
    isMinimized,
    messageInput,
    isSending,
    newConversationSubject,
    showNewConversationForm,
    isConnected,
    messagesEndRef,
    setIsOpen,
    setIsMinimized,
    setMessageInput: updateMessageInput,
    setNewConversationSubject,
    setShowNewConversationForm,
    selectConversation,
    startNewConversation,
    cancelNewConversation,
    handleSendMessage,
    handleStartConversation,
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
