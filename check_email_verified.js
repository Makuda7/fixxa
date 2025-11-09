const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkEmailVerified() {
  try {
    console.log('Checking email_verified status for all workers...\n');

    const result = await pool.query(`
      SELECT id, name, email, is_active, approval_status,
             email_verified, verification_status
      FROM workers
      ORDER BY id
    `);

    console.log('Total workers:', result.rows.length);
    console.log('\n=== WORKERS EMAIL VERIFICATION STATUS ===\n');

    result.rows.forEach(worker => {
      const status = worker.email_verified ? '✅ VERIFIED' : '❌ NOT VERIFIED';
      console.log(`${status} | ${worker.name} (${worker.email})`);
      console.log(`   is_active: ${worker.is_active}, approval_status: ${worker.approval_status}`);
      console.log('');
    });

    const verified = result.rows.filter(w => w.email_verified).length;
    const unverified = result.rows.filter(w => !w.email_verified).length;

    console.log('\n=== SUMMARY ===');
    console.log(`Verified: ${verified}`);
    console.log(`Not Verified: ${unverified}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmailVerified();
