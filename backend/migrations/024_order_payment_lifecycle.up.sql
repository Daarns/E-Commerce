ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS snap_token_created_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payment_expiry
  ON orders (payment_status, order_status, payment_expires_at)
  WHERE payment_expires_at IS NOT NULL;

UPDATE orders
SET payment_expires_at = created_at + INTERVAL '30 minutes'
WHERE order_status = 'pending'
  AND payment_status IN ('unpaid', 'pending_payment')
  AND payment_expires_at IS NULL;
