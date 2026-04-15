-- PostgreSQL Initialization Script
-- This runs when the database is first created

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for better search performance
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable unaccent for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialized successfully with extensions: uuid-ossp, pg_trgm, unaccent';
END $$;
