const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deleteBrokenCerts() {
  try {
    // Delete all certifications for worker_id 4
    const result = await pool.query(
      'DELETE FROM certifications WHERE worker_id = $1 RETURNING id, document_name',
      [4]
    );
    
    console.log('Deleted certifications:', result.rows);
    console.log(`Total deleted: ${result.rowCount}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

deleteBrokenCerts();
