// Quick migration script to create missing tables
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Connected to database, running migration...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS worker_contact_messages (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        admin_response TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP
      );
    `);
    console.log('✓ worker_contact_messages table created');

    await client.query(`
      CREATE TABLE IF NOT EXISTS feature_suggestions (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        category VARCHAR(100),
        suggestion TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP
      );
    `);
    console.log('✓ feature_suggestions table created');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_worker_contact_messages_worker_id ON worker_contact_messages(worker_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_worker_contact_messages_status ON worker_contact_messages(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_suggestions_worker_id ON feature_suggestions(worker_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_suggestions_status ON feature_suggestions(status)`);
    console.log('✓ Indexes created');

    await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service VARCHAR(255)`);
    console.log('✓ Service column added to bookings');

    await client.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS cloudinary_id_document_id VARCHAR(500)`);
    console.log('✓ cloudinary_id_document_id column added to workers');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
