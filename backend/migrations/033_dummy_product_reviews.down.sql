BEGIN;

CREATE TEMP TABLE deleted_dummy_review_products ON COMMIT DROP AS
SELECT DISTINCT product_id
FROM product_reviews
WHERE title LIKE 'Dummy review:%';

DELETE FROM product_reviews
WHERE title LIKE 'Dummy review:%';

WITH review_stats AS (
  SELECT
    product_id,
    COALESCE(AVG(rating::decimal), 0) AS average_rating,
    COUNT(*) AS review_count
  FROM product_reviews
  WHERE status = 'approved'
    AND product_id IN (SELECT product_id FROM deleted_dummy_review_products)
  GROUP BY product_id
)
UPDATE products p
SET
  avg_rating = COALESCE(review_stats.average_rating, 0),
  review_count = COALESCE(review_stats.review_count, 0)
FROM deleted_dummy_review_products deleted
LEFT JOIN review_stats ON review_stats.product_id = deleted.product_id
WHERE p.id = deleted.product_id;

COMMIT;
