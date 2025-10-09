-- Migration: Add missing columns to workers table

-- Add all columns first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='email') THEN
        ALTER TABLE workers ADD COLUMN email VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='password') THEN
        ALTER TABLE workers ADD COLUMN password VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='phone') THEN
        ALTER TABLE workers ADD COLUMN phone VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='address') THEN
        ALTER TABLE workers ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='city') THEN
        ALTER TABLE workers ADD COLUMN city VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='postal_code') THEN
        ALTER TABLE workers ADD COLUMN postal_code VARCHAR(20);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='profile_pic') THEN
        ALTER TABLE workers ADD COLUMN profile_pic VARCHAR(500);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='hourly_rate') THEN
        ALTER TABLE workers ADD COLUMN hourly_rate DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='is_active') THEN
        ALTER TABLE workers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='is_available') THEN
        ALTER TABLE workers ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='email_verified') THEN
        ALTER TABLE workers ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='verification_token') THEN
        ALTER TABLE workers ADD COLUMN verification_token VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='reset_token') THEN
        ALTER TABLE workers ADD COLUMN reset_token VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='reset_token_expiry') THEN
        ALTER TABLE workers ADD COLUMN reset_token_expiry TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='notification_preferences') THEN
        ALTER TABLE workers ADD COLUMN notification_preferences JSONB DEFAULT '{"emailMessages": true, "emailBookings": true, "emailCompletions": true, "emailReschedule": true, "emailPromotions": false, "smsEnabled": false}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='privacy_preferences') THEN
        ALTER TABLE workers ADD COLUMN privacy_preferences JSONB DEFAULT '{"profileVisible": true, "shareData": false}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='total_earnings') THEN
        ALTER TABLE workers ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='created_at') THEN
        ALTER TABLE workers ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='updated_at') THEN
        ALTER TABLE workers ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Set real email for worker 1
UPDATE workers 
SET email = 'kudadunbetter@gmail.com', 
    password = '$2b$10$rOl5WvJxqQPYc.Vo1N1EqOHJZ7VJhE/KqN6NUh3KYJPqR.8F5R5lO', 
    email_verified = true 
WHERE id = 1;

-- Set placeholder emails for other workers (they can be deleted later via admin panel)
UPDATE workers 
SET email = CONCAT('placeholder_', id, '@fixxa.temp'),
    password = '$2b$10$rOl5WvJxqQPYc.Vo1N1EqOHJZ7VJhE/KqN6NUh3KYJPqR.8F5R5lO',
    email_verified = false,
    is_active = false
WHERE id != 1;

-- Copy image to profile_pic
UPDATE workers SET profile_pic = image WHERE image IS NOT NULL;

-- Set NOT NULL constraints
ALTER TABLE workers ALTER COLUMN email SET NOT NULL;
ALTER TABLE workers ALTER COLUMN password SET NOT NULL;

-- Add unique constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workers_email_key') THEN
        ALTER TABLE workers ADD CONSTRAINT workers_email_key UNIQUE (email);
    END IF;
END $$;

-- Add trigger
DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
CREATE TRIGGER update_workers_updated_at 
    BEFORE UPDATE ON workers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workers_email ON workers(email);
CREATE INDEX IF NOT EXISTS idx_workers_speciality ON workers(speciality);
CREATE INDEX IF NOT EXISTS idx_workers_is_active ON workers(is_active);
CREATE INDEX IF NOT EXISTS idx_workers_is_available ON workers(is_available);
CREATE INDEX IF NOT EXISTS idx_workers_area ON workers(area);
