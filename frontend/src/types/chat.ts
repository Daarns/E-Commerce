export interface ChatUser {
  id: string;
  email: string;
  full_name: string;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: ChatUser;
  message: string;
  message_type: 'text';
  created_at: string;
  is_read: boolean;
  read_at?: string;
}

export type ConversationStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ConversationCategory = 'general' | 'billing' | 'support' | 'product' | 'complaint';
export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Conversation {
  id: string;
  user_id: string;
  user?: ChatUser;
  agent_id?: string;
  agent?: ChatUser;
  status: ConversationStatus;
  subject: string;
  category: ConversationCategory;
  priority: ConversationPriority;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  unread_customer_count?: number;
  unread_agent_count?: number;
  messages?: ChatMessage[];
}

export interface CreateConversationInput {
  subject: string;
  message: string;
  category?: ConversationCategory;
  priority?: ConversationPriority;
}

export interface SendMessageInput {
  message: string;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

export interface ChatPaginationMeta {
  page: number;
  per_page?: number;
  limit?: number;
  total: number;
  total_pages: number;
}

export interface ChatAdminSummary {
  unread_agent_count: number;
}
