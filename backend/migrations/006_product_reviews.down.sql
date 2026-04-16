-- Drop indexes
DROP INDEX IF EXISTS idx_products_rating;
DROP INDEX IF EXISTS idx_review_votes_user;
DROP INDEX IF EXISTS idx_review_votes_review;
DROP INDEX IF EXISTS idx_product_reviews_helpful;
DROP INDEX IF EXISTS idx_product_reviews_rating;
DROP INDEX IF EXISTS idx_product_reviews_created;
DROP INDEX IF EXISTS idx_product_reviews_user;
DROP INDEX IF EXISTS idx_product_reviews_product;

-- Drop tables
DROP TABLE IF EXISTS review_helpful_votes CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;

-- Remove columns from products
ALTER TABLE products DROP COLUMN IF EXISTS review_count;
ALTER TABLE products DROP COLUMN IF EXISTS avg_rating;
