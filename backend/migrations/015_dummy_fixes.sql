-- ============================================================================
-- FINAL DUMMY DATA FIX - Using CORRECT database column names
-- ============================================================================

-- ============================================================================
-- 10. FIX PRODUCT_VARIANTS (correct columns)
-- ============================================================================
INSERT INTO product_variants (product_id, variant_type, variant_value, stock_quantity, price_adjustment)
SELECT id, 'Color', 'Black', COALESCE(stock_quantity, 10), 0
FROM products LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, variant_type, variant_value, stock_quantity, price_adjustment)
SELECT id, 'Color', 'Silver', COALESCE(stock_quantity, 10), 500000
FROM products LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 13. FIX SEARCH_ANALYTICS (no click_count or impression_count)
-- ============================================================================
INSERT INTO search_analytics (query, clicked_product_id, result_count)
SELECT 'smartphone', id, 45
FROM products WHERE name ILIKE '%phone%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO search_analytics (query, clicked_product_id, result_count)
SELECT 'laptop', id, 32
FROM products WHERE name ILIKE '%laptop%' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO search_analytics (query, clicked_product_id, result_count)
SELECT 'murah', id, 28
FROM products WHERE regular_price < 5000000 LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 14. FIX SEARCH_SUGGESTIONS (no frequency column)
-- ============================================================================
INSERT INTO search_suggestions (query, search_count, last_searched_at)
VALUES
('smartphone terbaru', 156, NOW()),
('laptop gaming', 98, NOW()),
('murah berkualitas', 67, NOW() - INTERVAL '2 days')
ON CONFLICT (query, category_id) DO NOTHING;

-- ============================================================================
-- 15. FIX STOCK_ALERTS (no min_stock, need email field)
-- ============================================================================
INSERT INTO stock_alerts (product_id, user_id, email, is_notified)
SELECT p.id, u.id, u.email, false
FROM (SELECT id FROM products LIMIT 1) p, (SELECT id, email FROM users WHERE role = 'customer' LIMIT 1) u
ON CONFLICT DO NOTHING;

INSERT INTO stock_alerts (product_id, user_id, email, is_notified)
SELECT p.id, u.id, u.email, false
FROM (SELECT id FROM products LIMIT 1 OFFSET 1) p, (SELECT id, email FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u
ON CONFLICT DO NOTHING;

INSERT INTO stock_alerts (product_id, user_id, email, is_notified)
SELECT p.id, u.id, u.email, false
FROM (SELECT id FROM products LIMIT 1 OFFSET 2) p, (SELECT id, email FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 17. FIX ACTIVITY_LOGS (action_type not action)
-- ============================================================================
INSERT INTO activity_logs (user_id, action_type, description, metadata)
SELECT id, 'login', 'User login successful', '{}'::jsonb
FROM users WHERE role = 'customer' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO activity_logs (user_id, action_type, description, metadata)
SELECT u.id, 'view_product', 'User viewed product', '{"ip":"192.168.1.1"}'::jsonb
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u
ON CONFLICT DO NOTHING;

INSERT INTO activity_logs (user_id, action_type, description, metadata)
SELECT u.id, 'place_order', 'Order placed successfully', '{"amount":10000}'::jsonb
FROM (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 2) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 18. FIX PROMO_CODES (correct columns)
-- ============================================================================
INSERT INTO promo_codes (code, description, discount_type, discount_value, min_order_amount, valid_from, valid_to, usage_limit, is_active)
VALUES
('WELCOME50', 'Promo Selamat Datang', 'percentage', 5, 100000, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', 100, true),
('NEWYEAR20', 'Diskon Tahun Baru', 'percentage', 20, 500000, NOW() - INTERVAL '10 days', NOW() + INTERVAL '30 days', 50, true),
('FREESHIP', 'Gratis Ongkos Kirim', 'fixed', 75000, 250000, NOW() - INTERVAL '5 days', NOW() + INTERVAL '45 days', 200, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 19. FIX PROMO_CODE_USAGES (need discount_amount)
-- ============================================================================
INSERT INTO promo_code_usages (promo_code_id, user_id, order_id, discount_amount, used_at)
SELECT pc.id, u.id, o.id, 50000, NOW()
FROM (SELECT id FROM promo_codes LIMIT 1) pc, 
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1) u,
     (SELECT id FROM orders LIMIT 1) o
ON CONFLICT DO NOTHING;

INSERT INTO promo_code_usages (promo_code_id, user_id, discount_amount, used_at)
SELECT pc.id, u.id, 100000, NOW()
FROM (SELECT id FROM promo_codes LIMIT 1 OFFSET 1) pc,
     (SELECT id FROM users WHERE role = 'customer' LIMIT 1 OFFSET 1) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SUCCESS SUMMARY
-- ============================================================================
SELECT 'All Fixes Applied Successfully!' AS status,
       (SELECT COUNT(*) FROM product_variants) AS product_variants_count,
       (SELECT COUNT(*) FROM search_analytics) AS search_analytics_count,
       (SELECT COUNT(*) FROM search_suggestions) AS search_suggestions_count,
       (SELECT COUNT(*) FROM stock_alerts) AS stock_alerts_count,
       (SELECT COUNT(*) FROM activity_logs) AS activity_logs_count,
       (SELECT COUNT(*) FROM promo_codes) AS promo_codes_count,
       (SELECT COUNT(*) FROM promo_code_usages) AS promo_usages_count;
