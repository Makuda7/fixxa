// Fix Waddi's certification status - reject incorrectly approved certifications
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixWaddiCert() {
  try {
    console.log('Finding and fixing Waddi\'s certification status...\n');

    // Find Waddi in workers table
    const workerResult = await pool.query(
      `SELECT id, name, email, speciality
       FROM workers
       WHERE name ILIKE '%waddi%'`
    );

    if (workerResult.rows.length === 0) {
      console.log('❌ No worker found with name containing "waddi"');
      return;
    }

    const worker = workerResult.rows[0];
    console.log(`Found worker: ${worker.name} (ID: ${worker.id})`);

    // Find all approved certifications for this worker
    const certResult = await pool.query(
      `SELECT id, document_name, status, uploaded_at
       FROM certifications
       WHERE worker_id = $1 AND status = 'approved'
       ORDER BY uploaded_at DESC`,
      [worker.id]
    );

    if (certResult.rows.length === 0) {
      console.log('✓ No approved certifications found - nothing to fix');
      return;
    }

    console.log(`\nFound ${certResult.rows.length} approved certification(s):`);
    certResult.rows.forEach(cert => {
      console.log(`  - Cert ID ${cert.id}: ${cert.document_name}`);
    });

    // Reject all approved certifications (these should be required docs, not professional certs)
    const updateResult = await pool.query(
      `UPDATE certifications
       SET status = 'rejected',
           reviewed_at = NOW(),
           reviewed_by_email = 'system-fix'
       WHERE worker_id = $1 AND status = 'approved'
       RETURNING id, document_name`,
      [worker.id]
    );

    console.log(`\n✅ Rejected ${updateResult.rows.length} certification(s):`);
    updateResult.rows.forEach(cert => {
      console.log(`  - Cert ID ${cert.id}: ${cert.document_name}`);
    });

    console.log('\n📝 Note: Admin should now approve this worker through the proper Worker Approval flow');
    console.log('   This will set approval_status = "approved" and is_verified = true');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

fixWaddiCert();
