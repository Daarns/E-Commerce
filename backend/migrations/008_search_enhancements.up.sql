-- Phase 9L: Full-Text Search Enhancements

-- Search suggestions table for autocomplete
CREATE TABLE search_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    search_count INT NOT NULL DEFAULT 1,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    last_searched_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    UNIQUE(query, category_id)
);

-- Search analytics table for tracking and trending
CREATE TABLE search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    result_count INT DEFAULT 0,
    clicked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    search_duration_ms INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for optimal search performance
CREATE INDEX idx_search_suggestions_query ON search_suggestions (query);
CREATE INDEX idx_search_suggestions_count ON search_suggestions (search_count DESC);
CREATE INDEX idx_search_suggestions_category ON search_suggestions (category_id);
CREATE INDEX idx_search_suggestions_last_searched ON search_suggestions (last_searched_at DESC);
CREATE INDEX idx_search_analytics_user ON search_analytics (user_id);
CREATE INDEX idx_search_analytics_query ON search_analytics (query);
CREATE INDEX idx_search_analytics_created ON search_analytics (created_at DESC);
CREATE INDEX idx_search_analytics_clicked_product ON search_analytics (clicked_product_id);

-- Full-text search index on products
-- Using PostgreSQL tsvector for better search capabilities
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Trigger to auto-update search_vector when product changes
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, '') || ' ' || COALESCE(NEW.sku, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_search_vector
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_search_vector();

-- Create GIN index on search_vector for fast full-text search
CREATE INDEX idx_products_search_vector ON products USING GIN (search_vector);

-- Populate search_vector for existing products
UPDATE products SET search_vector = to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, ''));
