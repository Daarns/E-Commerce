BEGIN;

ALTER TABLE product_images
    DROP CONSTRAINT IF EXISTS product_images_option_id_fkey;

ALTER TABLE product_images
    DROP COLUMN IF EXISTS option_id;

DROP TABLE IF EXISTS product_combination_options;
DROP TABLE IF EXISTS product_variant_combinations;
DROP TABLE IF EXISTS product_variant_options;
DROP TABLE IF EXISTS product_variant_types;

COMMIT;
