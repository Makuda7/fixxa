require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function runMigration(filename) {
  try {
    console.log(`\n🔄 Running migration: ${filename}`);
    
    const migrationPath = path.join(__dirname, 'migrations', filename);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    console.log(`✅ Migration ${filename} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Migration ${filename} failed:`, error.message);
    throw error;
  }
}

async function migrate() {
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Get list of executed migrations
    const result = await pool.query('SELECT name FROM migrations');
    const executedMigrations = result.rows.map(row => row.name);
    
    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrations.includes(file)) {
        await runMigration(file);
        
        // Record migration as executed
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
      } else {
        console.log(`⏭️  Skipping ${file} (already executed)`);
      }
    }
    
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();