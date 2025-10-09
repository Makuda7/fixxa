const { Pool } = require('pg');
const { retryDatabaseOperation } = require('../utils/retry');

// Support both Railway's DATABASE_URL and individual environment variables
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return error after 10 seconds if can't get connection
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      // Connection pool settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return error after 10 seconds if can't get connection
    };

const pool = new Pool(poolConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  // Don't exit the process, let retry logic handle it
});

async function testConnection(logger) {
  try {
    await retryDatabaseOperation(
      () => pool.query('SELECT NOW()'),
      logger,
      'initial_connection_test'
    );
    console.log('Database connected');
  } catch (err) {
    logger.error('Database connection failed after retries', { error: err.message, stack: err.stack });
    console.error('Database connection failed:', err.message);
    throw err; // Fail startup if database unavailable
  }
}

module.exports = { pool, testConnection };