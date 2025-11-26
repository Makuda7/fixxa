async function addRegistrationCompleteColumn(pool, logger) {
  try {
    console.log('🔄 Adding registration_complete column to workers table...');

    // Add registration_complete column
    await pool.query(`
      ALTER TABLE workers
      ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT FALSE
    `);

    console.log('✅ Added registration_complete column to workers table');

  } catch (error) {
    console.log('⚠️  Migration skipped or already applied:', error.message);
  }
}

module.exports = { addRegistrationCompleteColumn };
