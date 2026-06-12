import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chatService, getChatErrorMessage } from '@/services/chat';
import { Conversation, ChatMessage, TypingIndicator } from '@/types/chat';
import { uniqueChatMessages } from '@/utils/chat.utils';
import { toast } from 'sonner';

interface ChatState {
  ownerUserId: string | null;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  typingUsers: TypingIndicator[];
  isLoading: boolean;
  unreadCount: number;

  // Actions
  loadConversations: (page?: number) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  refreshConversationMessages: (conversationId: string) => Promise<void>;
  createConversation: (subject: string, initialMessage: string) => Promise<Conversation | null>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  prependMessages: (messages: ChatMessage[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  setTypingUser: (typing: TypingIndicator) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  resetForUser: (userId: string | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      ownerUserId: null,
      conversations: [],
      currentConversation: null,
      messages: [],
      typingUsers: [],
      isLoading: false,
      unreadCount: 0,

      loadConversations: async (page = 1) => {
        set({ isLoading: true });
        try {
          const response = await chatService.getConversations(page, 20);
          set({
            conversations: response.conversations,
            unreadCount: response.conversations.reduce((sum, conv) => sum + conv.unread_count, 0),
          });
        } catch (error) {
          console.error('Failed to load conversations:', error);
          toast.error('Failed to load conversations');
        } finally {
          set({ isLoading: false });
        }
      },

      loadConversation: async (conversationId: string) => {
        set({ isLoading: true });
        try {
          const [conversation, messagesData] = await Promise.all([
            chatService.getConversation(conversationId),
            chatService.getMessages(conversationId, { limit: 50, offset: 0 }),
          ]);

          set({
            currentConversation: conversation,
            messages: uniqueChatMessages([...messagesData.messages].reverse()),
          });

          // Mark as read
          await chatService.markConversationAsRead(conversationId);
        } catch (error) {
          console.error('Failed to load conversation:', error);
          toast.error('Failed to load conversation');
        } finally {
          set({ isLoading: false });
        }
      },

      refreshConversationMessages: async (conversationId: string) => {
        try {
          const messagesData = await chatService.getMessages(conversationId, {
            limit: 50,
            offset: 0,
          });

          set({
            messages: uniqueChatMessages([...messagesData.messages].reverse()),
          });
        } catch (error) {
          console.error('Failed to refresh conversation messages:', error);
        }
      },

      createConversation: async (subject: string, initialMessage: string) => {
        try {
          const conversation = await chatService.createConversation({
            subject,
            message: initialMessage,
            category: 'support',
          });

          set((state) => ({
            conversations: [conversation, ...state.conversations],
            currentConversation: conversation,
          }));

          toast.success('Conversation created');
          return conversation;
        } catch (error) {
          toast.error(getChatErrorMessage(error));
          return null;
        }
      },

      sendMessage: async (conversationId: string, text: string) => {
        try {
          const message = await chatService.sendMessage(conversationId, {
            message: text,
          });

          set((state) => ({
            messages: uniqueChatMessages([...state.messages, message]),
          }));
        } catch (error) {
          toast.error(getChatErrorMessage(error));
        }
      },

      addMessage: (message: ChatMessage) => {
        set((state) => {
          // Check if message already exists (avoid duplicates from socket events)
          if (state.messages.some((m) => m.id === message.id)) {
            return {
              messages: uniqueChatMessages(state.messages),
            };
          }
          return {
            messages: uniqueChatMessages([...state.messages, message]),
          };
        });
      },

      prependMessages: (messages: ChatMessage[]) => {
        set((state) => ({
          messages: uniqueChatMessages([...messages, ...state.messages]),
        }));
      },

      upsertConversation: (conversation: Conversation) => {
        set((state) => {
          const exists = state.conversations.some((entry) => entry.id === conversation.id);
          return {
            conversations: exists
              ? state.conversations.map((entry) => (
                entry.id === conversation.id ? { ...entry, ...conversation } : entry
              ))
              : [conversation, ...state.conversations],
            currentConversation: state.currentConversation?.id === conversation.id
              ? { ...state.currentConversation, ...conversation }
              : state.currentConversation,
          };
        });
      },

      setTypingUser: (typing: TypingIndicator) => {
        set((state) => {
          const withoutExisting = state.typingUsers.filter((entry) => (
            entry.conversation_id !== typing.conversation_id || entry.user_id !== typing.user_id
          ));
          return {
            typingUsers: typing.is_typing ? [...withoutExisting, typing] : withoutExisting,
          };
        });
      },

      removeTypingUser: (conversationId: string, userId: string) => {
        set((state) => ({
          typingUsers: state.typingUsers.filter((entry) => (
            entry.conversation_id !== conversationId || entry.user_id !== userId
          )),
        }));
      },

      markConversationAsRead: async (conversationId: string) => {
        try {
          await chatService.markConversationAsRead(conversationId);
          set((state) => ({
            conversations: state.conversations.map((conv) =>
              conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
            ),
          }));
        } catch (error) {
          console.error('Failed to mark as read:', error);
        }
      },

      closeConversation: async (conversationId: string) => {
        try {
          await chatService.closeConversation(conversationId);

          set((state) => ({
            conversations: state.conversations.map((conv) =>
              conv.id === conversationId ? { ...conv, status: 'closed' } : conv
            ),
          }));

          toast.success('Conversation closed');
        } catch (error) {
          console.error('Failed to close conversation:', error);
          toast.error('Failed to close conversation');
        }
      },

      setCurrentConversation: (conversation: Conversation | null) => {
        set({ currentConversation: conversation });
      },

      resetForUser: (userId: string | null) => {
        set((state) => {
          if (state.ownerUserId === userId) {
            return state;
          }

          return {
            ownerUserId: userId,
            conversations: [],
            currentConversation: null,
            messages: [],
            typingUsers: [],
            unreadCount: 0,
            isLoading: false,
          };
        });
      },

      clearMessages: () => {
        set({ messages: [] });
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        conversations: state.conversations,
        currentConversation: state.currentConversation,
        messages: state.messages,
      }),
    }
  )
);
