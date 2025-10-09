-- Migration: Add portfolio_photos table for worker portfolio images
-- Date: 2025-10-09

-- Create portfolio_photos table
CREATE TABLE IF NOT EXISTS portfolio_photos (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_portfolio_worker ON portfolio_photos(worker_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_uploaded ON portfolio_photos(uploaded_at DESC);

-- Grant permissions (if using specific database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON portfolio_photos TO fixxa_user;
-- GRANT USAGE, SELECT ON SEQUENCE portfolio_photos_id_seq TO fixxa_user;
