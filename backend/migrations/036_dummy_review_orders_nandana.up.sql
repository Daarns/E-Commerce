BEGIN;

WITH selected_user AS (
  SELECT id, email, name
  FROM users
  WHERE email = 'nandana219@gmail.com'
  LIMIT 1
),
target_products AS (
  SELECT
    id,
    name,
    sku,
    regular_price,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN name ILIKE '%corset%' THEN 1
          WHEN name ILIKE '%rok pendek%' THEN 2
          WHEN name ILIKE '%summer dress%' THEN 3
          WHEN name ILIKE '%dress%' THEN 4
          WHEN name ILIKE '%pixel%' THEN 5
          ELSE 20
        END,
        name ASC,
        id
    ) AS sequence_number
  FROM (
    SELECT DISTINCT ON (LOWER(name))
      id,
      name,
      sku,
      regular_price,
      created_at
    FROM products
    WHERE status = 'active'
      AND name IN ('Corset', 'Rok Pendek', 'Dress', 'Summer Dress', 'Google Pixel 8 Pro')
    ORDER BY LOWER(name), created_at DESC, id
  ) products
  LIMIT 5
),
dummy_orders AS (
  SELECT
    'ORD-DUMMY-REVIEW-NANDANA-' || LPAD(sequence_number::text, 3, '0') AS order_number,
    selected_user.id AS user_id,
    selected_user.email,
    COALESCE(NULLIF(selected_user.name, ''), 'Daarn') AS customer_name,
    target_products.regular_price AS product_price,
    target_products.sequence_number
  FROM selected_user
  JOIN target_products ON true
)
INSERT INTO orders (
  id,
  order_number,
  user_id,
  shipping_name,
  shipping_phone,
  shipping_address_line1,
  shipping_city,
  shipping_province,
  shipping_postal_code,
  subtotal,
  shipping_cost,
  discount_amount,
  tax_amount,
  total,
  order_status,
  payment_status,
  payment_method,
  payment_provider,
  customer_email,
  shipping_method,
  paid_at,
  shipped_at,
  delivered_at,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  order_number,
  user_id,
  customer_name,
  '+6285730652366',
  'Dummy review order address',
  'Malang',
  'Jawa Timur',
  '65125',
  product_price,
  0,
  0,
  0,
  product_price,
  'completed',
  'paid',
  'dummy_review',
  'manual',
  email,
  'regular',
  NOW() - ((sequence_number + 4) || ' days')::interval,
  NOW() - ((sequence_number + 3) || ' days')::interval,
  NOW() - ((sequence_number + 2) || ' days')::interval,
  NOW() - ((sequence_number + 5) || ' days')::interval,
  NOW() - ((sequence_number + 2) || ' days')::interval
FROM dummy_orders
ON CONFLICT (order_number) DO NOTHING;

WITH target_products AS (
  SELECT
    id,
    name,
    sku,
    regular_price,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN name ILIKE '%corset%' THEN 1
          WHEN name ILIKE '%rok pendek%' THEN 2
          WHEN name ILIKE '%summer dress%' THEN 3
          WHEN name ILIKE '%dress%' THEN 4
          WHEN name ILIKE '%pixel%' THEN 5
          ELSE 20
        END,
        name ASC,
        id
    ) AS sequence_number
  FROM (
    SELECT DISTINCT ON (LOWER(name))
      id,
      name,
      sku,
      regular_price,
      created_at
    FROM products
    WHERE status = 'active'
      AND name IN ('Corset', 'Rok Pendek', 'Dress', 'Summer Dress', 'Google Pixel 8 Pro')
    ORDER BY LOWER(name), created_at DESC, id
  ) products
  LIMIT 5
),
dummy_order_products AS (
  SELECT
    orders.id AS order_id,
    target_products.id AS product_id,
    target_products.name AS product_name,
    target_products.sku AS product_sku,
    target_products.regular_price AS product_price,
    target_products.sequence_number
  FROM target_products
  JOIN orders ON orders.order_number = 'ORD-DUMMY-REVIEW-NANDANA-' || LPAD(target_products.sequence_number::text, 3, '0')
)
INSERT INTO order_items (
  id,
  order_id,
  product_id,
  product_name,
  product_sku,
  quantity,
  unit_price,
  subtotal,
  created_at
)
SELECT
  uuid_generate_v4(),
  order_id,
  product_id,
  product_name,
  product_sku,
  1,
  product_price,
  product_price,
  NOW() - ((sequence_number + 5) || ' days')::interval
FROM dummy_order_products
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  WHERE oi.order_id = dummy_order_products.order_id
    AND oi.product_id = dummy_order_products.product_id
);

INSERT INTO order_status_workflows (
  id,
  order_id,
  from_status,
  to_status,
  email_triggered,
  notes,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  orders.id,
  'delivered',
  'completed',
  false,
  'Dummy completed order for product review testing by nandana219@gmail.com',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
FROM orders
WHERE orders.order_number LIKE 'ORD-DUMMY-REVIEW-NANDANA-%'
  AND NOT EXISTS (
    SELECT 1
    FROM order_status_workflows osw
    WHERE osw.order_id = orders.id
      AND osw.to_status = 'completed'
      AND osw.notes = 'Dummy completed order for product review testing by nandana219@gmail.com'
  );

COMMIT;
