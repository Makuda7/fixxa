// Fix verification_status for workers who have email_verified = true
const { Pool } = require('pg');

async function fixVerificationStatus(pool, logger) {
  try {
    console.log('🔄 Fixing verification_status for verified workers...');

    // Update verification_status to 'verified' for all workers who have email_verified = true
    const result = await pool.query(`
      UPDATE workers
      SET verification_status = 'verified'
      WHERE email_verified = true
        AND (verification_status IS NULL OR verification_status != 'verified')
    `);

    console.log(`✅ Fixed verification_status for ${result.rowCount} workers`);
  } catch (error) {
    console.log('⚠️  Migration skipped or already applied:', error.message);
  }
}

module.exports = { fixVerificationStatus };
