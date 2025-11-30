// Migration to add document_type column to certifications table
async function addDocumentType(pool, logger) {
  try {
    console.log('🔄 Adding document_type column to certifications table...');

    // Step 1: Add the column
    await pool.query(`
      ALTER TABLE certifications
      ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'certification';
    `);
    console.log('  ✓ Added document_type column');

    // Step 2: Update existing records to mark verification documents
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
    console.log(`  ✓ Updated ${updateResult.rowCount} verification documents`);

    // Step 3: Create index for efficient filtering
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_certifications_document_type
      ON certifications(document_type);
    `);
    console.log('  ✓ Created index on document_type');

    console.log('✅ document_type column migration completed');
  } catch (error) {
    console.log('⚠️  Migration skipped or already applied:', error.message);
  }
}

module.exports = { addDocumentType };
