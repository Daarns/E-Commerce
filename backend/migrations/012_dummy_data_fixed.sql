-- ============================================================================
-- COMPREHENSIVE DUMMY DATA FOR TESTING - FIXED SCHEMA
-- Created: 2026-04-19
-- Purpose: 2-3 dummy records per table for testing all features
-- Note: Products (10) already exist - we use them for related data
-- ============================================================================

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. GET EXISTING PRODUCT IDs FOR FOREIGN KEY REFERENCES
-- ============================================================================
-- First, let's identify real product IDs from existing products
-- We'll use these for all dependent tables

-- ============================================================================
-- 2. ADDRESSES - 3 records
-- ============================================================================
INSERT INTO addresses (id, user_id, name, phone, address_line1, address_line2, city, province, postal_code, is_default, created_at, updated_at)
SELECT
    '550e8400-e29b-41d4-a716-446655550001'::uuid,
    id,  -- Use first existing user
    'Alamat Rumah Utama',
    '08123456789',
    'Jl. Merpati No. 42',
    'Apartemen Pelangi Blok C Lt. 8',
    'Jakarta',
    'DKI Jakarta',
    '12870',
    true,
    NOW(),
    NOW()
FROM users LIMIT 1

UNION ALL

SELECT
    '550e8400-e29b-41d4-a716-446655550002'::uuid,
    id,
    'Alamat Kantor',
    '08123456789',
    'Jl. Sudirman Blok C No. 100',
    'Lantai 15 Tower A',
    'Jakarta',
    'DKI Jakarta',
    '12190',
    false,
    NOW(),
    NOW()
FROM users LIMIT 1 OFFSET 1

UNION ALL

SELECT
    '550e8400-e29b-41d4-a716-446655550003'::uuid,
    id,
    'Alamat Teman',
    '08234567890',
    'Jl. Ahmad Yani No. 77',
    'Komplek Permata Hijau',
    'Bandung',
    'Jawa Barat',
    '40173',
    true,
    NOW(),
    NOW()
FROM users LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. CART_ITEMS - 3 records (using real products)
-- ============================================================================
INSERT INTO cart_items (id, user_id, product_id, variant_id, quantity, created_at, updated_at)
SELECT
    '660e8400-e29b-41d4-a716-446655550001'::uuid,
    u.id,
    p.id,
    NULL,
    1,
    NOW(),
    NOW()
FROM users u, products p
WHERE u.role = 'customer'
LIMIT 1

UNION ALL

SELECT
    '660e8400-e29b-41d4-a716-446655550002'::uuid,
    u.id,
    p.id,
    NULL,
    2,
    NOW(),
    NOW()
FROM users u, products p
WHERE u.role = 'customer'
LIMIT 1 OFFSET 1

UNION ALL

SELECT
    '660e8400-e29b-41d4-a716-446655550003'::uuid,
    u.id,
    p.id,
    NULL,
    1,
    NOW(),
    NOW()
FROM users u, products p
WHERE u.role = 'customer'
LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. CHAT_MESSAGES - 3 records
-- ============================================================================
INSERT INTO chat_messages (id, conversation_id, sender_id, message, created_at)
SELECT
    'a00e8400-e29b-41d4-a716-446655550001'::uuid,
    gen_random_uuid(),
    id,
    'Halo, saya ingin menanyakan tentang produk',
    NOW() - INTERVAL '2 hours'
FROM users WHERE role = 'customer' LIMIT 1

UNION ALL

SELECT
    'a00e8400-e29b-41d4-a716-446655550002'::uuid,
    gen_random_uuid(),
    id,
    'Apakah ada garansi resmi untuk produk ini?',
    NOW() - INTERVAL '1 hour'
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1

UNION ALL

SELECT
    'a00e8400-e29b-41d4-a716-446655550003'::uuid,
    gen_random_uuid(),
    id,
    'Berapa lama estimasi pengiriman?',
    NOW() - INTERVAL '30 minutes'
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. CHAT_SESSIONS (CONVERSATIONS) - 3 records
-- ============================================================================
INSERT INTO conversations (id, user_id, subject, status, created_at, updated_at)
SELECT
    '550e8400-e29b-41d4-a716-446655550101'::uuid,
    id,
    'Pertanyaan Produk',
    'open',
    NOW() - INTERVAL '2 hours',
    NOW()
FROM users WHERE role = 'customer' LIMIT 1

UNION ALL

