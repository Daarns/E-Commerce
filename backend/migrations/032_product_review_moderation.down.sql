BEGIN;

DROP INDEX IF EXISTS idx_product_reviews_status_created;
DROP INDEX IF EXISTS idx_product_reviews_product_status_created;

ALTER TABLE product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_status_check;

ALTER TABLE review_helpful_votes
  ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE product_reviews
  ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'Asia/Jakarta',
  ALTER COLUMN updated_at TYPE timestamp USING updated_at AT TIME ZONE 'Asia/Jakarta';

COMMIT;
