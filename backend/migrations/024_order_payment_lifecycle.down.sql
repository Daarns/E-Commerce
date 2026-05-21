DROP INDEX IF EXISTS idx_orders_payment_expiry;

ALTER TABLE orders
  DROP COLUMN IF EXISTS payment_expires_at,
  DROP COLUMN IF EXISTS snap_token_created_at;
