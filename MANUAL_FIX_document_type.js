/*
 * MANUAL FIX: Add document_type column to certifications table
 *
 * This script adds the document_type column directly to the production database.
 * Run this ONCE manually via: railway run node MANUAL_FIX_document_type.js
 */

require('dotenv').config();
const { Pool } = require('pg');

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixDatabase() {
  try {
    console.log('\n🔧 MANUAL FIX: Adding document_type column to certifications\n');

    // Step 1: Add the column
    console.log('Step 1: Adding document_type column...');
    await pool.query(`
      ALTER TABLE certifications
      ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'certification';
    `);
    console.log('✓ Column added (or already exists)\n');

    // Step 2: Check current data
    const beforeCount = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN document_type = 'certification' THEN 1 END) as certs,
        COUNT(CASE WHEN document_type = 'verification_document' THEN 1 END) as verif
      FROM certifications
    `);
    console.log('Current data:');
    console.log(`  Total: ${beforeCount.rows[0].total}`);
    console.log(`  Certifications: ${beforeCount.rows[0].certs}`);
    console.log(`  Verification docs: ${beforeCount.rows[0].verif}\n`);

    // Step 3: Update existing records to mark verification documents
    console.log('Step 2: Updating verification documents...');
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
    console.log(`✓ Updated ${updateResult.rowCount} records to verification_document\n`);

    // Step 4: Create index
    console.log('Step 3: Creating index...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_certifications_document_type
      ON certifications(document_type);
    `);
    console.log('✓ Index created (or already exists)\n');

    // Step 5: Show results for worker 4
    console.log('Step 4: Checking Worker ID 4 certifications...');
    const worker4 = await pool.query(`
      SELECT id, document_name, document_type, status
      FROM certifications
      WHERE worker_id = 4
      ORDER BY id;
    `);
    console.log('Worker 4 certifications:');
    worker4.rows.forEach(row => {
      console.log(`  - ID ${row.id}: ${row.document_name} (${row.document_type}) [${row.status}]`);
    });

    // Step 6: Show approved professional certs for worker 4
    const worker4Approved = await pool.query(`
      SELECT COUNT(*) as count
      FROM certifications
      WHERE worker_id = 4
        AND status = 'approved'
        AND document_type = 'certification';
    `);
    console.log(`\nWorker 4 has ${worker4Approved.rows[0].count} approved professional certifications`);
    console.log('(Should be 0 if they only have ID/proof of residence)\n');

    console.log('✅ MANUAL FIX COMPLETE!\n');
    console.log('Now refresh https://www.fixxa.co.za/profile?id=4 to see the changes.\n');

    await pool.end();
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

fixDatabase();