SELECT
    '550e8400-e29b-41d4-a716-446655550102'::uuid,
    id,
    'Bantuan Garansi',
    'open',
    NOW() - INTERVAL '1 hour',
    NOW()
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1

UNION ALL

SELECT
    '550e8400-e29b-41d4-a716-446655550103'::uuid,
    id,
    'Bantuan Pengiriman',
    'closed',
    NOW() - INTERVAL '3 days',
    NOW()
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. NEWSLETTER_SUBSCRIPTIONS - 3 records
-- ============================================================================
INSERT INTO newsletter_subscriptions (id, email, status, subscribed_at, confirmed_at, category_preferences, notification_frequency, created_at, updated_at)
VALUES
    ('b00e8400-e29b-41d4-a716-446655550001'::uuid, 'subscriber1@example.com', 'subscribed', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', '["electronics", "fashion"]'::jsonb, 'weekly', NOW() - INTERVAL '15 days', NOW()),
    ('b00e8400-e29b-41d4-a716-446655550002'::uuid, 'subscriber2@example.com', 'subscribed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', '["home_kitchen", "electronics"]'::jsonb, 'monthly', NOW() - INTERVAL '5 days', NOW()),
    ('b00e8400-e29b-41d4-a716-446655550003'::uuid, 'subscriber3@example.com', 'pending_confirmation', NULL, NULL, '[]'::jsonb, 'weekly', NOW(), NOW())

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. NOTIFICATIONS - 3 records  
-- ============================================================================
INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
SELECT
    'c00e8400-e29b-41d4-a716-446655550001'::uuid,
    id,
    'order_confirmed',
    'Pesanan Dikonfirmasi',
    'Pesanan Anda telah dikonfirmasi dan sedang disiapkan.',
    true,
    NOW() - INTERVAL '5 days'
FROM users WHERE role = 'customer' LIMIT 1

UNION ALL

SELECT
    'c00e8400-e29b-41d4-a716-446655550002'::uuid,
    id,
    'promo_available',
    'Promo Spesial Tersedia',
    'Gunakan kode promo untuk diskon khusus hari ini!',
    false,
    NOW() - INTERVAL '1 hour'
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1

UNION ALL

SELECT
    'c00e8400-e29b-41d4-a716-446655550003'::uuid,
    id,
    'wishlist_reminder',
    'Produk Wishlist Sudah Tersedia',
    'Produk yang Anda incar kembali tersedia dengan harga lebih murah!',
    false,
    NOW() - INTERVAL '2 hours'
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. INCREMENT PRODUCT METRICS (FOR FEATURED/BESTSELLER)
-- ============================================================================
-- Mark products with sales/views so they appear as featured
UPDATE products
SET sold_count = sold_count + 50, view_count = view_count + 200
WHERE id IN (SELECT id FROM products LIMIT 5);

-- ============================================================================
-- 9. ORDERS - 3 records (using real products and users)
-- ============================================================================
INSERT INTO orders (id, user_id, order_number, subtotal, shipping_cost, tax, total_amount, payment_method, payment_status, created_at)
SELECT
    '550e8400-e29b-41d4-a716-446655550201'::uuid,
    id,
    'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0001',
    (SELECT regular_price FROM products LIMIT 1)::numeric,
    50000,
    ((SELECT regular_price FROM products LIMIT 1)::numeric * 0.1),
    ((SELECT regular_price FROM products LIMIT 1)::numeric + 50000 + ((SELECT regular_price FROM products LIMIT 1)::numeric * 0.1)),
    'credit_card',
    'completed',
    NOW() - INTERVAL '5 days'
FROM users WHERE role = 'customer' LIMIT 1

UNION ALL

SELECT
    '550e8400-e29b-41d4-a716-446655550202'::uuid,
    id,
    'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0002',
    (SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 1)::numeric,
    50000,
    ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 1)::numeric * 0.1),
    ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 1)::numeric + 50000 + ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 1)::numeric * 0.1)),
    'bank_transfer',
    'completed',
    NOW() - INTERVAL '3 days'
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1

UNION ALL

