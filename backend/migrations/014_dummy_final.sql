-- ============================================================================
-- FINAL DUMMY DATA - Using actual database column names
-- Purpose: 2-3 records per table for functional testing
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update existing products to have better metrics for featured/search
UPDATE products SET sold_count = 50, view_count = 200 WHERE id IN (SELECT id FROM products LIMIT 5);

-- ============================================================================
-- 1. ADDRESSES (10 records across 3 users)
-- ============================================================================
INSERT INTO addresses (user_id, name, phone, address_line1, address_line2, city, province, postal_code, is_default)
SELECT id, 'Alamat Rumah Utama', '08123456789', 'Jl. Merpati No. 42', 'Apartemen Pelangi Blok C Lt. 8', 'Jakarta', 'DKI Jakarta', '12870', true
FROM users WHERE role = 'customer' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO addresses (user_id, name, phone, address_line1, address_line2, city, province, postal_code, is_default)
SELECT id, 'Alamat Kantor', '08123456789', 'Jl. Sudirman Blok C No. 100', 'Lantai 15 Tower A', 'Jakarta', 'DKI Jakarta', '12190', false
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

INSERT INTO addresses (user_id, name, phone, address_line1, address_line2, city, province, postal_code, is_default)
SELECT id, 'Alamat Teman', '08234567890', 'Jl. Ahmad Yani No. 77', 'Komplek Permata Hijau', 'Bandung', 'Jawa Barat', '40173', true
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. CART_ITEMS
-- ============================================================================
INSERT INTO cart_items (user_id, product_id, variant_id, quantity, price)
SELECT u.id, p.id, NULL, 1, COALESCE(p.sale_price, p.regular_price)
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u,
     (SELECT id, sale_price, regular_price FROM products LIMIT 1) p
ON CONFLICT DO NOTHING;

INSERT INTO cart_items (user_id, product_id, variant_id, quantity, price)
SELECT u.id, p.id, NULL, 2, COALESCE(p.sale_price, p.regular_price)
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u,
     (SELECT id, sale_price, regular_price FROM products LIMIT 1 OFFSET 1) p
ON CONFLICT DO NOTHING;

INSERT INTO cart_items (user_id, product_id, variant_id, quantity, price)
SELECT u.id, p.id, NULL, 1, COALESCE(p.sale_price, p.regular_price)
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u,
     (SELECT id, sale_price, regular_price FROM products LIMIT 1 OFFSET 2) p
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. NEWSLETTER_SUBSCRIPTIONS
-- ============================================================================
INSERT INTO newsletter_subscriptions (email, status, subscribed_at, confirmed_at, category_preferences, notification_frequency)
VALUES
('subscriber1@example.com', 'subscribed', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', '["electronics", "fashion"]'::jsonb, 'weekly'),
('subscriber2@example.com', 'subscribed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', '["home_kitchen"]'::jsonb, 'monthly'),
('subscriber3@example.com', 'pending_confirmation', NOW(), NULL, '[]'::jsonb, 'weekly')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. NOTIFICATIONS
-- ============================================================================
INSERT INTO notifications (user_id, type, title, message, is_read)
SELECT id, 'order_confirmed', 'Pesanan Dikonfirmasi', 'Pesanan Anda telah dikonfirmasi dan sedang disiapkan.', true
FROM users WHERE role = 'customer' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO notifications (user_id, type, title, message, is_read)
SELECT id, 'promo_available', 'Promo Spesial Tersedia', 'Gunakan kode promo untuk diskon khusus!', false
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

INSERT INTO notifications (user_id, type, title, message, is_read)
SELECT id, 'wishlist_reminder', 'Produk Wishlist Sudah Tersedia', 'Produk yang Anda incar tersedia dengan harga lebih murah!', false
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. ORDERS
-- ============================================================================
INSERT INTO orders (
  user_id, order_number, shipping_name, shipping_phone, shipping_address_line1,
  shipping_address_line2, shipping_city, shipping_province, shipping_postal_code,
  subtotal, shipping_cost, tax_amount, total, order_status, payment_status, payment_method
)
SELECT
  u.id,
  'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER ())::text, 4, '0'),
  'Customer 1', '08123456789', 'Jl. Sudirman No. 1',
  'Blok A', 'Jakarta', 'DKI Jakarta', '12190',
  (SELECT regular_price FROM products LIMIT 1)::numeric,
  50000, 
  ((SELECT regular_price FROM products LIMIT 1)::numeric * 0.1),
  ((SELECT regular_price FROM products LIMIT 1)::numeric + 50000 + ((SELECT regular_price FROM products LIMIT 1)::numeric * 0.1)),
  'confirmed', 'completed', 'credit_card'
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u
ON CONFLICT DO NOTHING;

INSERT INTO orders (
  user_id, order_number, shipping_name, shipping_phone, shipping_address_line1,
  shipping_address_line2, shipping_city, shipping_province, shipping_postal_code,
  subtotal, shipping_cost, tax_amount, total, order_status, payment_status, payment_method
)
SELECT
  u.id,
  'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER () + 1)::text, 4, '0'),
  'Customer 2', '08234567890', 'Jl. Gatot Subroto No. 2',
  'Tower B', 'Jakarta', 'DKI Jakarta', '12190',
  (SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 1)::numeric,
  75000,
  ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 1)::numeric * 0.1),
  ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 1)::numeric + 75000 + ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 1)::numeric * 0.1)),
  'processing', 'completed', 'bank_transfer'
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u
ON CONFLICT DO NOTHING;

