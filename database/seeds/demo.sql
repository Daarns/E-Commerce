BEGIN;

-- Public demo credentials only. Password for every account: password123
INSERT INTO users (id, email, password_hash, name, phone, role, status, is_verified, is_active)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'admin.demo@example.com', '$2a$12$D286.qPgYSsf.8bMJxpTquBMCxJRzKz6Zu1DT3DzMGoRT.q5GNP3W', 'Demo Admin', '+628110000001', 'admin', 'active', true, true),
  ('10000000-0000-4000-8000-000000000002', 'customer.demo@example.com', '$2a$12$D286.qPgYSsf.8bMJxpTquBMCxJRzKz6Zu1DT3DzMGoRT.q5GNP3W', 'Demo Customer', '+628110000002', 'customer', 'active', true, true),
  ('10000000-0000-4000-8000-000000000003', 'customer.two.demo@example.com', '$2a$12$D286.qPgYSsf.8bMJxpTquBMCxJRzKz6Zu1DT3DzMGoRT.q5GNP3W', 'Second Demo Customer', '+628110000003', 'customer', 'active', true, true)
ON CONFLICT DO NOTHING;

INSERT INTO addresses (id, user_id, name, phone, address_line1, city, province, postal_code, is_default)
VALUES
  ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Demo Customer', '+628110000002', 'Jalan Demo No. 10', 'Jakarta Selatan', 'DKI Jakarta', '12190', true),
  ('11000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'Second Demo Customer', '+628110000003', 'Jalan Contoh No. 20', 'Bandung', 'Jawa Barat', '40115', true)
ON CONFLICT DO NOTHING;

INSERT INTO categories (id, name, slug, description, display_order, is_active)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Demo Clothing', 'demo-clothing', 'Demo clothing products for local testing.', 1, true),
  ('20000000-0000-4000-8000-000000000002', 'Demo Shoes', 'demo-shoes', 'Demo footwear products for local testing.', 2, true),
  ('20000000-0000-4000-8000-000000000003', 'Demo Accessories', 'demo-accessories', 'Demo accessories for local testing.', 3, true)
ON CONFLICT DO NOTHING;

INSERT INTO products (
  id, name, slug, sku, description, short_description, regular_price, sale_price,
  stock_quantity, stock_alert_threshold, brand, category_id, status, view_count,
  sold_count, meta_title, meta_description
)
SELECT
  ('30000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  'Demo Product ' || LPAD(series::text, 2, '0'),
  'demo-product-' || LPAD(series::text, 2, '0'),
  'DEMO-SKU-' || LPAD(series::text, 3, '0'),
  'Reusable demo product for catalog, search, cart, wishlist, order, and review testing.',
  'Demo catalog product ' || LPAD(series::text, 2, '0'),
  100000 + (series * 25000),
  CASE WHEN series % 3 = 0 THEN 90000 + (series * 20000) ELSE NULL END,
  20 + series,
  5,
  'Demo Brand',
  CASE
    WHEN series <= 6 THEN '20000000-0000-4000-8000-000000000001'::uuid
    WHEN series <= 9 THEN '20000000-0000-4000-8000-000000000002'::uuid
    ELSE '20000000-0000-4000-8000-000000000003'::uuid
  END,
  'active',
  series * 15,
  series * 2,
  'Demo Product ' || LPAD(series::text, 2, '0'),
  'Sample product data for local e-commerce testing.'
FROM generate_series(1, 12) AS series
ON CONFLICT DO NOTHING;

INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary, width, height, aspect_ratio)
SELECT
  ('31000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  '/placeholder-product.svg',
  'Demo Product ' || LPAD(series::text, 2, '0'),
  0,
  true,
  800,
  800,
  1
FROM generate_series(1, 12) AS series
ON CONFLICT DO NOTHING;

INSERT INTO shipping_methods (id, code, name, description, price, estimated_days_min, estimated_days_max, is_active, display_order)
VALUES
  ('40000000-0000-4000-8000-000000000001', 'demo_regular', 'Demo Regular', 'Regular demo delivery.', 15000, 3, 5, true, 90),
  ('40000000-0000-4000-8000-000000000002', 'demo_express', 'Demo Express', 'Express demo delivery.', 30000, 1, 2, true, 91)
ON CONFLICT DO NOTHING;

INSERT INTO promo_codes (
  id, code, description, discount_type, discount_value, min_order_amount,
  max_discount_amount, usage_limit, usage_count, usage_limit_per_user,
  valid_from, valid_to, is_active
)
VALUES (
  '41000000-0000-4000-8000-000000000001', 'DEMO10', 'Ten percent demo discount.',
  'percentage', 10, 100000, 100000, 1000, 0, 5,
  NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', true
)
ON CONFLICT DO NOTHING;

INSERT INTO orders (
  id, order_number, user_id, shipping_name, shipping_phone, shipping_address_line1,
  shipping_city, shipping_province, shipping_postal_code, subtotal, shipping_cost,
  discount_amount, tax_amount, total, order_status, payment_status, payment_method,
  payment_provider, customer_email, shipping_method, tracking_number, paid_at,
  shipped_at, delivered_at, created_at, updated_at
)
SELECT
  ('50000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  'ORD-DEMO-' || LPAD(series::text, 4, '0'),
  '10000000-0000-4000-8000-000000000002'::uuid,
  'Demo Customer', '+628110000002', 'Jalan Demo No. 10', 'Jakarta Selatan',
  'DKI Jakarta', '12190', 100000 + (series * 25000), 15000, 0, 0,
  115000 + (series * 25000),
  (ARRAY['pending', 'payment_confirmed', 'processing', 'shipped', 'delivered', 'completed', 'refund_requested'])[series],
  CASE WHEN series = 1 THEN 'unpaid' ELSE 'paid' END,
  CASE WHEN series = 1 THEN 'midtrans_snap' ELSE 'bank_transfer' END,
  'demo', 'customer.demo@example.com', 'demo_regular',
  CASE WHEN series >= 4 THEN 'DEMO-TRACK-' || LPAD(series::text, 4, '0') ELSE '' END,
  CASE WHEN series >= 2 THEN NOW() - ((10 - series) || ' days')::interval ELSE NULL END,
  CASE WHEN series >= 4 THEN NOW() - ((8 - series) || ' days')::interval ELSE NULL END,
  CASE WHEN series >= 5 THEN NOW() - ((7 - series) || ' days')::interval ELSE NULL END,
  NOW() - ((12 - series) || ' days')::interval,
  NOW() - ((6 - LEAST(series, 6)) || ' days')::interval
FROM generate_series(1, 7) AS series
ON CONFLICT DO NOTHING;

INSERT INTO order_items (
  id, order_id, product_id, product_name, product_sku, quantity, unit_price, subtotal, created_at
)
SELECT
  ('51000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  ('30000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  'Demo Product ' || LPAD(series::text, 2, '0'),
  'DEMO-SKU-' || LPAD(series::text, 3, '0'),
  1,
  100000 + (series * 25000),
  100000 + (series * 25000),
  NOW() - ((12 - series) || ' days')::interval
FROM generate_series(1, 7) AS series
ON CONFLICT DO NOTHING;

INSERT INTO order_status_workflows (id, order_id, from_status, to_status, email_triggered, notes, created_at, updated_at)
SELECT
  ('52000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  ('50000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  CASE WHEN series = 1 THEN NULL ELSE 'pending' END,
  (ARRAY['pending', 'payment_confirmed', 'processing', 'shipped', 'delivered', 'completed', 'refund_requested'])[series],
  false,
  'Demo workflow state',
  NOW() - ((12 - series) || ' days')::interval,
  NOW() - ((12 - series) || ' days')::interval
FROM generate_series(1, 7) AS series
ON CONFLICT DO NOTHING;

INSERT INTO wishlists (id, user_id, product_id, created_at)
SELECT
  ('60000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  '10000000-0000-4000-8000-000000000002'::uuid,
  ('30000000-0000-4000-8000-' || LPAD(series::text, 12, '0'))::uuid,
  NOW() - (series || ' hours')::interval
FROM generate_series(1, 12) AS series
ON CONFLICT DO NOTHING;

INSERT INTO product_reviews (
  id, product_id, user_id, order_id, rating, title, review_text,
  is_verified_purchase, status, created_at, updated_at
)
VALUES (
  '61000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000002',
  '50000000-0000-4000-8000-000000000006',
  5, 'Good demo product', 'This review is generated only for local testing.',
  true, 'published', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
)
ON CONFLICT DO NOTHING;

UPDATE products
SET avg_rating = 5, review_count = 1
WHERE id = '30000000-0000-4000-8000-000000000006';

INSERT INTO conversations (
  id, user_id, agent_id, subject, status, priority, category, assigned_at,
  last_message, last_message_at, unread_customer_count, unread_agent_count
)
VALUES (
  '70000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'Demo support conversation', 'in_progress', 'normal', 'support', NOW() - INTERVAL '1 hour',
  'We are checking your demo order.', NOW() - INTERVAL '30 minutes', 1, 0
)
ON CONFLICT DO NOTHING;

INSERT INTO chat_messages (id, conversation_id, sender_id, message_type, message, is_read, created_at, updated_at)
VALUES
  ('71000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'text', 'Can you check my demo order?', true, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes'),
  ('71000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'text', 'We are checking your demo order.', false, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO notifications (id, user_id, type, title, message, link_url, is_read, metadata, created_at, updated_at)
VALUES
  ('80000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'order', 'Demo order is being processed', 'Your demo order is ready for fulfillment testing.', '/orders/ORD-DEMO-0003', false, '{"order_number":"ORD-DEMO-0003"}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  ('80000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'chat', 'New demo support reply', 'Support replied to your demo conversation.', '/chat', false, '{"conversation_id":"70000000-0000-4000-8000-000000000001"}', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

COMMIT;
