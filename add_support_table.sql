-- Add support_requests table for tracking complaints and support tickets
CREATE TABLE IF NOT EXISTS support_requests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  user_type VARCHAR(50),
  category VARCHAR(100) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  booking_id VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_requests_email ON support_requests(email);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_category ON support_requests(category);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at ON support_requests(created_at DESC);

-- Verify table created
SELECT 'Support requests table created successfully!' as status;
SELECT COUNT(*) as total_requests FROM support_requests;