INSERT INTO orders (
  user_id, order_number, shipping_name, shipping_phone, shipping_address_line1,
  shipping_address_line2, shipping_city, shipping_province, shipping_postal_code,
  subtotal, shipping_cost, tax_amount, total, order_status, payment_status, payment_method
)
SELECT
  u.id,
  'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER () + 2)::text, 4, '0'),
  'Customer 3', '08345678901', 'Jl. Ahmad Yani No. 3',
  'Blok C', 'Bandung', 'Jawa Barat', '40173',
  (SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 2)::numeric,
  50000,
  ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 2)::numeric * 0.1),
  ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 2)::numeric + 50000 + ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 2)::numeric * 0.1)),
  'pending', 'pending', 'installment'
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. ORDER_ITEMS
-- ============================================================================
INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_sku, quantity, unit_price, subtotal)
SELECT o.id, p.id, NULL, p.name, p.sku, 1, p.regular_price, p.regular_price
FROM (SELECT id FROM orders LIMIT 1) o, (SELECT id, name, sku, regular_price FROM products LIMIT 1) p
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_sku, quantity, unit_price, subtotal)
SELECT o.id, p.id, NULL, p.name, p.sku, 1, COALESCE(p.sale_price, p.regular_price), COALESCE(p.sale_price, p.regular_price)
FROM (SELECT id FROM orders LIMIT 1 OFFSET 1) o, (SELECT id, name, sku, sale_price, regular_price FROM products LIMIT 1 OFFSET 1) p
ON CONFLICT DO NOTHING;

INSERT INTO order_items (order_id, product_id, variant_id, product_name, product_sku, quantity, unit_price, subtotal)
SELECT o.id, p.id, NULL, p.name, p.sku, 2, p.regular_price, p.regular_price * 2
FROM (SELECT id FROM orders LIMIT 1 OFFSET 2) o, (SELECT id, name, sku, regular_price FROM products LIMIT 1 OFFSET 2) p
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. ORDER_STATUS_HISTORY
-- ============================================================================
INSERT INTO order_status_history (order_id, from_status, to_status, notes)
SELECT id, 'pending', 'confirmed', 'Pembayaran dikonfirmasi'
FROM orders LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO order_status_history (order_id, from_status, to_status, notes)
SELECT id, 'confirmed', 'processing', 'Pesanan sedang dikemas'
FROM orders LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

