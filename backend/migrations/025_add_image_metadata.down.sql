ALTER TABLE temp_uploads
    DROP COLUMN IF EXISTS aspect_ratio,
    DROP COLUMN IF EXISTS height,
    DROP COLUMN IF EXISTS width;

ALTER TABLE product_images
    DROP COLUMN IF EXISTS aspect_ratio,
    DROP COLUMN IF EXISTS height,
    DROP COLUMN IF EXISTS width;