SELECT
    '550e8400-e29b-41d4-a716-446655550203'::uuid,
    id,
    'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0003',
    (SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 2)::numeric,
    75000,
    ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 2)::numeric * 0.1),
    ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 2)::numeric + 75000 + ((SELECT COALESCE(sale_price, regular_price) FROM products LIMIT 1 OFFSET 2)::numeric * 0.1)),
    'installment',
    'pending',
    NOW() - INTERVAL '1 day'
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. ORDER_ITEMS - 3 records
-- ============================================================================
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal, created_at)
SELECT
    'd00e8400-e29b-41d4-a716-446655550001'::uuid,
    o.id,
    p.id,
    1,
    p.regular_price,
    p.regular_price,
    NOW() - INTERVAL '5 days'
FROM orders o, products p
LIMIT 1

UNION ALL

SELECT
    'd00e8400-e29b-41d4-a716-446655550002'::uuid,
    o.id,
    p.id,
    1,
    COALESCE(p.sale_price, p.regular_price),
    COALESCE(p.sale_price, p.regular_price),
    NOW() - INTERVAL '3 days'
FROM orders o, products p
LIMIT 1 OFFSET 1

UNION ALL

SELECT
    'd00e8400-e29b-41d4-a716-446655550003'::uuid,
    o.id,
    p.id,
    2,
    p.regular_price,
    p.regular_price * 2,
    NOW() - INTERVAL '1 day'
FROM orders o, products p
LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 11. ORDER_STATUS_HISTORY - 3 records
-- ============================================================================
INSERT INTO order_status_history (id, order_id, old_status, new_status, notes, created_at)
SELECT
    'e00e8400-e29b-41d4-a716-446655550001'::uuid,
    id,
    'pending',
    'confirmed',
    'Pembayaran dikonfirmasi',
    NOW() - INTERVAL '5 days'
FROM orders LIMIT 1

UNION ALL

SELECT
    'e00e8400-e29b-41d4-a716-446655550002'::uuid,
    id,
    'confirmed',
    'processing',
    'Pesanan sedang dikemas',
    NOW() - INTERVAL '4 days'
FROM orders LIMIT 1 OFFSET 1

UNION ALL

SELECT
    'e00e8400-e29b-41d4-a716-446655550003'::uuid,
    id,
    'processing',
    'shipped',
    'Pesanan dikirim via JNE',
    NOW() - INTERVAL '2 days'
FROM orders LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 12. PRODUCT_IMAGES - 3 records
-- ============================================================================
INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary, created_at)
SELECT
    '880e8400-e29b-41d4-a716-446655550001'::uuid,
    id,
    'https://via.placeholder.com/800x800?text=' || REPLACE(name, ' ', '+'),
    name || ' - Primary Image',
    1,
    true,
    NOW()
FROM products LIMIT 1

UNION ALL

SELECT
    '880e8400-e29b-41d4-a716-446655550002'::uuid,
    id,
    'https://via.placeholder.com/800x800?text=' || REPLACE(name, ' ', '+') || '+Side',
    name || ' - Side View',
    2,
    false,
    NOW()
FROM products LIMIT 1 OFFSET 1

UNION ALL

SELECT
    '880e8400-e29b-41d4-a716-446655550003'::uuid,
    id,
    'https://via.placeholder.com/800x800?text=' || REPLACE(name, ' ', '+') || '+Detail',
    name || ' - Detail View',
    1,
    true,
    NOW()
FROM products LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 13. PRODUCT_SPECIFICATIONS - 3 records
-- ============================================================================
INSERT INTO product_specifications (id, product_id, spec_key, spec_value, created_at)
SELECT
    '900e8400-e29b-41d4-a716-446655550001'::uuid,
    id,
    'Brand',
    brand,
    NOW()
FROM products WHERE brand IS NOT NULL LIMIT 1

UNION ALL

SELECT
    '900e8400-e29b-41d4-a716-446655550002'::uuid,
    id,
    'Weight',
    COALESCE(weight::text, '500g'),
    NOW()
FROM products LIMIT 1 OFFSET 1

UNION ALL

SELECT
    '900e8400-e29b-41d4-a716-446655550003'::uuid,
    id,
    'Warranty',
    '1 Year Manufacturer Warranty',
    NOW()
FROM products LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. PRODUCT_VARIANTS - 3 records
-- ============================================================================
INSERT INTO product_variants (id, product_id, attribute_name, attribute_value, sku, stock, price_adjustment, created_at)
SELECT
    '990e8400-e29b-41d4-a716-446655550001'::uuid,
    id,
    'Color',
    'Black',
    sku || '-BLACK',
    COALESCE(stock_quantity, 10),
    0,
    NOW()
FROM products LIMIT 1

UNION ALL

