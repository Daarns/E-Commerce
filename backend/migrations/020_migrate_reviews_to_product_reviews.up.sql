BEGIN;

ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS is_verified_purchase boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending';

INSERT INTO product_reviews (
  id,
  product_id,
  user_id,
  order_id,
  rating,
  title,
  review_text,
  helpful_count,
  unhelpful_count,
  is_verified_purchase,
  status,
  created_at,
  updated_at
)
SELECT
  r.id,
  r.product_id,
  r.user_id,
  r.order_id,
  r.rating,
  r.title,
  r.comment AS review_text,
  COALESCE(r.helpful_count, 0) AS helpful_count,
  0 AS unhelpful_count,
  COALESCE(r.is_verified_purchase, false) AS is_verified_purchase,
  r.status,
  r.created_at,
  r.updated_at
FROM reviews r
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  user_id = EXCLUDED.user_id,
  order_id = EXCLUDED.order_id,
  rating = EXCLUDED.rating,
  title = EXCLUDED.title,
  review_text = EXCLUDED.review_text,
  helpful_count = EXCLUDED.helpful_count,
  unhelpful_count = EXCLUDED.unhelpful_count,
  is_verified_purchase = EXCLUDED.is_verified_purchase,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

INSERT INTO review_helpful_votes (
  id,
  review_id,
  user_id,
  is_helpful,
  created_at
)
SELECT
  rh.id,
  rh.review_id,
  rh.user_id,
  true AS is_helpful,
  rh.created_at
FROM review_helpful rh
ON CONFLICT (id) DO UPDATE SET
  review_id = EXCLUDED.review_id,
  user_id = EXCLUDED.user_id,
  is_helpful = EXCLUDED.is_helpful,
  created_at = EXCLUDED.created_at;

ALTER TABLE review_images
  DROP CONSTRAINT IF EXISTS review_images_review_id_fkey,
  ADD CONSTRAINT review_images_review_id_fkey
    FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE;

ALTER TABLE review_helpful_votes
  DROP CONSTRAINT IF EXISTS review_helpful_votes_review_id_fkey,
  ADD CONSTRAINT review_helpful_votes_review_id_fkey
    FOREIGN KEY (review_id) REFERENCES product_reviews(id) ON DELETE CASCADE;

DROP TRIGGER IF EXISTS trg_sync_review_helpful_count ON review_helpful;
DROP FUNCTION IF EXISTS sync_review_helpful_count();
DROP TABLE IF EXISTS review_helpful CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

DROP MATERIALIZED VIEW IF EXISTS dashboard_stats;

CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE) as today_orders,
    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at >= CURRENT_DATE AND payment_status = 'paid') as today_revenue,
    (SELECT COUNT(*) FROM orders WHERE order_status = 'pending') as pending_orders,
    (SELECT COUNT(*) FROM products WHERE stock_quantity < stock_alert_threshold AND stock_quantity > 0) as low_stock_count,
    (SELECT COUNT(*) FROM products WHERE stock_quantity = 0 AND status = 'active') as out_of_stock_count,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as today_new_customers,
    (SELECT COUNT(*) FROM product_reviews WHERE status = 'pending') as pending_reviews;

CREATE UNIQUE INDEX idx_dashboard_stats ON dashboard_stats ((1));

COMMIT;
