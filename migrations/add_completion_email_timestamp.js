// Add last_completion_email_sent timestamp to workers table
const { Pool } = require('pg');

async function addCompletionEmailTimestamp(pool, logger) {
  try {
    console.log('🔄 Adding last_completion_email_sent column to workers table...');

    // Add the timestamp column
    await pool.query(`
      ALTER TABLE workers
      ADD COLUMN IF NOT EXISTS last_completion_email_sent TIMESTAMP DEFAULT NULL
    `);

    console.log('✅ Added last_completion_email_sent column to workers table');
  } catch (error) {
    console.log('⚠️  Migration skipped or already applied:', error.message);
  }
}

module.exports = { addCompletionEmailTimestamp };
