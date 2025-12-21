async function runAvailableDatesM

igration(pool, logger) {
  try {
    console.log('Running available_dates migration for quotes table...');

    // Add available_dates column to quotes table (JSON array of date strings)
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS available_dates JSONB DEFAULT '[]'::jsonb
    `);

    console.log('✅ available_dates column added to quotes table');
  } catch (error) {
    console.error('❌ available_dates migration failed:', error.message);
    throw error;
  }
}

module.exports = { runAvailableDatesMigration };
