const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkCertifications() {
  try {
    console.log('Checking recent certifications...\n');

    // Check recent certifications
    const result = await pool.query(`
      SELECT
        c.id,
        c.worker_id,
        w.name,
        w.email,
        c.document_name,
        c.status,
        c.uploaded_at,
        c.document_url,
        c.cloudinary_id
      FROM certifications c
      JOIN workers w ON c.worker_id = w.id
      ORDER BY c.uploaded_at DESC
      LIMIT 15
    `);

    console.log(`Total certifications found: ${result.rows.length}\n`);
    console.log('=== RECENT CERTIFICATIONS ===\n');

    result.rows.forEach(cert => {
      console.log(`ID: ${cert.id} | ${cert.name} (Worker ID: ${cert.worker_id})`);
      console.log(`  Email: ${cert.email}`);
      console.log(`  Document: ${cert.document_name}`);
      console.log(`  Status: ${cert.status}`);
      console.log(`  Uploaded: ${cert.uploaded_at}`);
      console.log(`  URL: ${cert.document_url}`);
      console.log(`  Cloudinary ID: ${cert.cloudinary_id}`);
      console.log('');
    });

    // Check for pending certifications
    const pendingResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM certifications
      WHERE status = 'pending'
    `);

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total certifications: ${result.rows.length}`);
    console.log(`Pending certifications: ${pendingResult.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCertifications();
