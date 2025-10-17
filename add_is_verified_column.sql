-- Add is_verified column to workers table if it doesn't exist
ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workers_verified ON workers(is_verified);

-- Optional: Set workers with approval_status = 'approved' as verified
-- UPDATE workers SET is_verified = true WHERE approval_status = 'approved';
