BEGIN;

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_type VARCHAR(50) NOT NULL,
    variant_value VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(12,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(product_id, variant_type, variant_value)
);

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID;
ALTER TABLE stock_alerts ADD COLUMN IF NOT EXISTS variant_id UUID;

WITH recreated_variants AS (
    INSERT INTO product_variants (
        id,
        product_id,
        variant_type,
        variant_value,
        price_adjustment,
        stock_quantity,
        sku,
        is_active,
        created_at,
        updated_at
    )
    SELECT
        pvc.id,
        pvc.product_id,
        string_agg(pvt.name, ' / ' ORDER BY pvt.display_order, pvt.name),
        string_agg(pvo.value, ' / ' ORDER BY pvt.display_order, pvt.name),
        pvc.price_adjustment,
        pvc.stock_quantity,
        pvc.sku,
        pvc.is_active,
        pvc.created_at,
        pvc.updated_at
    FROM product_variant_combinations pvc
    JOIN product_combination_options pco ON pco.combination_id = pvc.id
    JOIN product_variant_options pvo ON pvo.id = pco.option_id
    JOIN product_variant_types pvt ON pvt.id = pvo.variant_type_id
    GROUP BY pvc.id
    ON CONFLICT (id) DO NOTHING
    RETURNING id
)
SELECT COUNT(*) FROM recreated_variants;

UPDATE cart_items SET variant_id = combination_id WHERE variant_id IS NULL;
UPDATE order_items SET variant_id = combination_id WHERE variant_id IS NULL;
UPDATE stock_alerts SET variant_id = combination_id WHERE variant_id IS NULL;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_combination_id_fkey;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_combination_id_fkey;
ALTER TABLE stock_alerts DROP CONSTRAINT IF EXISTS stock_alerts_combination_id_fkey;

ALTER TABLE cart_items
    ADD CONSTRAINT cart_items_variant_id_fkey
    FOREIGN KEY (variant_id)
    REFERENCES product_variants(id)
    ON DELETE SET NULL;

ALTER TABLE order_items
    ADD CONSTRAINT order_items_variant_id_fkey
    FOREIGN KEY (variant_id)
    REFERENCES product_variants(id)
    ON DELETE SET NULL;

ALTER TABLE stock_alerts
    ADD CONSTRAINT stock_alerts_variant_id_fkey
    FOREIGN KEY (variant_id)
    REFERENCES product_variants(id)
    ON DELETE SET NULL;

ALTER TABLE cart_items DROP COLUMN IF EXISTS combination_id;
ALTER TABLE order_items DROP COLUMN IF EXISTS combination_id;
ALTER TABLE stock_alerts DROP COLUMN IF EXISTS combination_id;

DELETE FROM schema_migrations WHERE version = '023';

COMMIT;
