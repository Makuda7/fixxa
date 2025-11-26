// Create session table for connect-pg-simple
const { pool } = require('./config/database');

async function createSessionTable() {
  try {
    console.log('Creating session table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );
    `);

    await pool.query(`
      ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
    `);

    await pool.query(`
      ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    console.log('✅ Session table created successfully!');
    console.log('The session errors should now be fixed.');

  } catch (err) {
    console.error('Error creating session table:', err.message);
  } finally {
    await pool.end();
  }
}

createSessionTable();
