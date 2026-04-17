import api from './api';
import { ApiResponse } from '@/types';
import {
  Conversation,
  ChatMessage,
  CreateConversationInput,
  SendMessageInput,
  AgentStatus,
  MessageReaction,
} from '@/types/chat';

interface ConversationListResponse {
  conversations: Conversation[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ConversationMessagesResponse {
  messages: ChatMessage[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export const chatService = {
  // Conversations
  async getConversations(page: number = 1, limit: number = 20): Promise<ConversationListResponse> {
    const response = await api.get<ApiResponse<{ conversations: Conversation[] }>>(
      `/chat/conversations?page=${page}&limit=${limit}`
    );
    return {
      conversations: response.data.data?.conversations || [],
      meta: response.data.meta || { page, limit, total: 0, total_pages: 0 },
    };
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await api.get<ApiResponse<Conversation>>(`/chat/conversations/${conversationId}`);
    return response.data.data!;
  },

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const response = await api.post<ApiResponse<Conversation>>('/chat/conversations', input);
    return response.data.data!;
  },

  async closeConversation(conversationId: string): Promise<Conversation> {
    const response = await api.put<ApiResponse<Conversation>>(
      `/chat/conversations/${conversationId}`,
      { status: 'closed' }
    );
    return response.data.data!;
  },

  // Messages
  async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ConversationMessagesResponse> {
    const response = await api.get<ApiResponse<{ messages: ChatMessage[] }>>(
      `/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    );
    return {
      messages: response.data.data?.messages || [],
      meta: response.data.meta || { page, limit, total: 0, total_pages: 0 },
    };
  },

  async sendMessage(conversationId: string, input: SendMessageInput): Promise<ChatMessage> {
    const formData = new FormData();
    formData.append('message_text', input.message_text);

    if (input.attachments && input.attachments.length > 0) {
      input.attachments.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await api.post<ApiResponse<ChatMessage>>(
      `/chat/conversations/${conversationId}/messages`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  },

  async markMessagesAsRead(conversationId: string): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/read`, {});
  },

  // Reactions
  async addReaction(messageId: string, emoji: string): Promise<void> {
    await api.post(`/chat/messages/${messageId}/reactions`, { emoji });
  },

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    await api.delete(`/chat/messages/${messageId}/reactions/${emoji}`);
  },

  // Agent Status
  async getAgentStatus(agentId?: string): Promise<AgentStatus | null> {
    try {
      const url = agentId ? `/chat/agents/${agentId}/status` : '/chat/agents/status';
      const response = await api.get<ApiResponse<AgentStatus>>(url);
      return response.data.data || null;
    } catch {
      return null;
    }
  },

  async getAvailableAgents(): Promise<AgentStatus[]> {
    const response = await api.get<ApiResponse<{ agents: AgentStatus[] }>>(
      '/chat/agents/available'
    );
    return response.data.data?.agents || [];
  },
};
