-- Rollback: Drop newsletter_subscriptions table and related objects
-- This migration reverses 003_newsletter_subscriptions

DROP TRIGGER IF EXISTS update_newsletter_subscriptions_updated_at ON newsletter_subscriptions;
DROP TABLE IF EXISTS newsletter_subscriptions;
