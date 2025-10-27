const { pool } = require('../../config/database');
const fs = require('fs');
const path = require('path');

async function runSuburbsMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running suburbs system migration...');

    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '009_add_suburbs_system.sql'),
      'utf8'
    );

    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Suburbs system migration completed successfully');

    // Check results
    const suburbsCount = await client.query('SELECT COUNT(*) FROM suburbs');
    const workersWithSuburbs = await client.query(
      'SELECT COUNT(*) FROM workers WHERE primary_suburb IS NOT NULL'
    );

    console.log(`📊 Migration Stats:`);
    console.log(`   - Suburbs in system: ${suburbsCount.rows[0].count}`);
    console.log(`   - Workers with suburbs: ${workersWithSuburbs.rows[0].count}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Suburbs migration failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  runSuburbsMigration()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runSuburbsMigration };
