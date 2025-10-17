-- Add cloudinary_id column to users and workers tables for profile pictures
ALTER TABLE users ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_cloudinary ON users(cloudinary_id);
CREATE INDEX IF NOT EXISTS idx_workers_cloudinary ON workers(cloudinary_id);
