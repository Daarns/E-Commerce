-- Dummy Data for E-Commerce Platform (CORRECTED for Schema)
-- Migration: 002_dummy_data
-- Created: 2026-04-15
-- Purpose: Comprehensive test data for development and testing

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- Test Users
INSERT INTO users (id, email, password_hash, name, phone, role, is_verified, is_active, last_login_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'customer1@example.com', '$2a$10$YIjlrPNoM0dVmN7DiRvHiOCJrMP9c.NtzHD7bQQf0RrGmfK9N5bYi', 'Budi Santoso', '08123456789', 'customer', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'customer2@example.com', '$2a$10$YIjlrPNoM0dVmN7DiRvHiOCJrMP9c.NtzHD7bQQf0RrGmfK9N5bYi', 'Siti Nurhaliza', '08234567890', 'customer', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'customer3@example.com', '$2a$10$YIjlrPNoM0dVmN7DiRvHiOCJrMP9c.NtzHD7bQQf0RrGmfK9N5bYi', 'Ahmad Wijaya', '08345678901', 'customer', true, true, NULL),
('550e8400-e29b-41d4-a716-446655440004', 'admin@example.com', '$2a$10$YIjlrPNoM0dVmN7DiRvHiOCJrMP9c.NtzHD7bQQf0RrGmfK9N5bYi', 'Admin User', '08456789012', 'admin', true, true, NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'unverified@example.com', '$2a$10$YIjlrPNoM0dVmN7DiRvHiOCJrMP9c.NtzHD7bQQf0RrGmfK9N5bYi', 'Unverified User', '08567890123', 'customer', false, true, NULL);

-- ============================================================================
-- CATEGORIES
-- ============================================================================

INSERT INTO categories (id, name, slug, description, parent_id, display_order, is_active) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Electronics', 'electronics', 'Electronic devices and gadgets', NULL, 1, true),
('660e8400-e29b-41d4-a716-446655440002', 'Fashion', 'fashion', 'Clothing and accessories', NULL, 2, true),
('660e8400-e29b-41d4-a716-446655440003', 'Home & Kitchen', 'home-kitchen', 'Home appliances and kitchen products', NULL, 3, true),
('660e8400-e29b-41d4-a716-446655440004', 'Smartphones', 'smartphones', 'Mobile phones and tablets', '660e8400-e29b-41d4-a716-446655440001', 1, true),
('660e8400-e29b-41d4-a716-446655440005', 'Laptops', 'laptops', 'Laptops and computers', '660e8400-e29b-41d4-a716-446655440001', 2, true),
('660e8400-e29b-41d4-a716-446655440006', 'Men''s Clothing', 'mens-clothing', 'Clothing for men', '660e8400-e29b-41d4-a716-446655440002', 1, true),
('660e8400-e29b-41d4-a716-446655440007', 'Women''s Clothing', 'womens-clothing', 'Clothing for women', '660e8400-e29b-41d4-a716-446655440002', 2, true);

-- ============================================================================
-- PRODUCTS
-- ============================================================================

-- Smartphones
INSERT INTO products (id, name, slug, sku, description, short_description, regular_price, sale_price, stock_quantity, brand, category_id, status, view_count, sold_count) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'iPhone 15 Pro', 'iphone-15-pro', 'APPLE-IP15P-001', 'Latest Apple flagship smartphone with advanced features', 'Premium flagship smartphone', 15999000, 14999000, 50, 'Apple', '660e8400-e29b-41d4-a716-446655440004', 'active', 245, 32),
('770e8400-e29b-41d4-a716-446655440002', 'Samsung Galaxy S24', 'samsung-galaxy-s24', 'SAMSUNG-S24-001', 'Powerful Android flagship with excellent camera system', 'High-performance Android phone', 13999000, 12999000, 75, 'Samsung', '660e8400-e29b-41d4-a716-446655440004', 'active', 189, 28),
('770e8400-e29b-41d4-a716-446655440003', 'Google Pixel 8', 'google-pixel-8', 'GOOGLE-P8-001', 'Google''s AI-powered smartphone with smart features', 'AI-enhanced photography phone', 10999000, NULL, 45, 'Google', '660e8400-e29b-41d4-a716-446655440004', 'active', 156, 15),
('770e8400-e29b-41d4-a716-446655440004', 'Xiaomi 14 Ultra', 'xiaomi-14-ultra', 'XIAOMI-14U-001', 'Flagship killer with great value for money', 'Premium smartphone at affordable price', 9999000, 8999000, 100, 'Xiaomi', '660e8400-e29b-41d4-a716-446655440004', 'active', 201, 42);

