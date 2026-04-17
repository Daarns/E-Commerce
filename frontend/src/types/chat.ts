// Chat types and interfaces
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'customer' | 'agent';
  message_text: string;
  created_at: string;
  is_read: boolean;
  reactions?: Array<{ emoji: string; user_ids: string[] }>;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface Conversation {
  id: string;
  user_id: string;
  agent_id?: string;
  status: 'open' | 'closed' | 'pending' | 'resolved';
  subject?: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  messages?: ChatMessage[];
  tags?: string[];
}

export interface CreateConversationInput {
  subject?: string;
  initial_message: string;
  tags?: string[];
}

export interface SendMessageInput {
  message_text: string;
  attachments?: File[];
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
