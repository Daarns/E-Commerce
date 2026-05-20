BEGIN;

CREATE TABLE IF NOT EXISTS product_variant_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_visual BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, name)
);

CREATE TABLE IF NOT EXISTS product_variant_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_type_id UUID NOT NULL REFERENCES product_variant_types(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(variant_type_id, value)
);

CREATE TABLE IF NOT EXISTS product_variant_combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_combination_options (
    combination_id UUID NOT NULL REFERENCES product_variant_combinations(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES product_variant_options(id) ON DELETE CASCADE,
    PRIMARY KEY (combination_id, option_id)
);

ALTER TABLE product_images
    ADD COLUMN IF NOT EXISTS option_id UUID;

ALTER TABLE product_images
    DROP CONSTRAINT IF EXISTS product_images_option_id_fkey,
    ADD CONSTRAINT product_images_option_id_fkey
        FOREIGN KEY (option_id) REFERENCES product_variant_options(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_variant_types_product ON product_variant_types(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_type ON product_variant_options(variant_type_id);
CREATE INDEX IF NOT EXISTS idx_combinations_product ON product_variant_combinations(product_id);
CREATE INDEX IF NOT EXISTS idx_combination_options_comb ON product_combination_options(combination_id);
CREATE INDEX IF NOT EXISTS idx_combination_options_opt ON product_combination_options(option_id);
CREATE INDEX IF NOT EXISTS idx_product_images_option ON product_images(option_id);

DROP TRIGGER IF EXISTS update_product_variant_types_updated_at ON product_variant_types;
CREATE TRIGGER update_product_variant_types_updated_at
    BEFORE UPDATE ON product_variant_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variant_options_updated_at ON product_variant_options;
CREATE TRIGGER update_product_variant_options_updated_at
    BEFORE UPDATE ON product_variant_options
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_variant_combinations_updated_at ON product_variant_combinations;
CREATE TRIGGER update_product_variant_combinations_updated_at
    BEFORE UPDATE ON product_variant_combinations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
