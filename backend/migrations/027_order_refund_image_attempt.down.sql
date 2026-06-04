DROP INDEX IF EXISTS idx_order_refund_images_order_attempt;

ALTER TABLE order_refund_images
DROP COLUMN IF EXISTS refund_attempt;
