async function runQuoteRequestIdMigration(pool, logger) {
  try {
    console.log('Running quote_request_id migration for quotes table...');

    // Add quote_request_id column (nullable, can be NULL for booking-based quotes)
    await pool.query(`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS quote_request_id INTEGER REFERENCES quote_requests(id) ON DELETE CASCADE
    `);

    // Make booking_id nullable (since quotes can be for requests OR bookings)
    await pool.query(`
      ALTER TABLE quotes
      ALTER COLUMN booking_id DROP NOT NULL
    `);

    // Drop the unique constraint since we now have two types of quotes
    await pool.query(`
      ALTER TABLE quotes
      DROP CONSTRAINT IF EXISTS unique_active_quote
    `);

    // Add check constraint to ensure quote has either booking_id OR quote_request_id
    await pool.query(`
      ALTER TABLE quotes
      ADD CONSTRAINT quote_source_check
      CHECK (
        (booking_id IS NOT NULL AND quote_request_id IS NULL) OR
        (booking_id IS NULL AND quote_request_id IS NOT NULL)
      )
    `);

    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quotes_quote_request_id
      ON quotes(quote_request_id)
    `);

    console.log('✅ quote_request_id migration completed');
  } catch (error) {
    console.error('❌ quote_request_id migration failed:', error.message);
    throw error;
  }
}

module.exports = { runQuoteRequestIdMigration };
