const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createQuoteRequestsTable() {
  try {
    console.log('Creating quote_requests table...');

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

    console.log('✓ quote_requests table created successfully');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quote_requests_client
      ON quote_requests(client_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quote_requests_worker
      ON quote_requests(worker_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_quote_requests_status
      ON quote_requests(status);
    `);

    console.log('✓ Indexes created successfully');

    await pool.end();
    console.log('\nDatabase migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating quote_requests table:', error);
    await pool.end();
    process.exit(1);
  }
}

createQuoteRequestsTable();
