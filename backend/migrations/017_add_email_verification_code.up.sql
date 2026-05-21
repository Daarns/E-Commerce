-- Add email_verification_code column to store the actual 6-digit code
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_code ON users(email_verification_code);
