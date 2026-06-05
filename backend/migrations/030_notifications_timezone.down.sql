ALTER TABLE notifications
    ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE 'Asia/Jakarta',
    ALTER COLUMN read_at TYPE TIMESTAMP USING read_at AT TIME ZONE 'Asia/Jakarta';

ALTER TABLE notifications
    ALTER COLUMN created_at SET DEFAULT NOW(),
    ALTER COLUMN updated_at SET DEFAULT NOW();
