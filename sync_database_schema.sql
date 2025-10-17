-- =====================================================
-- COMPREHENSIVE DATABASE SCHEMA SYNC
-- Adds all missing columns to align with /database/schema.sql
-- Safe to run multiple times (uses IF NOT EXISTS)
-- =====================================================

-- ==================== WORKERS TABLE ====================
-- Add missing columns to workers table

ALTER TABLE workers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS verification_documents JSONB;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS suburb VARCHAR(100);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS rate_amount DECIMAL(10,2);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS completed_jobs INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workers_verification_status_check'
    ) THEN
        ALTER TABLE workers ADD CONSTRAINT workers_verification_status_check
        CHECK (verification_status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workers_rate_type_check'
    ) THEN
        ALTER TABLE workers ADD CONSTRAINT workers_rate_type_check
        CHECK (rate_type IN ('hourly', 'fixed') OR rate_type IS NULL);
    END IF;
END $$;

-- ==================== USERS TABLE ====================
-- Add missing columns to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS suburb VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- ==================== BOOKINGS TABLE ====================
-- Add missing columns to bookings table

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS professional_response TEXT;

-- ==================== MESSAGES TABLE ====================
-- Add missing columns to messages table

ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ==================== PORTFOLIO PHOTOS ====================
-- Add cloudinary support to portfolio_photos

ALTER TABLE portfolio_photos ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);

-- ==================== CERTIFICATIONS ====================
-- Add cloudinary support and file type to certifications

ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS file_type VARCHAR(50) DEFAULT 'document';

-- ==================== INDEXES ====================
-- Add missing indexes for performance

CREATE INDEX IF NOT EXISTS idx_workers_verified ON workers(is_verified);
CREATE INDEX IF NOT EXISTS idx_workers_cloudinary ON workers(cloudinary_id);
CREATE INDEX IF NOT EXISTS idx_users_cloudinary ON users(cloudinary_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_cloudinary ON portfolio_photos(cloudinary_id);
CREATE INDEX IF NOT EXISTS idx_certifications_cloudinary ON certifications(cloudinary_id);
CREATE INDEX IF NOT EXISTS idx_workers_verification_status ON workers(verification_status);
CREATE INDEX IF NOT EXISTS idx_workers_approval_status ON workers(approval_status);

-- ==================== VERIFICATION ====================
SELECT
    'Database schema sync completed!' as status,
    'Added missing columns and indexes' as details;
