-- Create email_queues table for async email processing
CREATE TABLE IF NOT EXISTS email_queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    html_body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    
    -- Retry tracking
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    last_error TEXT,
    next_retry TIMESTAMP,
    
    -- References
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Indexes for efficient querying
    CONSTRAINT email_queues_status_check CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Create indexes for efficient email queue processing
CREATE INDEX IF NOT EXISTS idx_email_queues_status ON email_queues(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queues_next_retry ON email_queues(next_retry) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_email_queues_created_at ON email_queues(created_at);
CREATE INDEX IF NOT EXISTS idx_email_queues_recipient_email ON email_queues(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_queues_email_type ON email_queues(email_type);
CREATE INDEX IF NOT EXISTS idx_email_queues_order_id ON email_queues(order_id);
CREATE INDEX IF NOT EXISTS idx_email_queues_user_id ON email_queues(user_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_queues_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_email_queues_timestamp ON email_queues;
CREATE TRIGGER trigger_email_queues_timestamp
BEFORE UPDATE ON email_queues
FOR EACH ROW
EXECUTE FUNCTION update_email_queues_timestamp();
