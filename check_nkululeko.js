require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
});

async function checkNkululeko() {
  try {
    console.log('\n=== CHECKING NKULULEKO ===\n');

    const result = await pool.query(`
      SELECT id, name, is_verified, approval_status, email_verified
      FROM workers
      WHERE name ILIKE '%nkululeko%'
      ORDER BY id
    `);

    console.log('CURRENT STATUS:');
    result.rows.forEach(worker => {
      console.log(`\n${worker.name} (ID: ${worker.id})`);
      console.log(`  Is Verified: ${worker.is_verified}`);
      console.log(`  Approval Status: ${worker.approval_status}`);
      console.log(`  Email Verified: ${worker.email_verified}`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkNkululeko();
