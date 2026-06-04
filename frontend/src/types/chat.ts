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
  reaction_count?: number;
  reactions?: Array<{ emoji: string; user_ids: string[] }>;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
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

export interface ChatPaginationMeta {
  page: number;
  per_page?: number;
  limit?: number;
  total: number;
  total_pages: number;
}

export interface AgentStatus {
  id: string;
  agent_id: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  active_conversations: number;
  last_status_update: string;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

export interface MessageReaction {
  message_id: string;
  emoji: string;
  user_id: string;
}

export interface ChatAdminSummary {
  unread_agent_count: number;
}
