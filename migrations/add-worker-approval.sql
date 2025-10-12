-- Migration: Add worker approval system
-- Run this on your production database

-- Add approval_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workers' AND column_name='approval_status') THEN
        ALTER TABLE workers ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved';
    END IF;
END $$;

-- Add approval_date column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workers' AND column_name='approval_date') THEN
        ALTER TABLE workers ADD COLUMN approval_date TIMESTAMP;
    END IF;
END $$;

-- Add approved_by column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workers' AND column_name='approved_by') THEN
        ALTER TABLE workers ADD COLUMN approved_by VARCHAR(255);
    END IF;
END $$;

-- Add rejection_reason column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workers' AND column_name='rejection_reason') THEN
        ALTER TABLE workers ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- Add phone column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workers' AND column_name='phone') THEN
        ALTER TABLE workers ADD COLUMN phone VARCHAR(20);
    END IF;
END $$;

-- Add address columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workers' AND column_name='address') THEN
        ALTER TABLE workers ADD COLUMN address TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workers' AND column_name='city') THEN
        ALTER TABLE workers ADD COLUMN city VARCHAR(100);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='workers' AND column_name='postal_code') THEN
        ALTER TABLE workers ADD COLUMN postal_code VARCHAR(10);
    END IF;
END $$;

-- Set existing workers to 'approved' status (for backwards compatibility)
UPDATE workers SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Create index on approval_status for faster queries
CREATE INDEX IF NOT EXISTS idx_workers_approval_status ON workers(approval_status);
