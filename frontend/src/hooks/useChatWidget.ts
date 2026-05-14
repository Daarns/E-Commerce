import { useEffect, useRef, useState } from 'react';
import type { Dispatch, FormEvent, RefObject, SetStateAction } from 'react';
import { toast } from 'sonner';
import { DEFAULT_CHAT_SUBJECT } from '@/constants/chat.constants';
import { useChatSocket } from '@/hooks/use-socket';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { Conversation } from '@/types/chat';

interface UseChatWidgetReturn {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ReturnType<typeof useChatStore.getState>['messages'];
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
  cancelNewConversation: () => void;
  handleSendMessage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleStartConversation: (event?: FormEvent) => Promise<void>;
}

export function useChatWidget(): UseChatWidgetReturn {
  const user = useAuthStore((state) => state.user);
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    createConversation,
    sendMessage,
    loadConversation,
    setCurrentConversation,
  } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [newConversationSubject, setNewConversationSubject] = useState('');
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isConnected } = useChatSocket(currentConversation?.id || '');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && user && conversations.length === 0) {
      void useChatStore.getState().loadConversations();
    }
  }, [conversations.length, isOpen, user]);

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!messageInput.trim()) return;

    if (!currentConversation) {
      toast.error('No conversation selected');
      return;
    }

    setIsSending(true);
    try {
      await sendMessage(currentConversation.id, messageInput);
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversation = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault();

    if (!messageInput.trim()) {
      toast.error('Please enter a message');
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
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsSending(false);
    }
  };

  const selectConversation = (conversation: Conversation): void => {
    setCurrentConversation(conversation);
    void loadConversation(conversation.id);
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
    setMessageInput,
    setNewConversationSubject,
    setShowNewConversationForm,
    selectConversation,
    cancelNewConversation,
    handleSendMessage,
    handleStartConversation,
  };
}
