async function runQuoteRequestsMigration(pool, logger) {
  try {
    console.log('Running quote_requests migration...');

    // Create quote_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quote_requests (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        CONSTRAINT valid_status CHECK (status IN ('pending', 'quoted', 'declined', 'expired'))
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quote_requests_client
      ON quote_requests(client_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quote_requests_worker
      ON quote_requests(worker_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quote_requests_status
      ON quote_requests(status)
    `);

    console.log('✅ quote_requests migration completed');
  } catch (error) {
    console.error('❌ quote_requests migration failed:', error.message);
    throw error;
  }
}

module.exports = { runQuoteRequestsMigration };