-- Laptops
INSERT INTO products (id, name, slug, sku, description, short_description, regular_price, sale_price, stock_quantity, brand, category_id, status, view_count, sold_count) VALUES
('770e8400-e29b-41d4-a716-446655440005', 'MacBook Pro 16 M3', 'macbook-pro-16-m3', 'APPLE-MBP16M3', 'Powerful laptop for professionals', 'Premium professional laptop', 35999000, 34999000, 20, 'Apple', '660e8400-e29b-41d4-a716-446655440005', 'active', 178, 8),
('770e8400-e29b-41d4-a716-446655440006', 'Dell XPS 15', 'dell-xps-15', 'DELL-XPS15-001', 'High-performance laptop for creators', 'Creator-focused powerhouse', 24999000, NULL, 35, 'Dell', '660e8400-e29b-41d4-a716-446655440005', 'active', 142, 12),
('770e8400-e29b-41d4-a716-446655440007', 'HP Pavilion 15', 'hp-pavilion-15', 'HP-PAV15-001', 'Reliable budget-friendly laptop', 'Everyday computing laptop', 7999000, 7499000, 60, 'HP', '660e8400-e29b-41d4-a716-446655440005', 'active', 95, 19);

-- Fashion
INSERT INTO products (id, name, slug, sku, description, short_description, regular_price, stock_quantity, brand, category_id, status, view_count, sold_count) VALUES
('770e8400-e29b-41d4-a716-446655440008', 'Premium Cotton T-Shirt', 'premium-cotton-tshirt', 'FASHION-TSHIRT-001', '100% organic cotton comfortable t-shirt', 'Comfortable everyday tee', 299000, 150, 'Generic Brand', '660e8400-e29b-41d4-a716-446655440006', 'active', 89, 45),
('770e8400-e29b-41d4-a716-446655440009', 'Denim Jeans Blue', 'denim-jeans-blue', 'FASHION-JEANS-001', 'Classic blue denim jeans for all occasions', 'Timeless denim style', 599000, 200, 'Denim Co', '660e8400-e29b-41d4-a716-446655440006', 'active', 156, 78),
('770e8400-e29b-41d4-a716-446655440010', 'Summer Dress', 'summer-dress', 'FASHION-DRESS-001', 'Light and airy summer dress perfect for warm weather', 'Comfortable summer wear', 449000, 80, 'Fashion Line', '660e8400-e29b-41d4-a716-446655440007', 'active', 201, 63);

-- ============================================================================
-- PRODUCT IMAGES
-- ============================================================================

INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary) VALUES
-- iPhone 15 Pro images
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'https://via.placeholder.com/400x400?text=iPhone+15+Pro+Front', 'iPhone 15 Pro front view', 1, true),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'https://via.placeholder.com/400x400?text=iPhone+15+Pro+Back', 'iPhone 15 Pro back view', 2, false),
-- Samsung Galaxy S24 images
('880e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'https://via.placeholder.com/400x400?text=Samsung+S24+Front', 'Samsung Galaxy S24 front view', 1, true),
('880e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', 'https://via.placeholder.com/400x400?text=Samsung+S24+Back', 'Samsung Galaxy S24 back view', 2, false);

-- ============================================================================
-- PRODUCT VARIANTS
-- ============================================================================

INSERT INTO product_variants (id, product_id, variant_type, variant_value, price_adjustment, stock_quantity, sku_suffix, is_active) VALUES
-- iPhone 15 Pro variants (Storage)
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Storage', '256GB', 0, 20, 'SG256', true),
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'Storage', '512GB', 2000000, 15, 'SG512', true),
('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', 'Storage', '1TB', 4000000, 10, 'SG1TB', true),
-- iPhone 15 Pro variants (Color)
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', 'Color', 'Space Black', 0, 15, 'BLK', true),
('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', 'Color', 'Gold', 0, 15, 'GLD', true),
('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440001', 'Color', 'Silver', 0, 20, 'SLV', true),
-- T-Shirt variants (Size)
('990e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440008', 'Size', 'Small', 0, 40, 'S', true),
('990e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440008', 'Size', 'Medium', 0, 50, 'M', true),
('990e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440008', 'Size', 'Large', 0, 35, 'L', true),
('990e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440008', 'Size', 'XL', 0, 25, 'XL', true);

