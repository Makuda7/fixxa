-- Virus Scan Logs Table
-- Tracks all file uploads and their virus scan results for security auditing

CREATE TABLE IF NOT EXISTS virus_scan_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_type VARCHAR(20), -- 'client' or 'professional'
  file_name VARCHAR(255),
  file_type VARCHAR(50), -- 'certification', 'profile_pic', 'review_photo', 'message_image'
  file_size INTEGER, -- bytes
  scan_result VARCHAR(30), -- 'CLEAN', 'INFECTED', 'SCAN_FAILED_ALLOWED', 'SCAN_ERROR_ALLOWED'
  viruses_found JSONB, -- Array of virus names
  action_taken VARCHAR(20), -- 'allowed', 'blocked'
  cloudinary_url TEXT, -- URL if uploaded
  cloudinary_id VARCHAR(255), -- Cloudinary public_id if uploaded
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys (optional - files may be from deleted users)
  CONSTRAINT fk_user_client FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_user_worker FOREIGN KEY (user_id) REFERENCES workers(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_virus_scans_user ON virus_scan_logs(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_virus_scans_result ON virus_scan_logs(scan_result);
CREATE INDEX IF NOT EXISTS idx_virus_scans_action ON virus_scan_logs(action_taken);
CREATE INDEX IF NOT EXISTS idx_virus_scans_date ON virus_scan_logs(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_virus_scans_type ON virus_scan_logs(file_type);

-- Comments for documentation
COMMENT ON TABLE virus_scan_logs IS 'Security audit log for all file uploads and virus scans';
COMMENT ON COLUMN virus_scan_logs.scan_result IS 'Result from Cloudmersive: CLEAN, INFECTED, or SCAN_FAILED_ALLOWED';
COMMENT ON COLUMN virus_scan_logs.action_taken IS 'What happened: allowed (uploaded) or blocked (rejected)';
