-- Phase 19B: User Activity Logging & CSV Export

-- Activity logs table for tracking user actions
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_action (action_type),
    INDEX idx_activity_created (created_at DESC),
    INDEX idx_activity_user_action (user_id, action_type),
    INDEX idx_activity_user_date (user_id, created_at DESC)
);

-- Index for common activity queries (user + date range)
CREATE INDEX idx_activity_user_action_date ON activity_logs(user_id, action_type, created_at DESC);

-- Index for activity filtering by date range
CREATE INDEX idx_activity_date_range ON activity_logs(created_at DESC) WHERE deleted_at IS NULL;
