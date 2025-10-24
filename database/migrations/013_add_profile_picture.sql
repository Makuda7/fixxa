-- Migration: Add profile picture to workers table
-- Purpose: Store worker profile picture for identity verification and client trust

-- Add profile picture columns
ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_picture_cloudinary_id VARCHAR(255);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_picture_uploaded_at TIMESTAMP;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_workers_with_picture ON workers(profile_picture) WHERE profile_picture IS NOT NULL;

-- Add comment to document purpose
COMMENT ON COLUMN workers.profile_picture IS 'Worker profile picture URL - must match ID/Passport photo for verification';
COMMENT ON COLUMN workers.profile_picture_cloudinary_id IS 'Cloudinary public ID for profile picture management';
