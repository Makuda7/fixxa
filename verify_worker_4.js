require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyWorker4() {
  try {
    console.log('Setting worker ID 4 as verified...');

    const result = await pool.query(
      'UPDATE workers SET is_verified = true WHERE id = 4 RETURNING id, name, is_verified'
    );

    if (result.rows.length > 0) {
      console.log('✅ SUCCESS!');
      console.log(`Worker: ${result.rows[0].name}`);
      console.log(`ID: ${result.rows[0].id}`);
      console.log(`Is Verified: ${result.rows[0].is_verified}`);
    } else {
      console.log('❌ Worker ID 4 not found');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyWorker4();
