-- Create order_status_workflows table for tracking status transitions
CREATE TABLE order_status_workflows (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  email_triggered BOOLEAN DEFAULT FALSE,
  email_type VARCHAR(50),
  triggered_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_to_status (to_status),
  INDEX idx_email_triggered (email_triggered),
  INDEX idx_created_at (created_at)
);

-- Add auto-update trigger for updated_at
CREATE TRIGGER update_order_status_workflows_timestamp
BEFORE UPDATE ON order_status_workflows
FOR EACH ROW
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
END;

-- Add category_preferences and notification_frequency to newsletter_subscriptions
ALTER TABLE newsletter_subscriptions
ADD COLUMN category_preferences JSONB DEFAULT '[]' AFTER status,
ADD COLUMN notification_frequency VARCHAR(20) DEFAULT 'weekly' AFTER category_preferences,
ADD COLUMN preferences_updated_at TIMESTAMP AFTER notification_frequency;

-- Create index for frequent queries
CREATE INDEX idx_newsletter_frequency ON newsletter_subscriptions(notification_frequency);
CREATE INDEX idx_newsletter_preferences ON newsletter_subscriptions USING GIN(category_preferences);
