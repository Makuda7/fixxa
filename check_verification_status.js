const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkWorkers() {
  try {
    console.log('Checking worker verification status...\n');

    const result = await pool.query(`
      SELECT id, name, email, is_active, approval_status,
             verification_status, email_verified
      FROM workers
      ORDER BY id
      LIMIT 15
    `);

    console.log('Workers Status:');
    console.log('=====================================');
    result.rows.forEach(worker => {
      const isEmailVerified = worker.email_verified || worker.verification_status === 'verified';
      const isLiveToClients = worker.is_active &&
                               (worker.approval_status === 'approved' || worker.approval_status === 'pending') &&
                               isEmailVerified;

      console.log(`\nID: ${worker.id} | ${worker.name}`);
      console.log(`  Email: ${worker.email}`);
      console.log(`  is_active: ${worker.is_active}`);
      console.log(`  approval_status: ${worker.approval_status}`);
      console.log(`  verification_status: ${worker.verification_status}`);
      console.log(`  email_verified: ${worker.email_verified}`);
      console.log(`  → isEmailVerified: ${isEmailVerified}`);
      console.log(`  → isLiveToClients: ${isLiveToClients}`);
      console.log(`  → SHOULD SHOW: ${isLiveToClients ? 'NO BADGE (not greyed)' : 'COMING SOON BADGE (greyed)'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkWorkers();
