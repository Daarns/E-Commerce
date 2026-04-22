-- Migration: 018_shipping_methods
-- Created: 2026-04-22
-- Purpose: Dedicated shipping_methods table for structured, maintainable shipping options.
--          orders.shipping_method (VARCHAR snapshot) intentionally kept for immutable order history.
--          Analytics: JOIN orders o ON o.shipping_method = sm.code

-- ============================================================================
-- SHIPPING METHODS
-- ============================================================================

CREATE TABLE shipping_methods (
    id                 UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    code               VARCHAR(50)  UNIQUE NOT NULL,   -- e.g. 'regular', 'express', 'same_day'
    name               VARCHAR(100) NOT NULL,           -- e.g. 'Regular Shipping'
    description        VARCHAR(255),                    -- e.g. '5-7 hari kerja'
    price              DECIMAL(12,2) NOT NULL,          -- shipping cost in IDR
    estimated_days_min INT          NOT NULL DEFAULT 1,
    estimated_days_max INT          NOT NULL DEFAULT 7,
    icon               VARCHAR(50),                     -- emoji or icon identifier, e.g. '📦'
    is_active          BOOLEAN      NOT NULL DEFAULT true,
    display_order      INT          NOT NULL DEFAULT 0, -- determines UI ordering
    created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipping_methods_code     ON shipping_methods(code);
CREATE INDEX idx_shipping_methods_active   ON shipping_methods(is_active);
CREATE INDEX idx_shipping_methods_order    ON shipping_methods(display_order);

CREATE TRIGGER update_shipping_methods_updated_at
    BEFORE UPDATE ON shipping_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO shipping_methods (code, name, description, price, estimated_days_min, estimated_days_max, icon, display_order) VALUES
('regular',  'Regular Shipping',   '5-7 hari kerja',            15000.00, 5, 7, '📦', 1),
('express',  'Express Shipping',   '2-3 hari kerja',            35000.00, 2, 3, '🚀', 2),
('same_day', 'Same Day Delivery',  'Hari ini sebelum pukul 21:00', 50000.00, 0, 0, '⚡', 3);

DO $$
BEGIN
    RAISE NOTICE 'Migration 018_shipping_methods completed — 3 shipping methods seeded.';
END $$;
