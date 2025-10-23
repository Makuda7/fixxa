-- Add phone number fields to users and workers tables
-- These are for admin use only (support, verification, emergency contact)

-- Add phone to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add phone to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add indexes for phone lookups (admin use)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone) WHERE phone IS NOT NULL;

-- Add comment to clarify admin-only use
COMMENT ON COLUMN users.phone IS 'Phone number for admin contact only - not shared with workers';
COMMENT ON COLUMN workers.phone IS 'Phone number for admin contact and verification - not shared with clients';
