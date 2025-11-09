const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkClementUploads() {
  try {
    console.log('Searching for Clement in workers table...\n');

    // Find Clement
    const workerResult = await pool.query(`
      SELECT id, name, email, speciality, created_at
      FROM workers
      WHERE name ILIKE '%clement%'
      ORDER BY id
    `);

    if (workerResult.rows.length === 0) {
      console.log('❌ No worker named Clement found');
      return;
    }

    console.log(`Found ${workerResult.rows.length} worker(s) matching "Clement":\n`);

    for (const worker of workerResult.rows) {
      console.log('='.repeat(80));
      console.log(`👤 Worker: ${worker.name} (ID: ${worker.id})`);
      console.log(`   Email: ${worker.email}`);
      console.log(`   Specialty: ${worker.speciality}`);
      console.log(`   Registered: ${worker.created_at}`);
      console.log('');

      // Check for certifications
      const certResult = await pool.query(`
        SELECT
          id,
          document_name,
          file_type,
          status,
          uploaded_at,
          cloudinary_id,
          document_url
        FROM certifications
        WHERE worker_id = $1
        ORDER BY uploaded_at DESC
      `, [worker.id]);

      if (certResult.rows.length === 0) {
        console.log('   📄 Certifications: NONE FOUND ❌');
        console.log('   ⚠️  This worker has NO documents in the database!');
      } else {
        console.log(`   📄 Certifications: ${certResult.rows.length} found\n`);
        certResult.rows.forEach((cert, index) => {
          console.log(`   ${index + 1}. ${cert.document_name}`);
          console.log(`      Status: ${cert.status}`);
          console.log(`      Type: ${cert.file_type}`);
          console.log(`      Uploaded: ${cert.uploaded_at}`);
          console.log(`      Cloudinary ID: ${cert.cloudinary_id}`);
          console.log(`      URL: ${cert.document_url}`);
          console.log('');
        });
      }
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkClementUploads();
