-- Remove relations that are outside the current platform scope.
DROP MATERIALIZED VIEW IF EXISTS dashboard_stats;

DROP TABLE IF EXISTS stock_alerts CASCADE;
DROP TABLE IF EXISTS product_specifications CASCADE;
DROP TABLE IF EXISTS newsletter_subscriptions CASCADE;