SELECT
    '990e8400-e29b-41d4-a716-446655550002'::uuid,
    id,
    'Color',
    'Silver',
    sku || '-SILVER',
    COALESCE(stock_quantity, 10),
    500000,
    NOW()
FROM products LIMIT 1 OFFSET 1

UNION ALL

SELECT
    '990e8400-e29b-41d4-a716-446655550003'::uuid,
    id,
    'Size',
    'Large',
    sku || '-L',
    COALESCE(stock_quantity, 10),
    0,
    NOW()
FROM products LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 15. REVIEWS - 3 records
-- ============================================================================
INSERT INTO reviews (id, product_id, user_id, rating, title, content, created_at)
SELECT
    'f00e8400-e29b-41d4-a716-446655550001'::uuid,
    p.id,
    u.id,
    5,
    'Produk Berkualitas Tinggi!',
    'Sangat puas dengan pembelian ini. Produk sesuai deskripsi dan berkualitas.',
    NOW() - INTERVAL '3 days'
FROM (SELECT id FROM products LIMIT 1) p,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u

UNION ALL

SELECT
    'f00e8400-e29b-41d4-a716-446655550002'::uuid,
    p.id,
    u.id,
    4,
    'Bagus, Tapi Pengiriman Lama',
    'Kualitas produk bagus, tapi pengiriman lebih lama dari estimasi.',
    NOW() - INTERVAL '2 days'
FROM (SELECT id FROM products LIMIT 1 OFFSET 1) p,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u

UNION ALL

SELECT
    'f00e8400-e29b-41d4-a716-446655550003'::uuid,
    p.id,
    u.id,
    5,
    'Rekomendasi!',
    'Produk terbaik, packing rapih, dan penggiriman cepat!',
    NOW() - INTERVAL '1 day'
FROM (SELECT id FROM products LIMIT 1 OFFSET 2) p,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 16. REVIEW_HELPFUL - 3 records
-- ============================================================================
INSERT INTO review_helpful (id, review_id, user_id, is_helpful, created_at)
SELECT
    'c10e8400-e29b-41d4-a716-446655550001'::uuid,
    r.id,
    u.id,
    true,
    NOW() - INTERVAL '2 days'
FROM (SELECT id FROM reviews LIMIT 1) r,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u

UNION ALL

SELECT
    'c10e8400-e29b-41d4-a716-446655550002'::uuid,
    r.id,
    u.id,
    true,
    NOW() - INTERVAL '1 day'
FROM (SELECT id FROM reviews LIMIT 1 OFFSET 1) r,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u

UNION ALL

SELECT
    'c10e8400-e29b-41d4-a716-446655550003'::uuid,
    r.id,
    u.id,
    false,
    NOW()
FROM (SELECT id FROM reviews LIMIT 1 OFFSET 2) r,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 17. SEARCH_ANALYTICS - 3 records
-- ============================================================================
INSERT INTO search_analytics (id, search_term, clicked_product_id, click_count, impression_count, created_at)
SELECT
    'e10e8400-e29b-41d4-a716-446655550001'::uuid,
    'smartphone',
    id,
    45,
    150,
    NOW() - INTERVAL '10 days'
FROM products WHERE name ILIKE '%phone%' LIMIT 1

UNION ALL

SELECT
    'e10e8400-e29b-41d4-a716-446655550002'::uuid,
    'laptop',
    id,
    32,
    98,
    NOW() - INTERVAL '7 days'
FROM products WHERE name ILIKE '%laptop%' LIMIT 1

UNION ALL

SELECT
    'e10e8400-e29b-41d4-a716-446655550003'::uuid,
    'murah',
    id,
    28,
    89,
    NOW() - INTERVAL '5 days'
