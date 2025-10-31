-- Migration: Add service address to bookings
-- Created: 2025-10-31
-- Purpose: Allow clients to share their physical address with workers after booking acceptance

-- Add service address fields to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_address TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_address_provided_at TIMESTAMP;

-- Add index for queries
CREATE INDEX IF NOT EXISTS idx_bookings_address_provided ON bookings(service_address_provided_at) WHERE service_address_provided_at IS NOT NULL;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Booking address migration completed successfully';
END $$;
