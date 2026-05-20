BEGIN;

CREATE TEMP TABLE tmp_variant_combos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    option_ids UUID[] NOT NULL,
    type_names TEXT[] NOT NULL,
    option_values TEXT[] NOT NULL,
    sku VARCHAR(100),
    price_adjustment DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
) ON COMMIT DROP;

WITH RECURSIVE
variant_options AS (
    SELECT
        pvt.product_id,
        pvt.id AS type_id,
        pvt.name AS type_name,
        pvt.display_order AS type_order,
        pvo.id AS option_id,
        pvo.value AS option_value,
        pv.price_adjustment,
        pv.stock_quantity,
        pv.is_active
    FROM product_variant_types pvt
    JOIN product_variant_options pvo ON pvo.variant_type_id = pvt.id
    JOIN product_variants pv
        ON pv.product_id = pvt.product_id
       AND pv.variant_type = pvt.name
       AND pv.variant_value = pvo.value
),
type_ranks AS (
    SELECT
        product_id,
        type_id,
        type_name,
        type_order,
        ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY type_order, type_name, type_id) AS rn,
        COUNT(*) OVER (PARTITION BY product_id) AS type_count
    FROM (
        SELECT DISTINCT product_id, type_id, type_name, type_order
        FROM variant_options
    ) distinct_types
),
combo AS (
    SELECT
        vo.product_id,
        tr.rn,
        tr.type_count,
        ARRAY[vo.option_id]::UUID[] AS option_ids,
        ARRAY[vo.type_name]::TEXT[] AS type_names,
        ARRAY[vo.option_value]::TEXT[] AS option_values,
        COALESCE(vo.price_adjustment, 0) AS price_adjustment,
        COALESCE(vo.stock_quantity, 0) AS stock_quantity,
        COALESCE(vo.is_active, TRUE) AS is_active
    FROM type_ranks tr
    JOIN variant_options vo ON vo.type_id = tr.type_id
    WHERE tr.rn = 1

    UNION ALL

    SELECT
        c.product_id,
        next_tr.rn,
        c.type_count,
        c.option_ids || vo.option_id,
        c.type_names || vo.type_name,
        c.option_values || vo.option_value,
        c.price_adjustment + COALESCE(vo.price_adjustment, 0),
        LEAST(c.stock_quantity, COALESCE(vo.stock_quantity, 0)),
        c.is_active AND COALESCE(vo.is_active, TRUE)
    FROM combo c
    JOIN type_ranks next_tr
        ON next_tr.product_id = c.product_id
       AND next_tr.rn = c.rn + 1
    JOIN variant_options vo ON vo.type_id = next_tr.type_id
),
final_combos AS (
    SELECT c.*
    FROM combo c
    WHERE c.rn = c.type_count
      AND c.type_count > 1
)
INSERT INTO tmp_variant_combos (
    product_id,
    option_ids,
    type_names,
    option_values,
    sku,
    price_adjustment,
    stock_quantity,
    is_active
)
SELECT
    fc.product_id,
    fc.option_ids,
    fc.type_names,
    fc.option_values,
    LEFT(
        CONCAT_WS(
            '-',
            NULLIF(p.sku, ''),
            array_to_string(
                ARRAY(
                    SELECT UPPER(TRIM(BOTH '-' FROM regexp_replace(value, '[^A-Za-z0-9]+', '-', 'g')))
                    FROM unnest(fc.option_values) AS value
                ),
                '-'
            ),
            LEFT(md5(array_to_string(fc.option_ids, ',')), 8)
        ),
        100
    ) AS sku,
    fc.price_adjustment,
    fc.stock_quantity,
    fc.is_active
FROM final_combos fc
JOIN products p ON p.id = fc.product_id
WHERE NOT EXISTS (
    SELECT 1
    FROM product_variant_combinations existing
    WHERE existing.product_id = fc.product_id
      AND (
          SELECT array_agg(pco.option_id ORDER BY pco.option_id)
          FROM product_combination_options pco
          WHERE pco.combination_id = existing.id
      ) = (
          SELECT array_agg(option_id ORDER BY option_id)
          FROM unnest(fc.option_ids) AS option_id
      )
);

