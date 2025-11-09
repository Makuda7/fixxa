require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkWorkers() {
  try {
    const result = await pool.query(`
      SELECT id, name, rating, is_verified, approval_status, email_verified
      FROM workers
      WHERE name ILIKE '%nkululeko%' OR name ILIKE '%waddi%'
      ORDER BY id
    `);

    console.log('\n=== WORKER DATA ===');
    result.rows.forEach(worker => {
      console.log(`\nID: ${worker.id}`);
      console.log(`Name: ${worker.name}`);
      console.log(`Rating: ${worker.rating}`);
      console.log(`Is Verified: ${worker.is_verified}`);
      console.log(`Approval Status: ${worker.approval_status}`);
      console.log(`Email Verified: ${worker.email_verified}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkWorkers();