-- ============================================================================
-- PRODUCT SPECIFICATIONS
-- ============================================================================

INSERT INTO product_specifications (id, product_id, spec_key, spec_value, display_order) VALUES
-- iPhone 15 Pro specs
('aa0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Processor', 'Apple A17 Pro', 1),
('aa0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'Display', '6.1-inch Super Retina XDR', 2),
('aa0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001', 'Camera', '48MP Main, 12MP Ultra Wide, 12MP Telephoto', 3),
('aa0e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', 'Battery', 'Up to 29 hours', 4),
('aa0e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001', 'Water Resistance', 'IP69', 5),
-- Samsung Galaxy S24 specs
('aa0e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440002', 'Processor', 'Snapdragon 8 Gen 3', 1),
('aa0e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440002', 'Display', '6.2-inch Dynamic AMOLED 2X', 2),
('aa0e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440002', 'Camera', '50MP Main, 12MP Ultra Wide, 50MP Telephoto', 3);

-- ============================================================================
-- ADDRESSES
-- ============================================================================

INSERT INTO addresses (id, user_id, name, phone, address_line1, address_line2, city, province, postal_code, is_default) VALUES
('bb0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Budi Santoso', '08123456789', 'Jl. Merdeka No. 123', 'Apt. 4B', 'Jakarta', 'DKI Jakarta', '12345', true),
('bb0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Budi Santoso - Office', '08123456789', 'Jl. Sudirman No. 456', 'Suite 789', 'Jakarta', 'DKI Jakarta', '12340', false),
('bb0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'Siti Nurhaliza', '08234567890', 'Jl. Ahmad Yani No. 789', NULL, 'Bandung', 'Jawa Barat', '40123', true),
('bb0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'Ahmad Wijaya', '08345678901', 'Jl. Diponegoro No. 321', 'Blok A', 'Surabaya', 'Jawa Timur', '60123', true);

-- ============================================================================
-- SHOPPING CART
-- ============================================================================

INSERT INTO cart_items (id, user_id, product_id, variant_id, quantity, price) VALUES
('cc0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 1, 14999000),
('cc0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440008', '990e8400-e29b-41d4-a716-446655440008', 2, 299000),
('cc0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', NULL, 1, 12999000),
('cc0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440005', NULL, 1, 34999000);

-- ============================================================================
-- PROMO CODES
-- ============================================================================

INSERT INTO promo_codes (id, code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, usage_count, usage_limit_per_user, valid_from, valid_to, is_active) VALUES
('dd0e8400-e29b-41d4-a716-446655440001', 'WELCOME10', 'Welcome discount for new customers', 'percentage', 10, 500000, 500000, 100, 45, 1, NOW() - INTERVAL '7 days', NOW() + INTERVAL '30 days', true),
('dd0e8400-e29b-41d4-a716-446655440002', 'SAVE50K', 'Flat discount of 50000', 'fixed', 50000, 1000000, NULL, 200, 120, 2, NOW() - INTERVAL '7 days', NOW() + INTERVAL '60 days', true),
('dd0e8400-e29b-41d4-a716-446655440003', 'SUMMER20', 'Summer sale - 20% off', 'percentage', 20, 2000000, 1000000, 50, 38, 1, NOW() - INTERVAL '14 days', NOW() + INTERVAL '7 days', true),
('dd0e8400-e29b-41d4-a716-446655440004', 'EXPIRED10', 'Expired promo code', 'percentage', 15, 500000, 500000, 100, 80, 1, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day', false);

-- ============================================================================
-- ORDERS (CORRECTED SCHEMA)
-- ============================================================================

INSERT INTO orders (id, order_number, user_id, shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2, shipping_city, shipping_province, shipping_postal_code, subtotal, shipping_cost, discount_amount, tax_amount, total, order_status, payment_status, payment_method, customer_notes) VALUES
('ee0e8400-e29b-41d4-a716-446655440001', 'ORD-20260415-0001', '550e8400-e29b-41d4-a716-446655440001', 'Budi Santoso', '08123456789', 'Jl. Merdeka No. 123', 'Apt. 4B', 'Jakarta', 'DKI Jakarta', '12345', 15299000, 50000, 0, 0, 15349000, 'completed', 'paid', 'midtrans', 'Please deliver on weekday'),
('ee0e8400-e29b-41d4-a716-446655440002', 'ORD-20260415-0002', '550e8400-e29b-41d4-a716-446655440001', 'Budi Santoso', '08123456789', 'Jl. Merdeka No. 123', 'Apt. 4B', 'Jakarta', 'DKI Jakarta', '12345', 599000, 50000, 50000, 0, 599000, 'processing', 'paid', 'midtrans', NULL),
('ee0e8400-e29b-41d4-a716-446655440003', 'ORD-20260415-0003', '550e8400-e29b-41d4-a716-446655440002', 'Siti Nurhaliza', '08234567890', 'Jl. Ahmad Yani No. 789', NULL, 'Bandung', 'Jawa Barat', '40123', 12999000, 75000, 1300000, 0, 11774000, 'completed', 'paid', 'midtrans', 'Gift wrapping requested'),
('ee0e8400-e29b-41d4-a716-446655440004', 'ORD-20260415-0004', '550e8400-e29b-41d4-a716-446655440003', 'Ahmad Wijaya', '08345678901', 'Jl. Diponegoro No. 321', 'Blok A', 'Surabaya', 'Jawa Timur', '60123', 34999000, 100000, 0, 0, 35099000, 'pending', 'unpaid', 'midtrans', NULL);

-- ============================================================================
-- ORDER ITEMS (CORRECTED)
-- ============================================================================

INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, product_sku, quantity, unit_price, subtotal) VALUES
('ff0e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'iPhone 15 Pro', 'APPLE-IP15P-001', 1, 14999000, 14999000),
('ff0e8400-e29b-41d4-a716-446655440002', 'ee0e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440008', '990e8400-e29b-41d4-a716-446655440008', 'Premium Cotton T-Shirt', 'FASHION-TSHIRT-001', 1, 299000, 299000),
('ff0e8400-e29b-41d4-a716-446655440003', 'ee0e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440008', '990e8400-e29b-41d4-a716-446655440008', 'Premium Cotton T-Shirt', 'FASHION-TSHIRT-001', 2, 299000, 598000),
('ff0e8400-e29b-41d4-a716-446655440004', 'ee0e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', NULL, 'Samsung Galaxy S24', 'SAMSUNG-S24-001', 1, 12999000, 12999000),
('ff0e8400-e29b-41d4-a716-446655440005', 'ee0e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440005', NULL, 'MacBook Pro 16 M3', 'APPLE-MBP16M3', 1, 34999000, 34999000);

-- ============================================================================
-- ORDER STATUS HISTORY (CORRECTED SCHEMA)
-- ============================================================================

INSERT INTO order_status_history (id, order_id, from_status, to_status, notes) VALUES
('aa0e8400-e29b-41d4-a716-446655440011', 'ee0e8400-e29b-41d4-a716-446655440001', 'pending', 'payment_confirmed', 'Payment confirmed'),
('aa0e8400-e29b-41d4-a716-446655440012', 'ee0e8400-e29b-41d4-a716-446655440001', 'payment_confirmed', 'processing', 'Processing started'),
('aa0e8400-e29b-41d4-a716-446655440013', 'ee0e8400-e29b-41d4-a716-446655440001', 'processing', 'shipped', 'Package sent with JNE'),
('aa0e8400-e29b-41d4-a716-446655440014', 'ee0e8400-e29b-41d4-a716-446655440001', 'shipped', 'delivered', 'Delivered to customer'),
('aa0e8400-e29b-41d4-a716-446655440015', 'ee0e8400-e29b-41d4-a716-446655440002', 'pending', 'payment_confirmed', 'Payment confirmed'),
('aa0e8400-e29b-41d4-a716-446655440016', 'ee0e8400-e29b-41d4-a716-446655440003', 'pending', 'payment_confirmed', 'Payment confirmed'),
('aa0e8400-e29b-41d4-a716-446655440017', 'ee0e8400-e29b-41d4-a716-446655440003', 'payment_confirmed', 'processing', 'Processing started'),
('aa0e8400-e29b-41d4-a716-446655440018', 'ee0e8400-e29b-41d4-a716-446655440003', 'processing', 'shipped', 'Package sent with Grab Express'),
('aa0e8400-e29b-41d4-a716-446655440019', 'ee0e8400-e29b-41d4-a716-446655440003', 'shipped', 'delivered', 'Delivered to customer');

-- ============================================================================
-- REVIEWS (CORRECTED SCHEMA)
-- ============================================================================

INSERT INTO reviews (id, product_id, user_id, order_id, rating, title, comment, is_verified_purchase, status) VALUES
('bb0e8400-e29b-41d4-a716-446655440011', '770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440001', 5, 'Excellent phone!', 'iPhone 15 Pro is amazing. Great camera and performance. Highly recommended!', true, 'approved'),
('bb0e8400-e29b-41d4-a716-446655440012', '770e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', 'ee0e8400-e29b-41d4-a716-446655440001', 4, 'Good quality t-shirt', 'Cotton is soft and comfortable. Fits well. Would buy again.', true, 'approved'),
('bb0e8400-e29b-41d4-a716-446655440013', '770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'ee0e8400-e29b-41d4-a716-446655440003', 5, 'Best phone ever!', 'Samsung Galaxy S24 exceeded my expectations. Performance is smooth and camera is exceptional.', true, 'approved'),
('bb0e8400-e29b-41d4-a716-446655440014', '770e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', NULL, 5, 'Perfect for my work', 'MacBook Pro 16 M3 is powerful and reliable. Great for development work.', false, 'pending');

-- ============================================================================
-- REVIEW HELPFUL (CORRECTED - no is_helpful column)
-- ============================================================================

INSERT INTO review_helpful (id, review_id, user_id) VALUES
('cc0e8400-e29b-41d4-a716-446655440011', 'bb0e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440002'),
('cc0e8400-e29b-41d4-a716-446655440012', 'bb0e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440003'),
('cc0e8400-e29b-41d4-a716-446655440013', 'bb0e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440003'),
('cc0e8400-e29b-41d4-a716-446655440014', 'bb0e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001');

-- ============================================================================
-- WISHLISTS
-- ============================================================================

INSERT INTO wishlists (id, user_id, product_id) VALUES
('dd0e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440005'),
('dd0e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440006'),
('dd0e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001'),
('dd0e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002');

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Total Test Data:
-- - Users: 5 (3 customers, 1 admin, 1 unverified)
-- - Categories: 7 (3 main + 4 subcategories)
-- - Products: 10
-- - Product Images: 4
-- - Product Variants: 10
-- - Product Specifications: 8
-- - Addresses: 4
-- - Cart Items: 4
-- - Promo Codes: 4
-- - Orders: 4
-- - Order Items: 5
-- - Order Status History: 9
-- - Reviews: 4
-- - Review Helpful Votes: 4
-- - Wishlists: 4
