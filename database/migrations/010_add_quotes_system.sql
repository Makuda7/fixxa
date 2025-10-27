-- Migration 010: Add quotes and receipts system
-- This enables workers to send quotes and auto-generate receipts

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Quote details
  line_items JSONB NOT NULL, -- Array of {description, amount}
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Payment terms
  payment_methods TEXT[], -- ['cash', 'eft', 'card']
  banking_details JSONB, -- {bank, account_number, account_type, branch_code}
  notes TEXT,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  valid_until TIMESTAMP,

  -- Timestamps
  sent_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one active quote per booking
  CONSTRAINT unique_active_quote UNIQUE (booking_id, status)
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  quote_id INTEGER REFERENCES quotes(id) ON DELETE SET NULL,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Receipt details
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  line_items JSONB NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Payment info
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
  paid_at TIMESTAMP,

  -- Email tracking
  emailed_to VARCHAR(255),
  emailed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_booking_id ON quotes(booking_id);
CREATE INDEX IF NOT EXISTS idx_quotes_worker_id ON quotes(worker_id);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

CREATE INDEX IF NOT EXISTS idx_receipts_booking_id ON receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_receipts_worker_id ON receipts(worker_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client_id ON receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT := 'FIX';
  year TEXT := TO_CHAR(NOW(), 'YY');
  sequence_num TEXT;
  receipt_num TEXT;
BEGIN
  -- Get next sequence number for this year
  SELECT LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO sequence_num
  FROM receipts
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  receipt_num := prefix || '-' || year || '-' || sequence_num;
  RETURN receipt_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate receipt number
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := generate_receipt_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_receipt_number
BEFORE INSERT ON receipts
FOR EACH ROW
EXECUTE FUNCTION set_receipt_number();

-- Update timestamp trigger for quotes
CREATE OR REPLACE FUNCTION update_quotes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quotes_timestamp
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_quotes_timestamp();

-- Update timestamp trigger for receipts
CREATE OR REPLACE FUNCTION update_receipts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_receipts_timestamp
BEFORE UPDATE ON receipts
FOR EACH ROW
EXECUTE FUNCTION update_receipts_timestamp();

-- Comments for documentation
COMMENT ON TABLE quotes IS 'Stores quotes sent by workers to clients for bookings';
COMMENT ON TABLE receipts IS 'Stores receipts generated when jobs are completed';
COMMENT ON COLUMN quotes.line_items IS 'JSON array of quote line items: [{description: string, amount: number}]';
COMMENT ON COLUMN quotes.payment_methods IS 'Array of accepted payment methods';
COMMENT ON COLUMN quotes.banking_details IS 'Worker banking info for EFT payments';
COMMENT ON COLUMN receipts.receipt_number IS 'Unique receipt number in format FIX-YY-XXXXXX';
