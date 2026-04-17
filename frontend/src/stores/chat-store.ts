import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { chatService } from '@/services/chat';
import { Conversation, ChatMessage, TypingIndicator, MessageReaction } from '@/types/chat';
import { toast } from 'sonner';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  typingUsers: TypingIndicator[];
  isLoading: boolean;
  unreadCount: number;

  // Actions
  loadConversations: (page?: number) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  createConversation: (subject: string, initialMessage: string) => Promise<Conversation | null>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  setTypingUser: (data: TypingIndicator) => void;
  removeTypingUser: (userId: string) => void;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
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
            chatService.getMessages(conversationId, 1, 50),
          ]);

          set({
            currentConversation: conversation,
            messages: messagesData.messages,
          });

          // Mark as read
          await chatService.markMessagesAsRead(conversationId);
        } catch (error) {
          console.error('Failed to load conversation:', error);
          toast.error('Failed to load conversation');
        } finally {
          set({ isLoading: false });
        }
      },

      createConversation: async (subject: string, initialMessage: string) => {
        try {
          const conversation = await chatService.createConversation({
            subject,
            initial_message: initialMessage,
          });

          set((state) => ({
            conversations: [conversation, ...state.conversations],
            currentConversation: conversation,
          }));

          toast.success('Conversation created');
          return conversation;
        } catch (error) {
          console.error('Failed to create conversation:', error);
          toast.error('Failed to create conversation');
          return null;
        }
      },

      sendMessage: async (conversationId: string, text: string) => {
        try {
          const message = await chatService.sendMessage(conversationId, {
            message_text: text,
          });

          set((state) => ({
            messages: [...state.messages, message],
          }));
        } catch (error) {
          console.error('Failed to send message:', error);
          toast.error('Failed to send message');
          throw error;
        }
      },

      addMessage: (message: ChatMessage) => {
        set((state) => {
          // Check if message already exists (avoid duplicates from socket events)
          if (state.messages.some((m) => m.id === message.id)) {
            return state;
          }
          return {
            messages: [...state.messages, message],
          };
        });
      },

      setTypingUser: (data: TypingIndicator) => {
        set((state) => {
          const existing = state.typingUsers.find((u) => u.user_id === data.user_id);
          if (existing) {
            return {
              typingUsers: state.typingUsers.map((u) =>
                u.user_id === data.user_id ? data : u
              ),
            };
          }
          return {
            typingUsers: [...state.typingUsers, data],
          };
        });
      },

      removeTypingUser: (userId: string) => {
        set((state) => ({
          typingUsers: state.typingUsers.filter((u) => u.user_id !== userId),
        }));
      },

      addReaction: async (messageId: string, emoji: string) => {
        try {
          await chatService.addReaction(messageId, emoji);

          set((state) => ({
            messages: state.messages.map((msg) => {
              if (msg.id === messageId) {
                const reactions = msg.reactions || [];
                const existingReaction = reactions.find((r) => r.emoji === emoji);

                if (existingReaction) {
                  return {
                    ...msg,
                    reactions: reactions.map((r) =>
                      r.emoji === emoji
                        ? { ...r, user_ids: [...r.user_ids, 'current-user'] }
                        : r
                    ),
                  };
                }

                return {
                  ...msg,
                  reactions: [...reactions, { emoji, user_ids: ['current-user'] }],
                };
              }
              return msg;
            }),
          }));
        } catch (error) {
          console.error('Failed to add reaction:', error);
          toast.error('Failed to add reaction');
        }
      },

      removeReaction: async (messageId: string, emoji: string) => {
        try {
          await chatService.removeReaction(messageId, emoji);

          set((state) => ({
            messages: state.messages.map((msg) => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  reactions: (msg.reactions || []).filter((r) => r.emoji !== emoji),
                };
              }
              return msg;
            }),
          }));
        } catch (error) {
          console.error('Failed to remove reaction:', error);
          toast.error('Failed to remove reaction');
        }
      },

      markConversationAsRead: async (conversationId: string) => {
        try {
          await chatService.markMessagesAsRead(conversationId);
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

      clearMessages: () => {
        set({ messages: [] });
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversation: state.currentConversation,
        messages: state.messages,
      }),
    }
  )
);
