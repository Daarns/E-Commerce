-- Migration: Create newsletter_subscriptions table
-- Purpose: Store newsletter subscription data with double-opt-in support

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_confirmation',
    confirmation_token VARCHAR(255),
    confirmation_token_expires_at TIMESTAMP,
    unsubscribe_token VARCHAR(255),
    subscribed_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    
    -- Ensure tokens are unique only when not null (partial index)
    UNIQUE(confirmation_token) WHERE confirmation_token IS NOT NULL,
    UNIQUE(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_confirmation_token ON newsletter_subscriptions(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_unsubscribe_token ON newsletter_subscriptions(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_created_at ON newsletter_subscriptions(created_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_status_created_at ON newsletter_subscriptions(status, created_at);

-- Index for finding all active subscribers (for email campaigns)
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed ON newsletter_subscriptions(status) WHERE status = 'subscribed';

-- Soft delete index
CREATE INDEX IF NOT EXISTS idx_newsletter_deleted_at ON newsletter_subscriptions(deleted_at);
