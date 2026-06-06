BEGIN;

DROP INDEX IF EXISTS idx_review_images_review;

ALTER TABLE review_images
  DROP CONSTRAINT IF EXISTS review_images_review_id_fkey,
  ADD CONSTRAINT review_images_review_id_fkey
    FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE;

COMMIT;
