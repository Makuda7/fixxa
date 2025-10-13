// Quick migration script to add rate columns
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Adding rate columns to workers table...');
    
    await pool.query(`
      ALTER TABLE workers 
      ADD COLUMN IF NOT EXISTS rate_type VARCHAR(10),
      ADD COLUMN IF NOT EXISTS rate_amount DECIMAL(10,2)
    `);
    
    console.log('✓ Successfully added rate columns!');
    
    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workers' 
      AND column_name IN ('rate_type', 'rate_amount')
    `);
    
    console.log('Columns added:', result.rows);
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

migrate();
