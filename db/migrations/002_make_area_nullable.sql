-- Make area column nullable in workers table
-- This allows workers to register without specifying an area initially
ALTER TABLE workers ALTER COLUMN area DROP NOT NULL;
