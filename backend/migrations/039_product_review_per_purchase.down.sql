DROP INDEX IF EXISTS idx_product_reviews_user_product_order;
DROP INDEX IF EXISTS unique_product_user_order_review;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM product_reviews
    GROUP BY product_id, user_id
    HAVING COUNT(*) > 1
  ) THEN
    ALTER TABLE product_reviews
    ADD CONSTRAINT unique_product_user_review UNIQUE(product_id, user_id);
  END IF;
END $$;
