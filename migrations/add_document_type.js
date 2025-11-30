// Migration to add document_type column to certifications table
module.exports = {
  async addDocumentType(pool, logger) {
    try {
      logger.info('🔄 Adding document_type column to certifications table...');

      // Step 1: Add the column
      await pool.query(`
        ALTER TABLE certifications
        ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'certification';
      `);
      logger.info('  ✓ Added document_type column');

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
      logger.info(`  ✓ Updated ${updateResult.rowCount} verification documents`);

      // Step 3: Create index for efficient filtering
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_certifications_document_type
        ON certifications(document_type);
      `);
      logger.info('  ✓ Created index on document_type');

      logger.info('✅ document_type column migration completed');
    } catch (error) {
      logger.warn('⚠️  document_type migration skipped or already applied: ' + error.message);
    }
  }
};
