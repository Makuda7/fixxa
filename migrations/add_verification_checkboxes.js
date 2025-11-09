// Add verification checkbox states to workers table
const { Pool } = require('pg');

async function addVerificationCheckboxes(pool, logger) {
  try {
    console.log('🔄 Adding verification checkbox columns to workers table...');

    // Add columns for each verification checkbox
    await pool.query(`
      ALTER TABLE workers
      ADD COLUMN IF NOT EXISTS verified_profile_pic BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verified_id_info BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verified_emergency BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verified_professional BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS verified_documents BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_verification_update TIMESTAMP DEFAULT NULL
    `);

    console.log('✅ Added verification checkbox columns to workers table');
  } catch (error) {
    console.log('⚠️  Migration skipped or already applied:', error.message);
  }
}

module.exports = { addVerificationCheckboxes };
