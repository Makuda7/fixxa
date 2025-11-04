// Simple script to add missing columns to certifications table
// Run this with: node add_cert_columns.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addColumns() {
  const client = await pool.connect();

  try {
    console.log('Adding missing columns to certifications table...\n');

    // Add cloudinary_id column
    await client.query('ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);');
    console.log('✓ Added cloudinary_id column');

    // Add file_type column
    await client.query("ALTER TABLE certifications ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'document';");
    console.log('✓ Added file_type column');

    // Add reviewed_at column
    await client.query('ALTER TABLE certifications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;');
    console.log('✓ Added reviewed_at column');

    // Add reviewed_by_email column
    await client.query('ALTER TABLE certifications ADD COLUMN IF NOT EXISTS reviewed_by_email VARCHAR(255);');
    console.log('✓ Added reviewed_by_email column');

    console.log('\n✅ All columns added successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addColumns();
