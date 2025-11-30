-- MANUAL FIX: Add document_type column to certifications table
-- Run this with: railway run psql $DATABASE_URL < MANUAL_FIX.sql

-- Step 1: Add the column
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'certification';

-- Step 2: Update existing records to mark verification documents
UPDATE certifications
SET document_type = 'verification_document'
WHERE document_type = 'certification'
  AND (LOWER(document_name) LIKE '%id%'
   OR LOWER(document_name) LIKE '%proof%'
   OR LOWER(document_name) LIKE '%residence%'
   OR LOWER(document_name) LIKE '%address%'
   OR LOWER(document_name) LIKE '%passport%'
   OR LOWER(document_name) LIKE '%identity%'
   OR LOWER(document_name) LIKE '%verification%');

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_certifications_document_type ON certifications(document_type);

-- Show results
SELECT 'Worker 4 certifications:' as info;
SELECT id, document_name, document_type, status
FROM certifications
WHERE worker_id = 4
ORDER BY id;

SELECT 'Worker 4 approved professional certifications count:' as info;
SELECT COUNT(*) as approved_cert_count
FROM certifications
WHERE worker_id = 4
  AND status = 'approved'
  AND document_type = 'certification';
