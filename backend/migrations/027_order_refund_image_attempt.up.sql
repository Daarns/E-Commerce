ALTER TABLE order_refund_images
ADD COLUMN IF NOT EXISTS refund_attempt INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_order_refund_images_order_attempt
    ON order_refund_images(order_id, refund_attempt, position, created_at);
