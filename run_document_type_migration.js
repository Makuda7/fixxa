// Manual migration script to add document_type column
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔄 Adding document_type column to certifications table...');

    // Add column
    await pool.query(`
      ALTER TABLE certifications ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'certification';
    `);
    console.log('✓ Column added');

    // Update existing records to mark verification documents
    const updateResult = await pool.query(`
      UPDATE certifications
      SET document_type = 'verification_document'
      WHERE document_type = 'certification'
        AND (LOWER(document_name) LIKE '%id%'
         OR LOWER(document_name) LIKE '%proof%'
         OR LOWER(document_name) LIKE '%residence%'
         OR LOWER(document_name) LIKE '%address%'
         OR LOWER(document_name) LIKE '%passport%'
         OR LOWER(document_name) LIKE '%identity%'
         OR LOWER(document_name) LIKE '%verification%');
    `);
    console.log(`✓ Updated ${updateResult.rowCount} verification documents`);

    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_certifications_document_type ON certifications(document_type);
    `);
    console.log('✓ Index created');

    // Show results for worker 4
    const worker4Certs = await pool.query(`
      SELECT id, document_name, document_type, status FROM certifications WHERE worker_id = 4;
    `);
    console.log('\nWorker 4 certifications:');
    console.table(worker4Certs.rows);

    console.log('\n✅ Migration completed successfully!');
    await pool.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
