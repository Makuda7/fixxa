-- Migration 007: Add availability schedule and status to workers table

-- Add availability_schedule column (weekdays/weekends/both)
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS availability_schedule VARCHAR(20) DEFAULT 'both';

-- Add is_available column (boolean flag for accepting bookings)
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN workers.availability_schedule IS 'Work schedule preference: weekdays, weekends, or both';
COMMENT ON COLUMN workers.is_available IS 'Whether the worker is currently accepting new bookings';

-- Optional: Add a check constraint to ensure only valid schedule values
ALTER TABLE workers 
ADD CONSTRAINT check_availability_schedule 
CHECK (availability_schedule IN ('weekdays', 'weekends', 'both'));