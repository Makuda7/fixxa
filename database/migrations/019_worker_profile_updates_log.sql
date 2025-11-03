-- Migration: Track worker profile updates for admin notifications
-- This table logs every change workers make to their profiles

CREATE TABLE IF NOT EXISTS worker_profile_updates (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_name VARCHAR(255),
  worker_email VARCHAR(255),
  update_type VARCHAR(100) NOT NULL, -- 'profile_info', 'certifications', 'emergency_contact', 'service_area', etc.
  field_changed VARCHAR(255), -- specific field that was updated
  old_value TEXT, -- previous value (optional)
  new_value TEXT, -- new value (optional)
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed'
  reviewed_by INTEGER REFERENCES users(id), -- admin who reviewed
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_worker_updates_worker_id ON worker_profile_updates(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_updates_status ON worker_profile_updates(status);
CREATE INDEX IF NOT EXISTS idx_worker_updates_created_at ON worker_profile_updates(created_at);

-- Add comments for documentation
COMMENT ON TABLE worker_profile_updates IS 'Logs all worker profile changes for admin review and tracking';
COMMENT ON COLUMN worker_profile_updates.update_type IS 'Category of update: profile_info, certifications, emergency_contact, service_area, availability';
COMMENT ON COLUMN worker_profile_updates.status IS 'Review status: pending (needs admin review), reviewed (admin checked), dismissed (not important)';
