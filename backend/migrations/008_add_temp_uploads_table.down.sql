-- Drop indexes
DROP INDEX IF EXISTS public.idx_temp_uploads_cleanup;
DROP INDEX IF EXISTS public.idx_temp_uploads_image_url;
DROP INDEX IF EXISTS public.idx_temp_uploads_uploaded_by;

-- Drop table
DROP TABLE IF EXISTS public.temp_uploads;
