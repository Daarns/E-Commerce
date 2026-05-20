BEGIN;

DELETE FROM product_images
WHERE option_id IN (
    SELECT pvo.id
    FROM product_variant_options pvo
    JOIN product_variant_types pvt ON pvt.id = pvo.variant_type_id
);

DELETE FROM product_combination_options;
DELETE FROM product_variant_combinations;
DELETE FROM product_variant_options;
DELETE FROM product_variant_types;

COMMIT;
