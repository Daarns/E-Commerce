import api from '@/services/api';
import { ApiResponse } from '@/types';
import {
  ChatAdminSummary,
  ChatMessage,
  ChatPaginationMeta,
  Conversation,
  ConversationStatus,
  CreateConversationInput,
  SendMessageInput,
} from '@/types/chat';

interface ChatApiErrorShape {
  response?: {
    data?: ApiResponse<unknown>;
    status?: number;
  };
}

interface BackendConversationList {
  conversations: Conversation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ConversationListResponse {
  conversations: Conversation[];
  meta: ChatPaginationMeta;
}

interface ConversationMessagesResponse {
  messages: ChatMessage[];
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

function mapListResponse(data: BackendConversationList | undefined): ConversationListResponse {
  return {
    conversations: data?.conversations ?? [],
    meta: {
      page: data?.page ?? 1,
      per_page: data?.page_size ?? 20,
      total: data?.total ?? 0,
      total_pages: data?.total_pages ?? 0,
    },
  };
}

export function getChatErrorMessage(error: unknown): string {
  const apiError = error as ChatApiErrorShape;
  const code = apiError.response?.data?.error?.code;
  const message = apiError.response?.data?.error?.message;
  const status = apiError.response?.status;

  if (status === 429 || code === 'TOO_MANY_REQUESTS') {
    return 'Mohon tunggu beberapa saat lagi sebelum mengirim pesan berikutnya.';
  }
  if (code === 'SEND_FAILED' && message === 'conversation is closed') {
    return 'Percakapan ini sudah ditutup. Mulai chat baru ya kalau masih butuh bantuan.';
  }
  if (code === 'FORBIDDEN') {
    return 'Kamu tidak punya akses ke percakapan ini.';
  }
  if (code === 'UNAUTHORIZED') {
    return 'Sesi kamu sudah berakhir. Silakan login lagi.';
  }
  if (code === 'VALIDATION_ERROR') {
    return 'Pesannya belum sesuai. Cek lagi isi chat kamu.';
  }
  if (code === 'CREATE_FAILED') {
    return 'Chat belum bisa dibuat. Coba beberapa saat lagi.';
  }

  return message || 'Chat sedang bermasalah. Coba lagi sebentar lagi.';
}

export const chatService = {
  async getConversations(page: number = 1, limit: number = 20): Promise<ConversationListResponse> {
    const response = await api.get<ApiResponse<BackendConversationList>>(
      `/chat/conversations?page=${page}&limit=${limit}`
    );
    return mapListResponse(response.data.data);
  },

  async getAdminConversations(params: {
    page?: number;
    limit?: number;
    status?: ConversationStatus | 'all';
    search?: string;
  } = {}): Promise<ConversationListResponse> {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 1));
    query.set('limit', String(params.limit ?? 20));
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.search?.trim()) query.set('search', params.search.trim());

    const response = await api.get<ApiResponse<BackendConversationList>>(
      `/admin/chat/conversations?${query.toString()}`
    );
    return mapListResponse(response.data.data);
  },

  async getAdminSummary(): Promise<ChatAdminSummary> {
    const response = await api.get<ApiResponse<ChatAdminSummary>>('/admin/chat/summary');
    return response.data.data ?? { unread_agent_count: 0 };
  },

  async getConversation(conversationId: string, admin = false): Promise<Conversation> {
    const basePath = admin ? '/admin/chat' : '/chat';
    const response = await api.get<ApiResponse<Conversation>>(
      `${basePath}/conversations/${conversationId}`
    );
    return response.data.data!;
  },

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const response = await api.post<ApiResponse<Conversation>>('/chat/conversations', {
      subject: input.subject,
      message: input.message,
      category: input.category ?? 'support',
      priority: input.priority ?? 'normal',
    });
    return response.data.data!;
  },

  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus
  ): Promise<void> {
    await api.put(`/admin/chat/conversations/${conversationId}/status`, { status });
  },

  async closeConversation(conversationId: string): Promise<Conversation> {
    await this.updateConversationStatus(conversationId, 'closed');
    return this.getConversation(conversationId, true);
  },

  async getMessages(
    conversationId: string,
    options: { limit?: number; offset?: number; admin?: boolean } = {}
  ): Promise<ConversationMessagesResponse> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const basePath = options.admin ? '/admin/chat' : '/chat';
    const response = await api.get<ApiResponse<{ messages: ChatMessage[]; count: number }>>(
      `${basePath}/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`
    );

    return {
      messages: response.data.data?.messages ?? [],
      meta: {
        count: response.data.data?.count ?? 0,
        limit,
        offset,
      },
    };
  },

  async sendMessage(
    conversationId: string,
    input: SendMessageInput,
    admin = false
  ): Promise<ChatMessage> {
    const basePath = admin ? '/admin/chat' : '/chat';
    const response = await api.post<ApiResponse<ChatMessage>>(
      `${basePath}/conversations/${conversationId}/messages`,
      {
        message: input.message,
        message_type: 'text',
      }
    );
    return response.data.data!;
  },

  async markConversationAsRead(conversationId: string): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/read`, {});
  },

  async markAdminConversationAsRead(conversationId: string): Promise<void> {
    await api.put(`/admin/chat/conversations/${conversationId}/read`, {});
  },

  async addReaction(messageId: string, reaction: string): Promise<void> {
    await api.post(`/chat/messages/${messageId}/reactions`, {
      message_id: messageId,
      reaction,
    });
  },

  async removeReaction(messageId: string, reaction: string): Promise<void> {
    await api.delete(`/chat/messages/${messageId}/reactions/${reaction}`);
  },
};
