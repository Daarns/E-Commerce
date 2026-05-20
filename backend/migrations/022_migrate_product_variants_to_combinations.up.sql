BEGIN;

INSERT INTO product_variant_types (
    product_id,
    name,
    is_visual,
    display_order,
    created_at,
    updated_at
)
SELECT
    ranked.product_id,
    ranked.variant_type,
    CASE
        WHEN LOWER(ranked.variant_type) IN ('warna', 'color', 'colour', 'motif') THEN true
        ELSE false
    END AS is_visual,
    ranked.display_order,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        product_id,
        variant_type,
        ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY variant_type) - 1 AS display_order
    FROM (
        SELECT DISTINCT product_id, variant_type
        FROM product_variants
    ) distinct_types
) ranked
ON CONFLICT (product_id, name) DO UPDATE SET
    is_visual = EXCLUDED.is_visual,
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO product_variant_options (
    variant_type_id,
    value,
    display_order,
    created_at,
    updated_at
)
SELECT
    pvt.id AS variant_type_id,
    ranked.variant_value,
    ranked.display_order,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        product_id,
        variant_type,
        variant_value,
        ROW_NUMBER() OVER (
            PARTITION BY product_id, variant_type
            ORDER BY variant_value
        ) - 1 AS display_order
    FROM (
        SELECT DISTINCT product_id, variant_type, variant_value
        FROM product_variants
    ) distinct_options
) ranked
JOIN product_variant_types pvt
    ON pvt.product_id = ranked.product_id
   AND pvt.name = ranked.variant_type
ON CONFLICT (variant_type_id, value) DO UPDATE SET
    display_order = EXCLUDED.display_order,
    updated_at = CURRENT_TIMESTAMP;

WITH variant_type_counts AS (
    SELECT product_id, COUNT(DISTINCT variant_type) AS type_count
    FROM product_variants
    GROUP BY product_id
),
single_type_variants AS (
    SELECT pv.*
    FROM product_variants pv
    JOIN variant_type_counts vtc ON vtc.product_id = pv.product_id
    WHERE vtc.type_count = 1
)
INSERT INTO product_variant_combinations (
    id,
    product_id,
    price_adjustment,
    stock_quantity,
    sku,
    is_active,
    created_at,
    updated_at
)
SELECT
    stv.id,
    stv.product_id,
    COALESCE(stv.price_adjustment, 0),
    COALESCE(stv.stock_quantity, 0),
    LEFT(
        CONCAT_WS(
            '-',
            p.sku,
            NULLIF(UPPER(REGEXP_REPLACE(stv.variant_value, '[^A-Za-z0-9]+', '-', 'g')), ''),
            LEFT(stv.id::text, 8)
        ),
        100
    ) AS sku,
    COALESCE(stv.is_active, true),
    COALESCE(stv.created_at, CURRENT_TIMESTAMP),
    COALESCE(stv.updated_at, CURRENT_TIMESTAMP)
FROM single_type_variants stv
JOIN products p ON p.id = stv.product_id
ON CONFLICT (id) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    price_adjustment = EXCLUDED.price_adjustment,
    stock_quantity = EXCLUDED.stock_quantity,
    sku = EXCLUDED.sku,
    is_active = EXCLUDED.is_active,
    updated_at = EXCLUDED.updated_at;

WITH variant_type_counts AS (
    SELECT product_id, COUNT(DISTINCT variant_type) AS type_count
    FROM product_variants
    GROUP BY product_id
),
single_type_variants AS (
    SELECT pv.*
    FROM product_variants pv
    JOIN variant_type_counts vtc ON vtc.product_id = pv.product_id
    WHERE vtc.type_count = 1
)
INSERT INTO product_combination_options (combination_id, option_id)
SELECT
    stv.id AS combination_id,
    pvo.id AS option_id
FROM single_type_variants stv
JOIN product_variant_types pvt
    ON pvt.product_id = stv.product_id
   AND pvt.name = stv.variant_type
JOIN product_variant_options pvo
    ON pvo.variant_type_id = pvt.id
   AND pvo.value = stv.variant_value
ON CONFLICT (combination_id, option_id) DO NOTHING;

INSERT INTO product_images (
    product_id,
    image_url,
    alt_text,
    display_order,
    is_primary,
    created_at,
    option_id
)
SELECT
    pv.product_id,
    pv.image_url,
    CONCAT(p.name, ' ', pv.variant_value),
    1000 + ROW_NUMBER() OVER (PARTITION BY pv.product_id ORDER BY pv.variant_type, pv.variant_value),
    false,
    CURRENT_TIMESTAMP,
    pvo.id
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
JOIN product_variant_types pvt
    ON pvt.product_id = pv.product_id
   AND pvt.name = pv.variant_type
JOIN product_variant_options pvo
    ON pvo.variant_type_id = pvt.id
   AND pvo.value = pv.variant_value
WHERE NULLIF(TRIM(COALESCE(pv.image_url, '')), '') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM product_images pi
      WHERE pi.product_id = pv.product_id
        AND pi.image_url = pv.image_url
        AND pi.option_id = pvo.id
  );

COMMIT;
