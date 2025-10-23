// Run database schema sync to add missing columns
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runSync() {
  try {
    console.log('🔄 Reading sync_database_schema.sql...');
    const sqlPath = path.join(__dirname, 'sync_database_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Connecting to database...');
    const client = await pool.connect();

    console.log('🔄 Running database schema sync...\n');
    await client.query(sql);

    console.log('✅ Database schema sync completed successfully!');
    console.log('\nColumns added:');
    console.log('  ✓ workers: is_verified, verification_status, cloudinary_id, suburb, etc.');
    console.log('  ✓ users: cloudinary_id, suburb, updated_at, deleted_at');
    console.log('  ✓ portfolio_photos: cloudinary_id');
    console.log('  ✓ certifications: cloudinary_id, file_type');
    console.log('  ✓ Multiple indexes and constraints');

    client.release();
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    console.error('\nFull error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runSync();
