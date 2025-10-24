-- Migration: Add ID Number/Passport Number fields to workers table
-- Purpose: Store identification documents for verification and admin use
-- Security: Changes to these fields are logged and require admin review

-- Add identification columns
ALTER TABLE workers ADD COLUMN IF NOT EXISTS id_type VARCHAR(20);
-- 'id_number' for South African ID, 'passport' for passport

ALTER TABLE workers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
-- Stores either SA ID number (13 digits) or passport number (alphanumeric)

ALTER TABLE workers ADD COLUMN IF NOT EXISTS id_submitted_at TIMESTAMP;
-- When the ID was first submitted

ALTER TABLE workers ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false;
-- Whether admin has verified the ID document

-- Create ID change logs table for audit trail
CREATE TABLE IF NOT EXISTS id_change_logs (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  old_id_type VARCHAR(20),
  old_id_number VARCHAR(50),
  new_id_type VARCHAR(20),
  new_id_number VARCHAR(50),
  change_reason TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  admin_reviewed BOOLEAN DEFAULT false,
  admin_approved BOOLEAN DEFAULT false,
  admin_notes TEXT,
  reviewed_at TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workers_id_number ON workers(id_number) WHERE id_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_id_change_logs_worker ON id_change_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_id_change_logs_pending ON id_change_logs(admin_reviewed) WHERE admin_reviewed = false;

-- Add comment to document purpose
COMMENT ON COLUMN workers.id_number IS 'SA ID Number or Passport Number - for admin verification only, not shared with clients';
COMMENT ON TABLE id_change_logs IS 'Audit trail for all ID number changes - requires admin review';
