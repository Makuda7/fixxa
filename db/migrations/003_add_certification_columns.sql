-- Add missing columns to certifications table
-- These columns are used by the certification approval system

-- Add cloudinary_id for cloud storage reference
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);

-- Add file_type to distinguish between images and documents
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'document';

-- Add reviewed_at timestamp for when certification was reviewed
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;

-- Add reviewed_by_email to track which admin reviewed the certification
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS reviewed_by_email VARCHAR(255);

-- Update verified_at to use reviewed_at for consistency
-- (keeping both for backwards compatibility)
UPDATE certifications SET reviewed_at = verified_at WHERE verified_at IS NOT NULL AND reviewed_at IS NULL;
