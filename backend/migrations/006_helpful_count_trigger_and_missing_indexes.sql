-- ============================================================
-- Migration: helpful_count trigger + missing performance indexes
-- ============================================================

-- ------------------------------------------------------------
-- 1. TRIGGER: Keep helpful_count in sync with review_helpful
-- ------------------------------------------------------------
-- Problem: helpful_count can drift if rows are inserted/deleted
--   outside application code (e.g. manual SQL, cascade deletes).
-- Solution: database-level trigger that is ALWAYS consistent.

CREATE OR REPLACE FUNCTION sync_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE reviews
           SET helpful_count = helpful_count + 1
         WHERE id = NEW.review_id;
        RETURN NEW;

    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE reviews
           SET helpful_count = GREATEST(helpful_count - 1, 0)
         WHERE id = OLD.review_id;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop first to make this migration idempotent (safe to re-run)
DROP TRIGGER IF EXISTS trg_sync_review_helpful_count ON review_helpful;

CREATE TRIGGER trg_sync_review_helpful_count
AFTER INSERT OR DELETE ON review_helpful
FOR EACH ROW
EXECUTE FUNCTION sync_review_helpful_count();

-- ------------------------------------------------------------
-- 2. RESYNC: Fix any existing drift between the two tables
-- ------------------------------------------------------------
-- Run once to correct helpful_count for all reviews that were
-- inserted before this trigger existed.
UPDATE reviews r
   SET helpful_count = (
       SELECT COUNT(*) FROM review_helpful rh WHERE rh.review_id = r.id
   );

-- ------------------------------------------------------------
-- 3. MISSING INDEXES
-- ------------------------------------------------------------

-- 3a. Orders: filter by status + sort by date (admin order list,
--     customer order history, status-based queries)
CREATE INDEX IF NOT EXISTS idx_orders_status_created
    ON orders(order_status, created_at DESC);

-- 3b. Reviews: product page review list filtered by approval status
--     (most common query: approved reviews for a product)
CREATE INDEX IF NOT EXISTS idx_reviews_product_status
    ON reviews(product_id, status);

-- 3c. Notifications: unread count badge + notification bell
--     Partial index on is_read = false only (smaller, faster)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, is_read)
    WHERE is_read = false;

-- 3d. Stock alerts: background job polling un-notified alerts per product
--     Partial index on is_notified = false only
CREATE INDEX IF NOT EXISTS idx_stock_alerts_product_notified
    ON stock_alerts(product_id, is_notified)
    WHERE is_notified = false;

-- 3e. Refresh tokens: cleanup job that deletes expired tokens
--     (runs periodically, needs fast scan on expires_at)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires
    ON refresh_tokens(expires_at);
