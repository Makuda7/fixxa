-- Add document_type column to track whether this is a certification or verification document
-- This prevents needing to guess from document names

ALTER TABLE certifications ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'certification';

-- Update existing records to mark verification documents
-- Any document with ID/proof/residence keywords should be marked as verification
UPDATE certifications
SET document_type = 'verification_document'
WHERE LOWER(document_name) LIKE '%id%'
   OR LOWER(document_name) LIKE '%proof%'
   OR LOWER(document_name) LIKE '%residence%'
   OR LOWER(document_name) LIKE '%address%'
   OR LOWER(document_name) LIKE '%passport%'
   OR LOWER(document_name) LIKE '%identity%'
   OR LOWER(document_name) LIKE '%verification%';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_certifications_document_type ON certifications(document_type);

-- Add comments for clarity
COMMENT ON COLUMN certifications.document_type IS 'Type of document: certification (professional cert) or verification_document (ID/proof of residence)';