INSERT INTO order_status_history (order_id, from_status, to_status, notes)
SELECT id, NULL, 'pending', 'Pesanan dibuat'
FROM orders LIMIT 1 OFFSET 2
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. PRODUCT_IMAGES
-- ============================================================================
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
SELECT id, 'https://via.placeholder.com/800x800?text=' || REPLACE(name, ' ', '+'), name || ' Image', 1, true
FROM products LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
SELECT id, 'https://via.placeholder.com/800x800?text=' || REPLACE(name, ' ', '+') || '+2', name || ' Image 2', 2, false
FROM products LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary)
SELECT id, 'https://via.placeholder.com/800x800?text=' || REPLACE(name, ' ', '+') || '+3', name || ' Image 3', 1, true
FROM products LIMIT 1 OFFSET 2
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. PRODUCT_SPECIFICATIONS
-- ============================================================================
INSERT INTO product_specifications (product_id, spec_key, spec_value)
SELECT id, 'Brand', COALESCE(brand, 'Generic')
FROM products WHERE brand IS NOT NULL LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO product_specifications (product_id, spec_key, spec_value)
SELECT id, 'Weight', COALESCE(weight::text, '500g')
FROM products LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

INSERT INTO product_specifications (product_id, spec_key, spec_value)
SELECT id, 'Warranty', '1 Year Manufacturer'
FROM products LIMIT 1 OFFSET 2
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. PRODUCT_VARIANTS
-- ============================================================================
INSERT INTO product_variants (product_id, name, sku, stock, price)
SELECT id, 'Black', sku || '-BLACK', COALESCE(stock_quantity, 10), regular_price
FROM products LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, name, sku, stock, price)
SELECT id, 'Silver', sku || '-SILVER', COALESCE(stock_quantity, 10), regular_price + 500000
FROM products LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, name, sku, stock, price)
SELECT id, 'Large', sku || '-L', COALESCE(stock_quantity, 10), regular_price
FROM products LIMIT 1 OFFSET 2
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. REVIEWS
-- ============================================================================
INSERT INTO reviews (product_id, user_id, order_id, rating, title, comment, is_verified_purchase, status)
SELECT p.id, u.id, NULL, 5, 'Produk Berkualitas!', 'Sangat puas dengan kualitas produk ini', true, 'approved'
FROM (SELECT id FROM products LIMIT 1) p, (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u
ON CONFLICT DO NOTHING;

INSERT INTO reviews (product_id, user_id, order_id, rating, title, comment, is_verified_purchase, status)
SELECT p.id, u.id, NULL, 4, 'Bagus Tapi Pengiriman Lama', 'Produk bagus, pengiriman lebih lama dari estimasi', true, 'approved'
FROM (SELECT id FROM products LIMIT 1 OFFSET 1) p, (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u
ON CONFLICT DO NOTHING;

INSERT INTO reviews (product_id, user_id, order_id, rating, title, comment, is_verified_purchase, status)
SELECT p.id, u.id, NULL, 5, 'Rekomendasi!', 'Produk terbaik dengan packing rapih dan pengiriman cepat', true, 'approved'
FROM (SELECT id FROM products LIMIT 1 OFFSET 2) p, (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. REVIEW_HELPFUL (requires review_id)
-- ============================================================================
INSERT INTO review_helpful (review_id, user_id)
SELECT r.id, u.id
FROM (SELECT id FROM reviews LIMIT 1) r, (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u
ON CONFLICT DO NOTHING;

INSERT INTO review_helpful (review_id, user_id)
SELECT r.id, u.id
FROM (SELECT id FROM reviews LIMIT 1 OFFSET 1) r, (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 13. SEARCH_ANALYTICS
-- ============================================================================
INSERT INTO search_analytics (query, clicked_product_id, click_count, impression_count)
SELECT 'smartphone', id, 45, 150
FROM products WHERE name ILIKE '%phone%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO search_analytics (query, clicked_product_id, click_count, impression_count)
SELECT 'laptop', id, 32, 98
FROM products WHERE name ILIKE '%laptop%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO search_analytics (query, clicked_product_id, click_count, impression_count)
SELECT 'murah', id, 28, 89
FROM products WHERE regular_price < 5000000 LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. SEARCH_SUGGESTIONS
-- ============================================================================
INSERT INTO search_suggestions (query, frequency, last_searched)
VALUES
('smartphone terbaru', 156, NOW()),
('laptop gaming', 98, NOW()),
('murah berkualitas', 67, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 15. STOCK_ALERTS
-- ============================================================================
INSERT INTO stock_alerts (product_id, user_id, min_stock)
SELECT p.id, u.id, 15
FROM (SELECT id FROM products LIMIT 1) p, (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u
ON CONFLICT DO NOTHING;

INSERT INTO stock_alerts (product_id, user_id, min_stock)
SELECT p.id, u.id, 20
FROM (SELECT id FROM products LIMIT 1 OFFSET 1) p, (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u
ON CONFLICT DO NOTHING;

INSERT INTO stock_alerts (product_id, user_id, min_stock)
SELECT p.id, u.id, 50
FROM (SELECT id FROM products LIMIT 1 OFFSET 2) p, (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 16. WISHLISTS
-- ============================================================================
INSERT INTO wishlists (user_id, product_id)
SELECT u.id, p.id
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u, (SELECT id FROM products LIMIT 1) p
ON CONFLICT DO NOTHING;

INSERT INTO wishlists (user_id, product_id)
SELECT u.id, p.id
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u, (SELECT id FROM products LIMIT 1 OFFSET 1) p
ON CONFLICT DO NOTHING;

INSERT INTO wishlists (user_id, product_id)
SELECT u.id, p.id
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u, (SELECT id FROM products LIMIT 1 OFFSET 2) p
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 17. ACTIVITY_LOGS
-- ============================================================================
INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
SELECT id, 'login', 'user', id::text, '{}'::jsonb
FROM users WHERE role = 'customer' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
SELECT u.id, 'view_product', 'product', p.id::text, '{"ip":"192.168.1.1"}'::jsonb
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u, (SELECT id FROM products LIMIT 1) p
ON CONFLICT DO NOTHING;

INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
SELECT u.id, 'place_order', 'order', o.id::text, '{"amount":10000}'::jsonb
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u, (SELECT id FROM orders LIMIT 1) o
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 18. PROMO_CODES (if not exists)
-- ============================================================================
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_purchase, valid_from, valid_until, usage_limit, is_active)
VALUES
('WELCOME50', 'Promo Selamat Datang', 'percentage', 50000, 100000, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', 100, true),
('NEWYEAR20', 'Diskon Tahun Baru', 'percentage', 200000, 500000, NOW() - INTERVAL '10 days', NOW() + INTERVAL '30 days', 50, true),
('FREESHIP', 'Gratis Ongkos Kirim', 'fixed', 75000, 250000, NOW() - INTERVAL '5 days', NOW() + INTERVAL '45 days', 200, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 19. PROMO_CODE_USAGES
-- ============================================================================
INSERT INTO promo_code_usages (promo_code_id, user_id, order_id, used_at)
SELECT pc.id, u.id, o.id, NOW()
FROM (SELECT id FROM promo_codes LIMIT 1) pc, 
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u,
     (SELECT id FROM orders LIMIT 1) o
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SUCCESS SUMMARY
-- ============================================================================
SELECT 'Dummy Data Insertion Completed Successfully!' AS status,
       (SELECT COUNT(*) FROM addresses) AS addresses_count,
       (SELECT COUNT(*) FROM cart_items) AS cart_items_count,
       (SELECT COUNT(*) FROM newsletter_subscriptions) AS newsletter_count,
       (SELECT COUNT(*) FROM notifications) AS notifications_count,
       (SELECT COUNT(*) FROM orders) AS orders_count,
       (SELECT COUNT(*) FROM order_items) AS order_items_count,
       (SELECT COUNT(*) FROM order_status_history) AS order_status_history_count,
       (SELECT COUNT(*) FROM product_images) AS product_images_count,
       (SELECT COUNT(*) FROM product_specifications) AS product_specifications_count,
       (SELECT COUNT(*) FROM product_variants) AS product_variants_count,
       (SELECT COUNT(*) FROM reviews) AS reviews_count,
       (SELECT COUNT(*) FROM review_helpful) AS review_helpful_count,
       (SELECT COUNT(*) FROM search_analytics) AS search_analytics_count,
       (SELECT COUNT(*) FROM search_suggestions) AS search_suggestions_count,
       (SELECT COUNT(*) FROM stock_alerts) AS stock_alerts_count,
       (SELECT COUNT(*) FROM wishlists) AS wishlists_count,
       (SELECT COUNT(*) FROM activity_logs) AS activity_logs_count,
       (SELECT COUNT(*) FROM promo_codes) AS promo_codes_count,
       (SELECT COUNT(*) FROM products) AS total_products;
