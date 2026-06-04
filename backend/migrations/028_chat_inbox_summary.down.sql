DROP INDEX IF EXISTS idx_chat_messages_conversation_created;
DROP INDEX IF EXISTS idx_conversations_user_last_message;
DROP INDEX IF EXISTS idx_conversations_status_last_message;

ALTER TABLE conversations
  DROP COLUMN IF EXISTS unread_agent_count,
  DROP COLUMN IF EXISTS unread_customer_count,
  DROP COLUMN IF EXISTS last_message;
