-- Add phone, city, and suburb columns to users and workers tables

-- Add columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS suburb VARCHAR(100);

-- Add columns to workers table
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS suburb VARCHAR(100);
