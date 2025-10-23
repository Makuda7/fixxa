-- Add image support to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);

-- Add index for messages with images (for potential future queries)
CREATE INDEX IF NOT EXISTS idx_messages_with_images ON messages(image_url) WHERE image_url IS NOT NULL;

-- Update the content constraint to allow empty content if image is present
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check;
ALTER TABLE messages ADD CONSTRAINT messages_content_or_image_check
  CHECK (
    (content IS NOT NULL AND char_length(content) > 0 AND char_length(content) <= 5000)
    OR
    (image_url IS NOT NULL)
  );
