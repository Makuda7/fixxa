// Quick migration script to add cloudinary_id columns
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('Running migration to add cloudinary_id columns...');

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
