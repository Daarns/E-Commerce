ALTER TABLE product_reviews
DROP CONSTRAINT IF EXISTS unique_product_user_review;

DROP INDEX IF EXISTS unique_product_user_review;

CREATE UNIQUE INDEX IF NOT EXISTS unique_product_user_order_review
ON product_reviews(product_id, user_id, order_id)
WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_reviews_user_product_order
ON product_reviews(user_id, product_id, order_id);
