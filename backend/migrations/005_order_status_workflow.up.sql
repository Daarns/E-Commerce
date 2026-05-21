-- Create order_status_workflows table for tracking status transitions
CREATE TABLE IF NOT EXISTS order_status_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  email_triggered BOOLEAN DEFAULT FALSE,
  email_type VARCHAR(50),
  triggered_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for order_status_workflows
CREATE INDEX IF NOT EXISTS idx_order_status_workflows_order_id ON order_status_workflows(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_workflows_to_status ON order_status_workflows(to_status);
CREATE INDEX IF NOT EXISTS idx_order_status_workflows_email_triggered ON order_status_workflows(email_triggered);
CREATE INDEX IF NOT EXISTS idx_order_status_workflows_created_at ON order_status_workflows(created_at);

-- Auto-update function for order_status_workflows
CREATE OR REPLACE FUNCTION update_order_status_workflows_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-update
DROP TRIGGER IF EXISTS update_order_status_workflows_timestamp ON order_status_workflows;
CREATE TRIGGER update_order_status_workflows_timestamp
BEFORE UPDATE ON order_status_workflows
FOR EACH ROW
EXECUTE FUNCTION update_order_status_workflows_timestamp();

-- Ensure newsletter_subscriptions table exists (from migration 003)
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_confirmation',
    confirmation_token VARCHAR(255),
    confirmation_token_expires_at TIMESTAMP,
    unsubscribe_token VARCHAR(255),
    subscribed_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create unique indexes separately to avoid syntax errors
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_confirmation_token ON newsletter_subscriptions(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_unsubscribe_token ON newsletter_subscriptions(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;

-- Add category_preferences and notification_frequency to newsletter_subscriptions if not exists
ALTER TABLE newsletter_subscriptions
ADD COLUMN IF NOT EXISTS category_preferences JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS notification_frequency VARCHAR(20) DEFAULT 'weekly',
ADD COLUMN IF NOT EXISTS preferences_updated_at TIMESTAMP;

-- Create indexes for newsletter_subscriptions queries if not exist
CREATE INDEX IF NOT EXISTS idx_newsletter_frequency ON newsletter_subscriptions(notification_frequency);
CREATE INDEX IF NOT EXISTS idx_newsletter_preferences ON newsletter_subscriptions USING GIN(category_preferences);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed ON newsletter_subscriptions(status) WHERE status = 'subscribed';
CREATE INDEX IF NOT EXISTS idx_newsletter_created_at ON newsletter_subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_status_created_at ON newsletter_subscriptions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_deleted_at ON newsletter_subscriptions(deleted_at);
