-- Migration: Add emergency contact fields to workers table
-- Purpose: Store emergency contact information for admin use in case of emergencies

-- Emergency Contact 1 (Required)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_name_1 VARCHAR(100);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_relationship_1 VARCHAR(50);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_phone_1 VARCHAR(20);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_email_1 VARCHAR(255);

-- Emergency Contact 2 (Optional)
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_name_2 VARCHAR(100);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_relationship_2 VARCHAR(50);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_phone_2 VARCHAR(20);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_email_2 VARCHAR(255);

-- Add comments to document purpose
COMMENT ON COLUMN workers.emergency_name_1 IS 'Emergency contact 1 full name - confidential, admin use only';
COMMENT ON COLUMN workers.emergency_phone_1 IS 'Emergency contact 1 phone - confidential, admin use only';
COMMENT ON COLUMN workers.emergency_name_2 IS 'Emergency contact 2 full name - confidential, admin use only';
COMMENT ON COLUMN workers.emergency_phone_2 IS 'Emergency contact 2 phone - confidential, admin use only';
