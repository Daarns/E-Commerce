-- Create webhook_events table for Midtrans idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
    external_id   TEXT        PRIMARY KEY,   -- Midtrans order_id or transaction_id
    provider      TEXT        NOT NULL DEFAULT 'midtrans',
    event_type    TEXT        NOT NULL,
    processed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup by processed status
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
    ON webhook_events (processed_at)
    WHERE processed_at IS NULL;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
    ON webhook_events (created_at);
