-- Phase 9M: Live Chat Integration

-- Conversations table for managing chat sessions
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(50) NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'billing', 'support', 'product', 'complaint')),
    assigned_at TIMESTAMP,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    INDEX idx_conversations_user (user_id),
    INDEX idx_conversations_agent (agent_id),
    INDEX idx_conversations_status (status),
    INDEX idx_conversations_priority (priority),
    INDEX idx_conversations_created (created_at DESC),
    INDEX idx_conversations_last_message (last_message_at DESC)
);

-- Chat messages table for conversation history
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    file_url TEXT,
    file_name TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    INDEX idx_chat_messages_conversation (conversation_id),
    INDEX idx_chat_messages_sender (sender_id),
    INDEX idx_chat_messages_created (created_at DESC),
    INDEX idx_chat_messages_unread (is_read)
);

-- Chat attachments for file handling
CREATE TABLE chat_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INT,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_chat_attachments_message (message_id)
);

-- Conversation tags for categorization
CREATE TABLE conversation_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(conversation_id, tag_name),
    INDEX idx_conversation_tags_name (tag_name)
);

-- Agent availability and status
CREATE TABLE agent_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'busy', 'offline')),
    active_conversations INT DEFAULT 0,
    max_conversations INT DEFAULT 5,
    last_heartbeat TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(user_id),
    INDEX idx_agent_status_status (status)
);

-- Typing indicators for real-time UX
CREATE TABLE typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(conversation_id, user_id),
    INDEX idx_typing_indicators_conversation (conversation_id),
    INDEX idx_typing_indicators_expires (expires_at)
);

-- Message reactions/emotions
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL DEFAULT 'thumbs_up' CHECK (reaction IN ('thumbs_up', 'thumbs_down', 'laugh', 'cry', 'heart', 'fire')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction),
    INDEX idx_message_reactions_message (message_id)
);

-- Conversation metadata and analytics
CREATE TABLE conversation_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_count INT DEFAULT 0,
    user_message_count INT DEFAULT 0,
    agent_message_count INT DEFAULT 0,
    avg_response_time_seconds INT,
    satisfaction_score INT CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
    feedback_text TEXT,
    resolved_by_agent BOOLEAN,
    resolution_category TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(conversation_id),
    INDEX idx_conversation_metadata_satisfaction (satisfaction_score)
);

-- Create indexes for optimal performance
CREATE INDEX idx_conversations_user_status ON conversations(user_id, status);
CREATE INDEX idx_conversations_agent_status ON conversations(agent_id, status);
CREATE INDEX idx_chat_messages_unread_conversation ON chat_messages(conversation_id, is_read);
CREATE INDEX idx_agent_status_active ON agent_status(status, active_conversations);
