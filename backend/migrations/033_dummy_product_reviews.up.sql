BEGIN;

WITH eligible_items AS (
  SELECT DISTINCT ON (oi.product_id, o.user_id)
    oi.product_id,
    o.user_id,
    o.id AS order_id,
    p.name AS product_name,
    ROW_NUMBER() OVER (ORDER BY o.created_at DESC, o.id) AS sequence_number
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.order_status = 'completed'
    AND o.payment_status IN ('paid', 'refunded')
    AND NOT EXISTS (
      SELECT 1
      FROM product_reviews pr
      WHERE pr.product_id = oi.product_id
        AND pr.user_id = o.user_id
    )
  ORDER BY oi.product_id, o.user_id, o.created_at DESC
  LIMIT 12
),
inserted_reviews AS (
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
    uuid_generate_v4(),
    product_id,
    user_id,
    order_id,
    CASE sequence_number % 5
      WHEN 0 THEN 5
      WHEN 1 THEN 5
      WHEN 2 THEN 4
      WHEN 3 THEN 4
      ELSE 3
    END,
    'Dummy review: ' || product_name,
    CASE sequence_number % 4
      WHEN 0 THEN 'Produk sesuai deskripsi dan kualitasnya memuaskan.'
      WHEN 1 THEN 'Pengiriman rapi, produk nyaman digunakan, dan ukuran sesuai.'
      WHEN 2 THEN 'Barang bagus untuk harga ini, akan dipertimbangkan beli lagi.'
      ELSE 'Kualitas cukup baik, warna dan detail produk sesuai ekspektasi.'
    END,
    GREATEST(0, 6 - sequence_number),
    0,
    true,
    'approved',
    NOW() - (sequence_number || ' days')::interval,
    NOW() - (sequence_number || ' days')::interval
  FROM eligible_items
  ON CONFLICT (product_id, user_id) DO NOTHING
  RETURNING product_id
),
review_stats AS (
  SELECT
    product_id,
    COALESCE(AVG(rating::decimal), 0) AS average_rating,
    COUNT(*) AS review_count
  FROM product_reviews
  WHERE status = 'approved'
    AND product_id IN (SELECT product_id FROM inserted_reviews)
  GROUP BY product_id
)
UPDATE products p
SET
  avg_rating = review_stats.average_rating,
  review_count = review_stats.review_count
FROM review_stats
WHERE p.id = review_stats.product_id;

COMMIT;
