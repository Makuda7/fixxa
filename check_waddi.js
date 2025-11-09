// Check Waddi's worker and certification status
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkWaddi() {
  try {
    console.log('Checking Waddi\'s status...\n');

    // Find Waddi in workers table
    const workerResult = await pool.query(
      `SELECT id, name, email, speciality, is_verified, approval_status, is_active
       FROM workers
       WHERE name ILIKE '%waddi%'`
    );

    if (workerResult.rows.length === 0) {
      console.log('❌ No worker found with name containing "waddi"');
      return;
    }

    console.log('=== WORKER INFO ===');
    workerResult.rows.forEach(worker => {
      console.log(`ID: ${worker.id}`);
      console.log(`Name: ${worker.name}`);
      console.log(`Email: ${worker.email}`);
      console.log(`Speciality: ${worker.speciality}`);
      console.log(`Is Verified: ${worker.is_verified}`);
      console.log(`Approval Status: ${worker.approval_status}`);
      console.log(`Is Active: ${worker.is_active}`);
      console.log('---');
    });

    // Check certifications for this worker
    const workerId = workerResult.rows[0].id;
    const certResult = await pool.query(
      `SELECT id, document_name, status, uploaded_at, reviewed_at, reviewed_by_email
       FROM certifications
       WHERE worker_id = $1
       ORDER BY uploaded_at DESC`,
      [workerId]
    );

    console.log('\n=== CERTIFICATIONS ===');
    if (certResult.rows.length === 0) {
      console.log('❌ No certifications found for this worker');
    } else {
      certResult.rows.forEach(cert => {
        console.log(`Cert ID: ${cert.id}`);
        console.log(`Document: ${cert.document_name}`);
        console.log(`Status: ${cert.status}`);
        console.log(`Uploaded: ${cert.uploaded_at}`);
        console.log(`Reviewed: ${cert.reviewed_at || 'Not reviewed'}`);
        console.log(`Reviewed By: ${cert.reviewed_by_email || 'N/A'}`);
        console.log('---');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkWaddi();
