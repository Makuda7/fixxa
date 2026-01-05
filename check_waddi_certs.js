const { pool } = require('./config/database');

async function checkWaddiCertifications() {
  try {
    const result = await pool.query(`
      SELECT
        w.id,
        w.name,
        w.is_verified,
        w.id_verified,
        w.approval_status,
        COUNT(c.id) as total_certs,
        COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as approved_certs,
        COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending_certs
      FROM workers w
      LEFT JOIN certifications c ON w.id = c.worker_id
      WHERE w.name ILIKE '%waddi%'
      GROUP BY w.id, w.name, w.is_verified, w.id_verified, w.approval_status
    `);

    console.log('\n=== Waddi Bushe Certification Status ===\n');
    if (result.rows.length > 0) {
      result.rows.forEach(row => {
        console.log(`Worker ID: ${row.id}`);
        console.log(`Name: ${row.name}`);
        console.log(`Is Verified: ${row.is_verified}`);
        console.log(`ID Verified: ${row.id_verified}`);
        console.log(`Approval Status: ${row.approval_status}`);
        console.log(`Total Certifications: ${row.total_certs}`);
        console.log(`Approved Certifications: ${row.approved_certs}`);
        console.log(`Pending Certifications: ${row.pending_certs}`);
        console.log('---');
      });
    } else {
      console.log('No worker found matching "waddi"');
    }

    // Also check certifications table directly
    const certsResult = await pool.query(`
      SELECT c.*, w.name as worker_name
      FROM certifications c
      JOIN workers w ON c.worker_id = w.id
      WHERE w.name ILIKE '%waddi%'
    `);

    console.log('\n=== All Certifications for Waddi ===\n');
    if (certsResult.rows.length > 0) {
      certsResult.rows.forEach(cert => {
        console.log(`Cert ID: ${cert.id}`);
        console.log(`Document Name: ${cert.document_name}`);
        console.log(`File Type: ${cert.file_type}`);
        console.log(`Status: ${cert.status}`);
        console.log(`Uploaded At: ${cert.uploaded_at}`);
        console.log('---');
      });
    } else {
      console.log('No certifications found for Waddi');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkWaddiCertifications();
