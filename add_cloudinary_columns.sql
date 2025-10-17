-- Add Cloudinary support columns to file storage tables

-- Add cloudinary_id column to portfolio_photos table
ALTER TABLE portfolio_photos
ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);

-- Add cloudinary_id and file_type columns to certifications table
ALTER TABLE certifications
ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_type VARCHAR(50) DEFAULT 'document';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_cloudinary ON portfolio_photos(cloudinary_id);
CREATE INDEX IF NOT EXISTS idx_certifications_cloudinary ON certifications(cloudinary_id);
