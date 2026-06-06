BEGIN;

WITH selected_product AS (
  SELECT
    id,
    name,
    sku,
    regular_price
  FROM products
  WHERE status = 'active'
    AND name ILIKE '%corset%'
  ORDER BY created_at DESC
  LIMIT 1
),
selected_user AS (
  SELECT id, email, name
  FROM users
  WHERE role = 'customer'
  ORDER BY created_at DESC
  LIMIT 1
),
inserted_order AS (
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
    delivered_at,
    created_at,
    updated_at
  )
  SELECT
    uuid_generate_v4(),
    'ORD-DUMMY-REVIEW-CORSET',
    selected_user.id,
    COALESCE(NULLIF(selected_user.name, ''), 'Review Dummy Customer'),
    '+628000000000',
    'Dummy review address',
    'Jakarta',
    'DKI Jakarta',
    '12345',
    selected_product.regular_price,
    0,
    0,
    0,
    selected_product.regular_price,
    'completed',
    'paid',
    'dummy_review',
    'manual',
    selected_user.email,
    'regular',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 day'
  FROM selected_product, selected_user
  WHERE NOT EXISTS (
    SELECT 1 FROM orders WHERE order_number = 'ORD-DUMMY-REVIEW-CORSET'
  )
  RETURNING id, user_id
),
target_order AS (
  SELECT id, user_id
  FROM inserted_order
  UNION ALL
  SELECT id, user_id
  FROM orders
  WHERE order_number = 'ORD-DUMMY-REVIEW-CORSET'
  LIMIT 1
),
inserted_item AS (
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
    target_order.id,
    selected_product.id,
    selected_product.name,
    selected_product.sku,
    1,
    selected_product.regular_price,
    selected_product.regular_price,
    NOW() - INTERVAL '2 days'
  FROM target_order, selected_product
  WHERE NOT EXISTS (
    SELECT 1
    FROM order_items
    WHERE order_id = target_order.id
      AND product_id = selected_product.id
  )
  RETURNING order_id
)
INSERT INTO order_status_workflows (
  id,
  order_id,
  from_status,
  to_status,
  notes,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  target_order.id,
  'delivered',
  'completed',
  'Dummy completed order for product review testing',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
FROM target_order
WHERE NOT EXISTS (
  SELECT 1
  FROM order_status_workflows
  WHERE order_id = target_order.id
    AND to_status = 'completed'
    AND notes = 'Dummy completed order for product review testing'
);

COMMIT;
