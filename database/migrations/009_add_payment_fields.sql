-- Add payment-related fields to bookings table
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'eft', 'online') OR payment_method IS NULL),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'disputed', 'refunded')),
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_proof_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method);

-- Create payment disputes table for tracking payment issues
CREATE TABLE IF NOT EXISTS payment_disputes (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by VARCHAR(20) NOT NULL CHECK (raised_by IN ('client', 'worker', 'admin')),
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution TEXT,
  resolved_by INTEGER REFERENCES workers(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_booking ON payment_disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status);
