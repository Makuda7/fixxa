const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkWorkers() {
  try {
    console.log('Checking Clement and Nkululeko certifications...\n');

    // Find workers
    const workers = await pool.query(`
      SELECT id, name, email, is_verified, id_verified, approval_status
      FROM workers
      WHERE name ILIKE '%clement%' OR name ILIKE '%nkululeko%'
    `);

    console.log('Workers found:');
    workers.rows.forEach(w => {
      console.log(`  ${w.name} (ID: ${w.id}) - ${w.email}`);
      console.log(`    Verified: ${w.is_verified}, ID Verified: ${w.id_verified}, Status: ${w.approval_status}\n`);
    });

    // Check their certifications
    for (const worker of workers.rows) {
      console.log(`\n=== Certifications for ${worker.name} (ID: ${worker.id}) ===`);

      const certs = await pool.query(`
        SELECT id, document_name, document_type, status, uploaded_at
        FROM certifications
        WHERE worker_id = $1
        ORDER BY uploaded_at DESC
      `, [worker.id]);

      if (certs.rows.length === 0) {
        console.log('  No certifications found');
      } else {
        certs.rows.forEach(cert => {
          console.log(`  - ${cert.document_name}`);
          console.log(`    Type: ${cert.document_type}, Status: ${cert.status}`);
          console.log(`    Uploaded: ${new Date(cert.uploaded_at).toLocaleDateString()}`);
        });
      }

      // Count approved professional certifications
      const approvedCount = await pool.query(`
        SELECT COUNT(*) as count
        FROM certifications
        WHERE worker_id = $1
          AND status = 'approved'
          AND document_type = 'certification'
      `, [worker.id]);

      console.log(`\n  APPROVED PROFESSIONAL CERTS: ${approvedCount.rows[0].count}`);
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

checkWorkers();
