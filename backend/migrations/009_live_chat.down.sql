-- Phase 9M: Live Chat Integration - Rollback

-- Drop tables in reverse order of creation
DROP TABLE IF EXISTS conversation_metadata CASCADE;
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS agent_status CASCADE;
DROP TABLE IF EXISTS conversation_tags CASCADE;
DROP TABLE IF EXISTS chat_attachments CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
