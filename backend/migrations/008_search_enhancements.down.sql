-- Phase 9L: Full-Text Search Enhancements - Rollback

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_product_search_vector ON products;
DROP FUNCTION IF EXISTS update_product_search_vector();

-- Drop indexes
DROP INDEX IF EXISTS idx_products_search_vector;
DROP INDEX IF EXISTS idx_search_analytics_clicked_product;
DROP INDEX IF EXISTS idx_search_analytics_created;
DROP INDEX IF EXISTS idx_search_analytics_query;
DROP INDEX IF EXISTS idx_search_analytics_user;
DROP INDEX IF EXISTS idx_search_suggestions_last_searched;
DROP INDEX IF EXISTS idx_search_suggestions_category;
DROP INDEX IF EXISTS idx_search_suggestions_count;
DROP INDEX IF EXISTS idx_search_suggestions_query;

-- Drop columns
ALTER TABLE products DROP COLUMN IF EXISTS search_vector;

-- Drop tables
DROP TABLE IF EXISTS search_analytics;
DROP TABLE IF EXISTS search_suggestions;
