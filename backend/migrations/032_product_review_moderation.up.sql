BEGIN;

ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS is_verified_purchase boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'pending';

ALTER TABLE product_reviews
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Jakarta',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE review_helpful_votes
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE product_reviews
  DROP CONSTRAINT IF EXISTS product_reviews_status_check,
  ADD CONSTRAINT product_reviews_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status_created
  ON product_reviews(product_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_reviews_status_created
  ON product_reviews(status, created_at DESC);

COMMIT;
