BEGIN;

CREATE TABLE IF NOT EXISTS review_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE review_images
  DROP CONSTRAINT IF EXISTS review_images_review_id_fkey,
  ADD CONSTRAINT review_images_review_id_fkey
    FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE;

ALTER TABLE review_images
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Jakarta';

CREATE INDEX IF NOT EXISTS idx_review_images_review
  ON review_images(review_id);

COMMIT;
