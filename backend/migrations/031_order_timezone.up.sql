DROP MATERIALIZED VIEW IF EXISTS dashboard_stats;

ALTER TABLE orders
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN paid_at TYPE TIMESTAMPTZ USING paid_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN snap_token_created_at TYPE TIMESTAMPTZ USING snap_token_created_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN payment_expires_at TYPE TIMESTAMPTZ USING payment_expires_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN shipped_at TYPE TIMESTAMPTZ USING shipped_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN delivered_at TYPE TIMESTAMPTZ USING delivered_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN cancelled_at TYPE TIMESTAMPTZ USING cancelled_at AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE orders
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE order_status_workflows
    ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN triggered_at TYPE TIMESTAMPTZ USING triggered_at AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE order_status_workflows
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE) AS today_orders,
    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at >= CURRENT_DATE AND payment_status = 'paid') AS today_revenue,
    (SELECT COUNT(*) FROM orders WHERE order_status = 'pending') AS pending_orders,
    (SELECT COUNT(*) FROM products WHERE stock_quantity < stock_alert_threshold AND stock_quantity > 0) AS low_stock_count,
    (SELECT COUNT(*) FROM products WHERE stock_quantity = 0 AND status = 'active') AS out_of_stock_count,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) AS today_new_customers,
    (SELECT COUNT(*) FROM product_reviews WHERE status = 'pending') AS pending_reviews;

CREATE UNIQUE INDEX idx_dashboard_stats ON dashboard_stats ((1));
