async function runFixQuoteSourceCheckMigration(pool, logger) {
  try {
    console.log('Running fix quote_source_check migration...');

    // Drop the old constraint that only allowed one source
    await pool.query(`
      ALTER TABLE quotes
      DROP CONSTRAINT IF EXISTS quote_source_check
    `);

    // Add new constraint that requires at least one source (booking_id OR quote_request_id)
    // but allows both (for when a quote request leads to an accepted quote with booking)
    await pool.query(`
      ALTER TABLE quotes
      ADD CONSTRAINT quote_source_check
      CHECK (
        booking_id IS NOT NULL OR quote_request_id IS NOT NULL
      )
    `);

    console.log('✅ quote_source_check constraint updated to allow both booking_id and quote_request_id');
  } catch (error) {
    console.error('❌ fix quote_source_check migration failed:', error.message);
    throw error;
  }
}

module.exports = { runFixQuoteSourceCheckMigration };
