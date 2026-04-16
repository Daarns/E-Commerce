-- Create product_reviews table
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(100),
    review_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_product_user_review UNIQUE(product_id, user_id)
);

-- Create review_helpful_votes table
CREATE TABLE review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_review_user_vote UNIQUE(review_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_created ON product_reviews(product_id, created_at DESC);
CREATE INDEX idx_product_reviews_rating ON product_reviews(product_id, rating);
CREATE INDEX idx_product_reviews_helpful ON product_reviews(product_id, helpful_count DESC);
CREATE INDEX idx_review_votes_review ON review_helpful_votes(review_id);
CREATE INDEX idx_review_votes_user ON review_helpful_votes(user_id);

-- Add avg_rating column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Create index for product rating
CREATE INDEX idx_products_rating ON products(avg_rating DESC);
