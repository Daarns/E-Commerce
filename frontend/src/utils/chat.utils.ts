import {
  CHAT_CONVERSATION_STATUS_DESCRIPTIONS,
  CHAT_CONVERSATION_STATUS_LABELS,
  CHAT_READ_ONLY_STATUSES,
} from '@/constants/chat.constants';
import type { ChatMessage, ConversationStatus } from '@/types/chat';

export function getChatStatusLabel(status: ConversationStatus): string {
  return CHAT_CONVERSATION_STATUS_LABELS[status];
}

export function getChatStatusDescription(status: ConversationStatus): string {
  return CHAT_CONVERSATION_STATUS_DESCRIPTIONS[status];
}

export function isChatConversationReadOnly(status: ConversationStatus): boolean {
  return CHAT_READ_ONLY_STATUSES.some((entry) => entry === status);
}

export function uniqueChatMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  return messages.filter((message) => {
    if (seen.has(message.id)) {
      return false;
    }
    seen.add(message.id);
    return true;
  });
}
