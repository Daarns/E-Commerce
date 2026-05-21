-- ============================================================================
-- COMPREHENSIVE DUMMY DATA FOR ALL 27 TABLES
-- Created: 2026-04-19
-- Purpose: Test data with 2-3 records per table, featuring products prominently
-- Note: Products (10) already exist - using them for featured/search/bestseller
-- ============================================================================

-- ENSURE UUID EXTENSION IS ENABLED
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ADDRESSES - 3 records
-- ============================================================================
INSERT INTO addresses (id, user_id, name, phone, address_line1, address_line2, city, province, postal_code, is_default, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655440001', 'Budi Santoso (Rumah)', '08123456789', 'Jl. Merpati No. 42', 'Apartemen Pelangi Blok C', 'Jakarta', 'DKI Jakarta', '12870', true, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655440001', 'Budi Santoso (Kantor)', '08123456789', 'Jl. Sudirman Blok C No. 100', 'Lantai 15', 'Jakarta', 'DKI Jakarta', '12190', false, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655440002', 'Siti Nurhaliza', '08234567890', 'Jl. Ahmad Yani No. 77', 'Komplek Permata Hijau', 'Bandung', 'Jawa Barat', '40173', true, NOW(), NOW());

-- ============================================================================
-- 2. CART_ITEMS - 3 records (for guest/user carts)
-- ============================================================================
INSERT INTO cart_items (id, user_id, product_id, variant_id, quantity, is_guest, guest_session_id, created_at, updated_at) VALUES
('660e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655550001', '990e8400-e29b-41d4-a716-446655550001', 1, false, NULL, NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655550002', NULL, 2, false, NULL, NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655550003', NULL, '770e8400-e29b-41d4-a716-446655550005', NULL, 1, true, 'guest-session-001', NOW(), NOW());

-- ============================================================================
-- 3. CATEGORIES - No changes needed (already populated)
-- ============================================================================

-- ============================================================================
-- 4. CHAT_MESSAGES - 3 records
-- ============================================================================
INSERT INTO chat_messages (id, session_id, sender_id, message, message_type, attachment_url, is_read, created_at, updated_at) VALUES
('a00e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655550101', '550e8400-e29b-41d4-a716-446655440001', 'Halo, saya ingin menanyakan tentang iPhone 15 Pro', 'text', NULL, true, NOW() - INTERVAL '2 hours', NOW()),
('a00e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655550101', '550e8400-e29b-41d4-a716-446655440004', 'Hai! iPhone 15 Pro tersedia dalam 3 warna pilihan. Apa yang bisa kami bantu?', 'text', NULL, true, NOW() - INTERVAL '1.5 hours', NOW()),
('a00e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655550102', '550e8400-e29b-41d4-a716-446655440002', 'Apakah ada garansi resmi untuk MacBook Pro?', 'text', NULL, false, NOW() - INTERVAL '30 minutes', NOW());

-- ============================================================================
-- 5. CHAT_SESSIONS - 3 records
-- ============================================================================
INSERT INTO chat_sessions (id, user_id, admin_id, subject, status, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655550101', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'Pertanyaan: iPhone 15 Pro', 'active', NOW() - INTERVAL '2 hours', NOW()),
('550e8400-e29b-41d4-a716-446655550102', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', 'Garansi MacBook Pro', 'active', NOW() - INTERVAL '30 minutes', NOW()),
('550e8400-e29b-41d4-a716-446655550103', '550e8400-e29b-41d4-a716-446655440003', NULL, 'Bantuan Umum', 'closed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days');

-- ============================================================================
-- 6. NEWSLETTER_SUBSCRIPTIONS - 3 records
-- ============================================================================
INSERT INTO newsletter_subscriptions (id, email, status, confirmation_token, confirmation_token_expires_at, subscribed_at, confirmed_at, category_preferences, notification_frequency, preferences_updated_at, created_at, updated_at) VALUES
('b00e8400-e29b-41d4-a716-446655550001', 'newsletter1@example.com', 'subscribed', NULL, NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', '["electronics", "fashion"]'::jsonb, 'weekly', NOW(), NOW() - INTERVAL '15 days', NOW()),
('b00e8400-e29b-41d4-a716-446655550002', 'newsletter2@example.com', 'subscribed', NULL, NULL, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', '["home_kitchen"]'::jsonb, 'monthly', NOW(), NOW(), NOW() - INTERVAL '1 day'),
('b00e8400-e29b-41d4-a716-446655550003', 'newsletter3@example.com', 'pending_confirmation', md5(random()::text), NOW() + INTERVAL '7 days', NULL, NULL, '[]'::jsonb, 'weekly', NULL, NOW(), NOW());

-- ============================================================================
-- 7. NOTIFICATIONS - 3 records
-- ============================================================================
INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at, updated_at) VALUES
('c00e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655440001', 'order_confirmed', 'Pesanan Dikonfirmasi', 'Pesanan Anda ORD-20260415-0001 telah dikonfirmasi dan sedang disiapkan.', '{"order_id":"550e8400-e29b-41d4-a716-446655550201"}'::jsonb, true, NOW() - INTERVAL '5 days', NOW()),
('c00e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655440002', 'order_shipped', 'Pesanan Dikirim', 'Pesanan Anda ORD-20260415-0003 telah dikirim. Tracking: JNE123456', '{"order_id":"550e8400-e29b-41d4-a716-446655550203","tracking":"JNE123456"}'::jsonb, true, NOW() - INTERVAL '3 days', NOW()),
('c00e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655440001', 'promo_available', 'Promo Spesial Tersedia', 'Gunakan kode WELCOME10 untuk diskon 10% untuk pembelian berikutnya!', '{"promo_code":"WELCOME10","discount":"10%"}'::jsonb, false, NOW() - INTERVAL '1 hour', NOW());

-- ============================================================================
-- 8. ORDER_ITEMS - 3 records
-- ============================================================================
INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, unit_price, subtotal, created_at, updated_at) VALUES
('d00e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655550201', '770e8400-e29b-41d4-a716-446655550001', '990e8400-e29b-41d4-a716-446655550001', 1, 14999000, 14999000, NOW() - INTERVAL '5 days', NOW()),
('d00e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655550203', '770e8400-e29b-41d4-a716-446655550002', NULL, 1, 12999000, 12999000, NOW() - INTERVAL '3 days', NOW()),
('d00e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655550204', '770e8400-e29b-41d4-a716-446655550007', NULL, 1, 34999000, 34999000, NOW() - INTERVAL '1 day', NOW());

-- ============================================================================
-- 9. ORDER_STATUS_HISTORY - 3 records
-- ============================================================================
INSERT INTO order_status_history (id, order_id, from_status, to_status, reason, notes, created_at) VALUES
('e00e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655550201', 'pending', 'confirmed', 'payment_received', 'Pembayaran diterima via transfer bank', NOW() - INTERVAL '5 days'),
('e00e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655550201', 'confirmed', 'processing', 'order_accepted', 'Pesanan sedang dikemas', NOW() - INTERVAL '4 days'),
('e00e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655550203', 'pending', 'completed', 'payment_received', 'Pembayaran diterima, pesanan sudah sampai', NOW() - INTERVAL '3 days');

-- ============================================================================
-- 10. ORDER_STATUS_WORKFLOWS - 3 records
-- ============================================================================
INSERT INTO order_status_workflows (id, order_id, from_status, to_status, email_triggered, email_type, triggered_at, notes, created_at, updated_at) VALUES
('f00e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655550201', 'pending', 'confirmed', true, 'order_confirmed', NOW() - INTERVAL '5 days', 'Email konfirmasi dikirim ke customer1@example.com', NOW() - INTERVAL '5 days', NOW()),
('f00e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655550201', 'confirmed', 'processing', true, 'order_shipped', NOW() - INTERVAL '4 days', 'Email pengiriman dikirim dengan tracking number', NOW() - INTERVAL '4 days', NOW()),
('f00e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655550203', 'pending', 'completed', true, 'order_delivered', NOW() - INTERVAL '3 days', 'Email pengiriman selesai', NOW() - INTERVAL '3 days', NOW());

-- ============================================================================
-- 11. ORDERS - 3 records
-- ============================================================================
INSERT INTO orders (id, user_id, order_number, status, subtotal, discount_amount, promo_code_used, shipping_cost, tax, total_amount, payment_method, payment_status, shipping_address_id, notes, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655550201', '550e8400-e29b-41d4-a716-446655440001', 'ORD-20260415-0001', 'completed', 14999000, 0, NULL, 50000, 2249850, 17298850, 'bank_transfer', 'completed', '550e8400-e29b-41d4-a716-446655550001', 'Pesanan berhasil dikirim dan diterima', NOW() - INTERVAL '5 days', NOW()),
('550e8400-e29b-41d4-a716-446655550203', '550e8400-e29b-41d4-a716-446655440002', 'ORD-20260415-0003', 'completed', 12999000, 1300000, 'SUMMER20', 75000, 1764900, 13538900, 'credit_card', 'completed', '550e8400-e29b-41d4-a716-446655550003', 'Gift wrapping requested', NOW() - INTERVAL '3 days', NOW()),
('550e8400-e29b-41d4-a716-446655550204', '550e8400-e29b-41d4-a716-446655440003', 'ORD-20260415-0004', 'pending', 34999000, 0, NULL, 100000, 5249850, 40348850, 'installment', 'pending', '550e8400-e29b-41d4-a716-446655550003', 'Menunggu verifikasi cicilan', NOW() - INTERVAL '1 day', NOW());

-- ============================================================================
-- 12. PRODUCT_IMAGES - 3 records
-- ============================================================================
-- Using product IDs that should exist in your database
INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary, created_at) VALUES
('880e8400-e29b-41d4-a716-446655550001', '770e8400-e29b-41d4-a716-446655550001', 'https://via.placeholder.com/800x800?text=iPhone+15+Pro+Black', 'iPhone 15 Pro Space Black', 1, true, NOW()),
('880e8400-e29b-41d4-a716-446655550002', '770e8400-e29b-41d4-a716-446655550001', 'https://via.placeholder.com/800x800?text=iPhone+15+Pro+Side', 'iPhone 15 Pro Side View', 2, false, NOW()),
('880e8400-e29b-41d4-a716-446655550003', '770e8400-e29b-41d4-a716-446655550002', 'https://via.placeholder.com/800x800?text=Samsung+S24', 'Samsung Galaxy S24', 1, true, NOW());

-- ============================================================================
-- 13. PRODUCT_SPECIFICATIONS - 3 records
-- ============================================================================
INSERT INTO product_specifications (id, product_id, spec_key, spec_value, created_at) VALUES
('900e8400-e29b-41d4-a716-446655550001', '770e8400-e29b-41d4-a716-446655550001', 'Processor', 'Apple A17 Pro', NOW()),
('900e8400-e29b-41d4-a716-446655550002', '770e8400-e29b-41d4-a716-446655550001', 'RAM', '8GB', NOW()),
('900e8400-e29b-41d4-a716-446655550003', '770e8400-e29b-41d4-a716-446655550002', 'Display', '6.1 AMOLED 120Hz', NOW());

-- ============================================================================
-- 14. PRODUCT_VARIANTS - 3 records
-- ============================================================================
INSERT INTO product_variants (id, product_id, variant_name, variant_type, option_value, sku, stock_quantity, price_adjustment, created_at, updated_at) VALUES
('990e8400-e29b-41d4-a716-446655550001', '770e8400-e29b-41d4-a716-446655550001', 'iPhone 15 Pro 256GB Space Black', 'storage', '256GB', 'IPHONE15-256-BLACK', 20, 0, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655550002', '770e8400-e29b-41d4-a716-446655550001', 'iPhone 15 Pro 512GB Space Black', 'storage', '512GB', 'IPHONE15-512-BLACK', 15, 1500000, NOW(), NOW()),
('990e8400-e29b-41d4-a716-446655550003', '770e8400-e29b-41d4-a716-446655550001', 'iPhone 15 Pro 256GB Gold', 'color', 'Gold', 'IPHONE15-256-GOLD', 10, 0, NOW(), NOW());

-- ============================================================================
-- 15. PRODUCTS - Update featured/bestseller flags for existing products
-- ============================================================================
UPDATE products SET is_featured = true WHERE slug IN ('iphone-15-pro', 'samsung-galaxy-s24', 'macbook-pro-16-m3', 'dell-xps-15', 'hp-pavilion-15');
UPDATE products SET is_bestseller = true WHERE slug IN ('iphone-15-pro', 'samsung-galaxy-s24', 'premium-cotton-t-shirt', 'denim-jeans-blue');

-- ============================================================================
-- 16. PROMO_CODE_USAGES - 3 records
-- ============================================================================
-- Make sure promo codes exist in your database
INSERT INTO promo_code_usages (id, promo_code_id, user_id, order_id, discount_applied, used_at, created_at) VALUES
('a10e8400-e29b-41d4-a716-446655550001', (SELECT id FROM promo_codes WHERE code = 'SAVE50K' LIMIT 1), '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655550202', 50000, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('a10e8400-e29b-41d4-a716-446655550002', (SELECT id FROM promo_codes WHERE code = 'SUMMER20' LIMIT 1), '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655550203', 1300000, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('a10e8400-e29b-41d4-a716-446655550003', (SELECT id FROM promo_codes WHERE code = 'WELCOME10' LIMIT 1), '550e8400-e29b-41d4-a716-446655440001', NULL, 0, NULL, NOW());

-- ============================================================================
-- 17. PROMO_CODES - No changes needed (should already exist)
-- ============================================================================

-- ============================================================================
-- 18. REFRESH_TOKENS - 3 records
-- ============================================================================
INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked, revoked_at, created_at, updated_at) VALUES
('b10e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655440001', 'refresh-token-001-' || md5(random()::text), NOW() + INTERVAL '7 days', false, NULL, NOW(), NOW()),
('b10e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655440002', 'refresh-token-002-' || md5(random()::text), NOW() + INTERVAL '7 days', false, NULL, NOW(), NOW()),
('b10e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655440001', 'refresh-token-003-' || md5(random()::text), NOW() - INTERVAL '1 day', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 19. REVIEW_HELPFUL - 3 records
-- ============================================================================
INSERT INTO review_helpful (id, review_id, user_id, is_helpful, created_at) VALUES
('c10e8400-e29b-41d4-a716-446655550001', (SELECT id FROM reviews WHERE rating = 5 LIMIT 1), '550e8400-e29b-41d4-a716-446655440002', true, NOW() - INTERVAL '3 days'),
('c10e8400-e29b-41d4-a716-446655550002', (SELECT id FROM reviews WHERE rating = 5 LIMIT 1), '550e8400-e29b-41d4-a716-446655440003', true, NOW() - INTERVAL '2 days'),
('c10e8400-e29b-41d4-a716-446655550003', (SELECT id FROM reviews WHERE rating = 4 LIMIT 1), '550e8400-e29b-41d4-a716-446655440001', false, NOW() - INTERVAL '1 day');

-- ============================================================================
-- 20. REVIEW_IMAGES - 3 records
-- ============================================================================
INSERT INTO review_images (id, review_id, image_url, created_at) VALUES
('d10e8400-e29b-41d4-a716-446655550001', (SELECT id FROM reviews WHERE rating = 5 LIMIT 1), 'https://via.placeholder.com/400x300?text=Product+Review+1', NOW() - INTERVAL '3 days'),
('d10e8400-e29b-41d4-a716-446655550002', (SELECT id FROM reviews WHERE rating = 5 LIMIT 1), 'https://via.placeholder.com/400x300?text=Product+Review+2', NOW() - INTERVAL '3 days'),
('d10e8400-e29b-41d4-a716-446655550003', (SELECT id FROM reviews WHERE rating = 4 LIMIT 1), 'https://via.placeholder.com/400x300?text=Product+Review+3', NOW() - INTERVAL '2 days');

-- ============================================================================
-- 21. REVIEWS - No changes needed (should already exist)
-- ============================================================================
-- Ensure reviews are linked to existing orders
-- UPDATE reviews SET order_id = '550e8400-e29b-41d4-a716-446655550201' WHERE product_id = '770e8400-e29b-41d4-a716-446655550001' LIMIT 1;

-- ============================================================================
-- 22. SEARCH_ANALYTICS - 3 records (for popular searches tracking)
-- ============================================================================
INSERT INTO search_analytics (id, search_query, product_id, click_count, conversion_count, total_impressions, avg_position, created_at, updated_at) VALUES
('e10e8400-e29b-41d4-a716-446655550001', 'iphone', '770e8400-e29b-41d4-a716-446655550001', 45, 8, 150, 1.2, NOW() - INTERVAL '10 days', NOW()),
('e10e8400-e29b-41d4-a716-446655550002', 'smartphone murah', '770e8400-e29b-41d4-a716-446655550004', 32, 5, 98, 2.1, NOW() - INTERVAL '7 days', NOW()),
('e10e8400-e29b-41d4-a716-446655550003', 'laptop gaming', '770e8400-e29b-41d4-a716-446655550007', 28, 3, 89, 3.2, NOW() - INTERVAL '5 days', NOW());

-- ============================================================================
-- 23. SEARCH_SUGGESTIONS - 3 records (for autocomplete/popular searches)
-- ============================================================================
INSERT INTO search_suggestions (id, search_query, search_count, is_trending, last_searched_at, created_at, updated_at) VALUES
('f10e8400-e29b-41d4-a716-446655550001', 'iphone 15 pro', 156, true, NOW(), NOW() - INTERVAL '5 days', NOW()),
('f10e8400-e29b-41d4-a716-446655550002', 'samsung galaxy s24', 98, true, NOW(), NOW() - INTERVAL '3 days', NOW()),
('f10e8400-e29b-41d4-a716-446655550003', 'macbook pro 16', 67, false, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW());

-- ============================================================================
-- 24. STOCK_ALERTS - 3 records
-- ============================================================================
INSERT INTO stock_alerts (id, product_id, user_id, alert_threshold, current_quantity, is_triggered, last_notified_at, created_at, updated_at) VALUES
('g10e8400-e29b-41d4-a716-446655550001', '770e8400-e29b-41d4-a716-446655550007', '550e8400-e29b-41d4-a716-446655440001', 15, 20, false, NULL, NOW() - INTERVAL '10 days', NOW()),
('g10e8400-e29b-41d4-a716-446655550002', '770e8400-e29b-41d4-a716-446655550009', '550e8400-e29b-41d4-a716-446655440002', 20, 8, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 days', NOW()),
('g10e8400-e29b-41d4-a716-446655550003', '770e8400-e29b-41d4-a716-446655550004', '550e8400-e29b-41d4-a716-446655440003', 50, 100, false, NULL, NOW(), NOW());

-- ============================================================================
-- 25. USERS - No changes needed (you'll register new users)
-- ============================================================================

-- ============================================================================
-- 26. WISHLISTS - 3 records
-- ============================================================================
INSERT INTO wishlists (id, user_id, product_id, created_at, updated_at) VALUES
('h10e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655550007', NOW() - INTERVAL '8 days', NOW()),
('h10e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655550008', NOW() - INTERVAL '5 days', NOW()),
('h10e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655550001', NOW() - INTERVAL '3 days', NOW());

-- ============================================================================
-- 27. ACTIVITY_LOGS - 3 records
-- ============================================================================
INSERT INTO activity_logs (id, user_id, action_type, resource_type, resource_id, old_values, new_values, ip_address, user_agent, created_at) VALUES
('i10e8400-e29b-41d4-a716-446655550001', '550e8400-e29b-41d4-a716-446655440001', 'login', 'user', '550e8400-e29b-41d4-a716-446655440001', NULL, '{"login_time":"2026-04-19T09:00:00Z"}'::jsonb, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '2 hours'),
('i10e8400-e29b-41d4-a716-446655550002', '550e8400-e29b-41d4-a716-446655440001', 'product_view', 'product', '770e8400-e29b-41d4-a716-446655550001', NULL, '{"product_name":"iPhone 15 Pro","sku":"IPHONE15"}'::jsonb, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() - INTERVAL '1.5 hours'),
('i10e8400-e29b-41d4-a716-446655550003', '550e8400-e29b-41d4-a716-446655440002', 'order_placed', 'order', '550e8400-e29b-41d4-a716-446655550203', NULL, '{"order_number":"ORD-20260415-0003","total":"13538900"}'::jsonb, '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', NOW() - INTERVAL '3 days');

-- ============================================================================
-- NOTIFICATIONS - 2 more notifications
-- ============================================================================
INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at, updated_at) VALUES
('c00e8400-e29b-41d4-a716-446655550004', '550e8400-e29b-41d4-a716-446655440003', 'low_stock_alert', 'Stok Terbatas', 'HP Pavilion 15 tinggal 8 unit tersisa. Segera pesan sebelum kehabisan!', '{"product_id":"770e8400-e29b-41d4-a716-446655550009","stock":8}'::jsonb, false, NOW() - INTERVAL '2 days', NOW()),
('c00e8400-e29b-41d4-a716-446655550005', '550e8400-e29b-41d4-a716-446655440002', 'wishlist_price_drop', 'Harga Turun', 'Produk di wishlist Anda iPhone 15 Pro mengalami potongan harga!', '{"product_id":"770e8400-e29b-41d4-a716-446655550001","old_price":"14999000","new_price":"14499000"}'::jsonb, false, NOW() - INTERVAL '4 hours', NOW());

-- ============================================================================
-- VERIFICATION & STATS
-- ============================================================================
-- Display completion stats
DO $$
BEGIN
  RAISE NOTICE '✅ Dummy data insertion completed!';
  RAISE NOTICE 'Summary of inserted records:';
  RAISE NOTICE '  • Activity Logs: %', (SELECT COUNT(*) FROM activity_logs WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Addresses: %', (SELECT COUNT(*) FROM addresses WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Cart Items: %', (SELECT COUNT(*) FROM cart_items WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Chat Messages: %', (SELECT COUNT(*) FROM chat_messages WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Chat Sessions: %', (SELECT COUNT(*) FROM chat_sessions WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Newsletter Subscriptions: %', (SELECT COUNT(*) FROM newsletter_subscriptions WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Notifications: %', (SELECT COUNT(*) FROM notifications WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Orders: %', (SELECT COUNT(*) FROM orders WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Order Items: %', (SELECT COUNT(*) FROM order_items WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Order Status History: %', (SELECT COUNT(*) FROM order_status_history WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Order Status Workflows: %', (SELECT COUNT(*) FROM order_status_workflows WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Product Images: %', (SELECT COUNT(*) FROM product_images WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Product Specifications: %', (SELECT COUNT(*) FROM product_specifications WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Product Variants: %', (SELECT COUNT(*) FROM product_variants WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Promo Code Usages: %', (SELECT COUNT(*) FROM promo_code_usages WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Refresh Tokens: %', (SELECT COUNT(*) FROM refresh_tokens WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Review Helpful: %', (SELECT COUNT(*) FROM review_helpful WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Review Images: %', (SELECT COUNT(*) FROM review_images WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Search Analytics: %', (SELECT COUNT(*) FROM search_analytics WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Search Suggestions: %', (SELECT COUNT(*) FROM search_suggestions WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Stock Alerts: %', (SELECT COUNT(*) FROM stock_alerts WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '  • Wishlists: %', (SELECT COUNT(*) FROM wishlists WHERE created_at > NOW() - INTERVAL '1 hour');
  RAISE NOTICE '';
  RAISE NOTICE '🎯 For testing, products are marked as featured/bestseller:';
  RAISE NOTICE '  • Featured Products: %', (SELECT COUNT(*) FROM products WHERE is_featured = true);
  RAISE NOTICE '  • Bestseller Products: %', (SELECT COUNT(*) FROM products WHERE is_bestseller = true);
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database status:';
  RAISE NOTICE '  • Total Products: %', (SELECT COUNT(*) FROM products);
  RAISE NOTICE '  • Total Orders: %', (SELECT COUNT(*) FROM orders);
  RAISE NOTICE '  • Total Users: %', (SELECT COUNT(*) FROM users);
END
$$;