FROM products WHERE regular_price < 5000000 LIMIT 1

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 18. SEARCH_SUGGESTIONS - 3 records
-- ============================================================================
INSERT INTO search_suggestions (id, suggestion_text, frequency, last_searched, created_at)
VALUES
    ('f10e8400-e29b-41d4-a716-446655550001'::uuid, 'smartphone terbaru', 156, NOW(), NOW() - INTERVAL '5 days'),
    ('f10e8400-e29b-41d4-a716-446655550002'::uuid, 'laptop gaming', 98, NOW(), NOW() - INTERVAL '3 days'),
    ('f10e8400-e29b-41d4-a716-446655550003'::uuid, 'murah berkualitas', 67, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 19. STOCK_ALERTS - 3 records
-- ============================================================================
INSERT INTO stock_alerts (id, product_id, user_id, threshold, created_at)
SELECT
    'g10e8400-e29b-41d4-a716-446655550001'::uuid,
    p.id,
    u.id,
    15,
    NOW() - INTERVAL '10 days'
FROM (SELECT id FROM products LIMIT 1) p,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u

UNION ALL

SELECT
    'g10e8400-e29b-41d4-a716-446655550002'::uuid,
    p.id,
    u.id,
    20,
    NOW() - INTERVAL '5 days'
FROM (SELECT id FROM products LIMIT 1 OFFSET 1) p,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u

UNION ALL

SELECT
    'g10e8400-e29b-41d4-a716-446655550003'::uuid,
    p.id,
    u.id,
    50,
    NOW()
FROM (SELECT id FROM products LIMIT 1 OFFSET 2) p,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 20. WISHLISTS - 3 records
-- ============================================================================
INSERT INTO wishlists (id, user_id, product_id, created_at)
SELECT
    'h10e8400-e29b-41d4-a716-446655550001'::uuid,
    u.id,
    p.id,
    NOW() - INTERVAL '8 days'
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u,
     (SELECT id FROM products LIMIT 1) p

UNION ALL

SELECT
    'h10e8400-e29b-41d4-a716-446655550002'::uuid,
    u.id,
    p.id,
    NOW() - INTERVAL '5 days'
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u,
     (SELECT id FROM products LIMIT 1 OFFSET 1) p

UNION ALL

SELECT
    'h10e8400-e29b-41d4-a716-446655550003'::uuid,
    u.id,
    p.id,
    NOW() - INTERVAL '3 days'
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u,
     (SELECT id FROM products LIMIT 1 OFFSET 2) p

ON CONFLICT DO NOTHING;

-- ============================================================================
-- 21. ACTIVITY_LOGS - 3 records
-- ============================================================================
INSERT INTO activity_logs (id, user_id, event_type, entity_type, entity_id, description, created_at)
SELECT
    'i10e8400-e29b-41d4-a716-446655550001'::uuid,
    id,
    'login',
    'user',
    id::text,
    'User login successful',
    NOW() - INTERVAL '2 hours'
FROM users WHERE role = 'customer' LIMIT 1

UNION ALL

SELECT
    'i10e8400-e29b-41d4-a716-446655550002'::uuid,
    id,
    'view_product',
    'product',
    (SELECT id::text FROM products LIMIT 1),
    'User viewed product',
    NOW() - INTERVAL '1.5 hours'
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1

UNION ALL

SELECT
    'i10e8400-e29b-41d4-a716-446655550003'::uuid,
    id,
    'place_order',
    'order',
    (SELECT id::text FROM orders LIMIT 1),
    'Order placed successfully',
    NOW() - INTERVAL '3 days'
FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2

ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ DUMMY DATA INSERTION COMPLETED!';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  • Addresses: %', (SELECT COUNT(*) FROM addresses WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Cart Items: %', (SELECT COUNT(*) FROM cart_items WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Chat Messages: %', (SELECT COUNT(*) FROM chat_messages WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Conversations: %', (SELECT COUNT(*) FROM conversations WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Newsletter: %', (SELECT COUNT(*) FROM newsletter_subscriptions WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Notifications: %', (SELECT COUNT(*) FROM notifications WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Orders: %', (SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Order Items: %', (SELECT COUNT(*) FROM order_items WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Reviews: %', (SELECT COUNT(*) FROM reviews WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Wishlists: %', (SELECT COUNT(*) FROM wishlists WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Stock Alerts: %', (SELECT COUNT(*) FROM stock_alerts WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Activity Logs: %', (SELECT COUNT(*) FROM activity_logs WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '';
  RAISE NOTICE 'Product Metrics Updated:';
  RAISE NOTICE '  • Total Products: %', (SELECT COUNT(*) FROM products);
  RAISE NOTICE '  • Products with Images: %', (SELECT COUNT(DISTINCT product_id) FROM product_images);
  RAISE NOTICE '  • Products with Reviews: %', (SELECT COUNT(DISTINCT product_id) FROM reviews);
  RAISE NOTICE '  • Total Orders: %', (SELECT COUNT(*) FROM orders);
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Testing ready! Check /api/v1/products for featured products with data.';
  RAISE NOTICE '';
END
$$;
