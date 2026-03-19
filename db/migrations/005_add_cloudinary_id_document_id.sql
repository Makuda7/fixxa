-- Add cloudinary_id_document_id column to workers table
-- This stores the Cloudinary public ID for the worker's ID/passport document
-- so it can be deleted from Cloudinary when replaced

ALTER TABLE workers ADD COLUMN IF NOT EXISTS cloudinary_id_document_id VARCHAR(500);
