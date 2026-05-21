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
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for activity_logs table
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_action ON activity_logs(action_type);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_user_action ON activity_logs(user_id, action_type);
CREATE INDEX idx_activity_user_date ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_user_action_date ON activity_logs(user_id, action_type, created_at DESC);