INSERT INTO product_variant_combinations (
    id,
    product_id,
    sku,
    price_adjustment,
    stock_quantity,
    is_active,
    created_at,
    updated_at
)
SELECT
    id,
    product_id,
    sku,
    price_adjustment,
    stock_quantity,
    is_active,
    NOW(),
    NOW()
FROM tmp_variant_combos;

INSERT INTO product_combination_options (combination_id, option_id)
SELECT combo.id, option_id
FROM tmp_variant_combos combo
CROSS JOIN LATERAL unnest(combo.option_ids) AS option_id;

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS combination_id UUID;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS combination_id UUID;
ALTER TABLE stock_alerts ADD COLUMN IF NOT EXISTS combination_id UUID;

CREATE TEMP TABLE tmp_variant_to_combination AS
SELECT DISTINCT ON (pv.id)
    pv.id AS variant_id,
    pvc.id AS combination_id
FROM product_variants pv
JOIN product_variant_types pvt
    ON pvt.product_id = pv.product_id
   AND pvt.name = pv.variant_type
JOIN product_variant_options pvo
    ON pvo.variant_type_id = pvt.id
   AND pvo.value = pv.variant_value
JOIN product_combination_options pco ON pco.option_id = pvo.id
JOIN product_variant_combinations pvc
    ON pvc.id = pco.combination_id
   AND pvc.product_id = pv.product_id
ORDER BY
    pv.id,
    (
        SELECT COUNT(*)
        FROM product_combination_options option_count
        WHERE option_count.combination_id = pvc.id
    ),
    pvc.price_adjustment ASC,
    pvc.stock_quantity DESC,
    pvc.id;

UPDATE cart_items ci
SET combination_id = mapping.combination_id
FROM tmp_variant_to_combination mapping
WHERE ci.variant_id = mapping.variant_id;

UPDATE order_items oi
SET combination_id = mapping.combination_id
FROM tmp_variant_to_combination mapping
WHERE oi.variant_id = mapping.variant_id;

UPDATE stock_alerts sa
SET combination_id = mapping.combination_id
FROM tmp_variant_to_combination mapping
WHERE sa.variant_id = mapping.variant_id;

WITH combination_labels AS (
    SELECT
        pvc.id,
        string_agg(pvt.name, ' / ' ORDER BY pvt.display_order, pvt.name) AS variant_type,
        string_agg(pvo.value, ' / ' ORDER BY pvt.display_order, pvt.name) AS variant_value
    FROM product_variant_combinations pvc
    JOIN product_combination_options pco ON pco.combination_id = pvc.id
    JOIN product_variant_options pvo ON pvo.id = pco.option_id
    JOIN product_variant_types pvt ON pvt.id = pvo.variant_type_id
    GROUP BY pvc.id
)
UPDATE order_items oi
SET
    variant_type = labels.variant_type,
    variant_value = labels.variant_value
FROM combination_labels labels
WHERE oi.combination_id = labels.id;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_variant_id_fkey;
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_variant_id_fkey;
ALTER TABLE stock_alerts DROP CONSTRAINT IF EXISTS stock_alerts_variant_id_fkey;

ALTER TABLE cart_items
    ADD CONSTRAINT cart_items_combination_id_fkey
    FOREIGN KEY (combination_id)
    REFERENCES product_variant_combinations(id)
    ON DELETE SET NULL;

ALTER TABLE order_items
    ADD CONSTRAINT order_items_combination_id_fkey
    FOREIGN KEY (combination_id)
    REFERENCES product_variant_combinations(id)
    ON DELETE SET NULL;

ALTER TABLE stock_alerts
    ADD CONSTRAINT stock_alerts_combination_id_fkey
    FOREIGN KEY (combination_id)
    REFERENCES product_variant_combinations(id)
    ON DELETE SET NULL;

ALTER TABLE cart_items DROP COLUMN IF EXISTS variant_id;
ALTER TABLE order_items DROP COLUMN IF EXISTS variant_id;
ALTER TABLE stock_alerts DROP COLUMN IF EXISTS variant_id;

DROP TABLE IF EXISTS product_variants CASCADE;

INSERT INTO schema_migrations (version, description, installed_on, execution_time)
SELECT '023', 'finalize product variant combinations', NOW(), 0
WHERE NOT EXISTS (
    SELECT 1
    FROM schema_migrations
    WHERE version = '023'
);

COMMIT;
