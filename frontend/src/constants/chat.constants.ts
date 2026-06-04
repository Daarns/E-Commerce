import type { ConversationStatus } from '@/types/chat';

export const DEFAULT_CHAT_SUBJECT = 'Support Request';

export const CHAT_CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  open: 'Aktif',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  closed: 'Ditutup',
};

export const CHAT_CONVERSATION_STATUS_DESCRIPTIONS: Record<ConversationStatus, string> = {
  open: 'Percakapan masih bisa dibalas.',
  in_progress: 'CS sedang menangani percakapan ini.',
  resolved: 'Percakapan sudah selesai dan hanya bisa dilihat sebagai riwayat.',
  closed: 'Percakapan sudah ditutup dan hanya bisa dilihat sebagai riwayat.',
};

export const CHAT_READ_ONLY_STATUSES = ['resolved', 'closed'] as const;
