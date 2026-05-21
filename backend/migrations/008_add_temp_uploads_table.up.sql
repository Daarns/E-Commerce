-- Create temp_uploads table for tracking uncommitted file uploads
CREATE TABLE IF NOT EXISTS public.temp_uploads (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url   TEXT        NOT NULL,
    uploaded_by UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
    claimed     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup job: find expired unclaimed uploads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_uploads_cleanup
    ON public.temp_uploads (expires_at)
    WHERE claimed = FALSE;

-- Index for claim process: lookup by image URL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_uploads_image_url
    ON public.temp_uploads (image_url)
    WHERE claimed = FALSE;

-- Index for audit: uploads per admin
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_temp_uploads_uploaded_by
    ON public.temp_uploads (uploaded_by, created_at DESC);
