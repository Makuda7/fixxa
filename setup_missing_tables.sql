-- This script creates all missing tables needed for the app
-- Run this on your Railway database to fix 500 errors

-- Create worker contact messages table (for Contact & Feedback feature)
CREATE TABLE IF NOT EXISTS worker_contact_messages (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP
);

-- Create feature suggestions table (for Feature Suggestions)
CREATE TABLE IF NOT EXISTS feature_suggestions (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  category VARCHAR(100),
  suggestion TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_worker_contact_messages_worker_id ON worker_contact_messages(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_contact_messages_status ON worker_contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_worker_contact_messages_created_at ON worker_contact_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_suggestions_worker_id ON feature_suggestions(worker_id);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_status ON feature_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_created_at ON feature_suggestions(created_at DESC);

-- Verify booking_requests table exists (should be from initial migration)
-- If not, create it
CREATE TABLE IF NOT EXISTS booking_requests (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  cancellation_reason TEXT,
  completion_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_worker_id ON booking_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);

-- Add service column to bookings if it doesn't exist (for display in requests)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='bookings' AND column_name='service') THEN
        ALTER TABLE bookings ADD COLUMN service VARCHAR(255);
    END IF;
END $$;

-- Output confirmation
SELECT 'Tables created/verified successfully!' as status;
SELECT 'worker_contact_messages' as table_name, COUNT(*) as row_count FROM worker_contact_messages
UNION ALL
SELECT 'feature_suggestions', COUNT(*) FROM feature_suggestions
UNION ALL
SELECT 'booking_requests', COUNT(*) FROM booking_requests;
