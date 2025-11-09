const { Pool } = require('pg');

// Use DATABASE_URL from environment (Railway will inject it)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkEmailStatus() {
  try {
    console.log('Checking email verification status for all workers...\n');

    const result = await pool.query(`
      SELECT
        id,
        name,
        email,
        email_verified,
        verification_status,
        is_active,
        approval_status,
        created_at
      FROM workers
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`Found ${result.rows.length} workers:\n`);
    console.log('='.repeat(80));

    result.rows.forEach(worker => {
      const emailStatus = worker.email_verified ? '✅ VERIFIED' : '❌ NOT VERIFIED';
      console.log(`\n${emailStatus} | ID: ${worker.id} | ${worker.name}`);
      console.log(`  Email: ${worker.email}`);
      console.log(`  email_verified: ${worker.email_verified}`);
      console.log(`  verification_status: ${worker.verification_status}`);
      console.log(`  is_active: ${worker.is_active}`);
      console.log(`  approval_status: ${worker.approval_status}`);
      console.log(`  Created: ${worker.created_at}`);
    });

    const summary = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified,
        COUNT(CASE WHEN email_verified = false OR email_verified IS NULL THEN 1 END) as not_verified
      FROM workers
    `);

    console.log('\n' + '='.repeat(80));
    console.log('\n=== SUMMARY ===');
    console.log(`Total workers: ${summary.rows[0].total}`);
    console.log(`Email verified: ${summary.rows[0].verified}`);
    console.log(`Email NOT verified: ${summary.rows[0].not_verified}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkEmailStatus();
