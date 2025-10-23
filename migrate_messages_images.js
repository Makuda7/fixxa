// Run message images migration
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();

    console.log('🔄 Running message images migration...\n');

    // Add image columns
    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    console.log('✓ Added image_url column');

    await client.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255)`);
    console.log('✓ Added cloudinary_id column');

    // Add index
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_with_images ON messages(image_url) WHERE image_url IS NOT NULL`);
    console.log('✓ Added index for messages with images');

    // Update constraints
    await client.query(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check`);
    console.log('✓ Dropped old content constraint');

    await client.query(`
      ALTER TABLE messages ADD CONSTRAINT messages_content_or_image_check
      CHECK (
        (content IS NOT NULL AND char_length(content) > 0 AND char_length(content) <= 5000)
        OR
        (image_url IS NOT NULL)
      )
    `);
    console.log('✓ Added new content_or_image constraint');

    console.log('\n✅ Message images migration completed successfully!');

    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
