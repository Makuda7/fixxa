// Quick migration script to add cloudinary_id columns
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('Running migration to add missing columns...');

    // Add cloudinary_id to users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);
    `);
    console.log('✓ Added cloudinary_id column to users table');

    // Add cloudinary_id to workers table
    await pool.query(`
      ALTER TABLE workers ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);
    `);
    console.log('✓ Added cloudinary_id column to workers table');

    // Add missing columns to certifications table
    await pool.query(`
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);
    `);
    console.log('✓ Added cloudinary_id column to certifications table');

    await pool.query(`
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'document';
    `);
    console.log('✓ Added file_type column to certifications table');

    await pool.query(`
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
    `);
    console.log('✓ Added reviewed_at column to certifications table');

    await pool.query(`
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS reviewed_by_email VARCHAR(255);
    `);
    console.log('✓ Added reviewed_by_email column to certifications table');

    // Add indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_cloudinary ON users(cloudinary_id);
    `);
    console.log('✓ Added index on users.cloudinary_id');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workers_cloudinary ON workers(cloudinary_id);
    `);
    console.log('✓ Added index on workers.cloudinary_id');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
