-- Migration: Add suburbs system with primary and secondary areas
-- Created: 2025-10-27
-- Purpose: Allow workers to specify primary suburb and secondary service areas

-- Create suburbs table for dynamic dropdown
CREATE TABLE IF NOT EXISTS suburbs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  worker_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, province)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_suburbs_province ON suburbs(province);
CREATE INDEX IF NOT EXISTS idx_suburbs_active ON suburbs(is_active) WHERE is_active = true;

-- Add new fields to workers table
ALTER TABLE workers ADD COLUMN IF NOT EXISTS primary_suburb VARCHAR(100);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS secondary_areas TEXT[];

-- Migrate existing data: move 'area' to 'primary_suburb'
UPDATE workers
SET primary_suburb = area
WHERE primary_suburb IS NULL AND area IS NOT NULL AND area != '';

-- Add index for suburb searches
CREATE INDEX IF NOT EXISTS idx_workers_primary_suburb ON workers(primary_suburb);
CREATE INDEX IF NOT EXISTS idx_workers_province ON workers(province);

-- Function to update suburb worker count
CREATE OR REPLACE FUNCTION update_suburb_worker_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement count for old suburb
  IF OLD.primary_suburb IS NOT NULL AND OLD.primary_suburb != '' THEN
    UPDATE suburbs
    SET worker_count = worker_count - 1
    WHERE LOWER(name) = LOWER(OLD.primary_suburb)
    AND LOWER(province) = LOWER(COALESCE(OLD.province, ''));
  END IF;

  -- Increment count for new suburb
  IF NEW.primary_suburb IS NOT NULL AND NEW.primary_suburb != ''
     AND NEW.is_active = true
     AND NEW.approval_status = 'approved' THEN
    INSERT INTO suburbs (name, province, worker_count)
    VALUES (
      INITCAP(TRIM(NEW.primary_suburb)),
      INITCAP(TRIM(COALESCE(NEW.province, ''))),
      1
    )
    ON CONFLICT (name, province)
    DO UPDATE SET
      worker_count = suburbs.worker_count + 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update suburb counts
DROP TRIGGER IF EXISTS trg_update_suburb_count ON workers;
CREATE TRIGGER trg_update_suburb_count
AFTER INSERT OR UPDATE OF primary_suburb, is_active, approval_status ON workers
FOR EACH ROW
EXECUTE FUNCTION update_suburb_worker_count();

-- Initial population: add suburbs from existing approved workers
INSERT INTO suburbs (name, province, worker_count)
SELECT
  INITCAP(TRIM(primary_suburb)) as name,
  INITCAP(TRIM(COALESCE(province, 'Gauteng'))) as province,
  COUNT(*) as worker_count
FROM workers
WHERE primary_suburb IS NOT NULL
  AND primary_suburb != ''
  AND is_active = true
  AND approval_status = 'approved'
GROUP BY INITCAP(TRIM(primary_suburb)), INITCAP(TRIM(COALESCE(province, 'Gauteng')))
ON CONFLICT (name, province) DO NOTHING;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Suburbs system migration completed successfully';
END $$;
