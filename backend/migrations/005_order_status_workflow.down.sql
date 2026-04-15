-- Rollback: remove order_status_workflows table
DROP TRIGGER IF EXISTS update_order_status_workflows_timestamp ON order_status_workflows;
DROP TABLE IF EXISTS order_status_workflows;

-- Rollback: remove newsletter preferences fields
ALTER TABLE newsletter_subscriptions
DROP COLUMN IF EXISTS preferences_updated_at,
DROP COLUMN IF EXISTS notification_frequency,
DROP COLUMN IF EXISTS category_preferences;

-- Drop indexes (if they exist)
DROP INDEX IF EXISTS idx_newsletter_frequency;
DROP INDEX IF EXISTS idx_newsletter_preferences;
