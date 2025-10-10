require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('Running migration to make area column nullable...');

    const result = await pool.query('ALTER TABLE workers ALTER COLUMN area DROP NOT NULL;');

    console.log('Migration successful!');
    console.log(result);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
