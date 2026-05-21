-- Add email verification tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_code_sent_at TIMESTAMP;

-- Add index for last_code_sent_at to optimize rate limit checks
CREATE INDEX IF NOT EXISTS idx_users_last_code_sent_at ON users(last_code_sent_at);
