require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
});

async function fixNkululeko() {
  try {
    console.log('\n=== CHECKING NKULULEKO STATUS ===\n');

    // Check current status
    const checkResult = await pool.query(`
      SELECT id, name, is_verified, approval_status
      FROM workers
      WHERE LOWER(name) LIKE '%nkululeko%'
      ORDER BY id
    `);

    if (checkResult.rows.length === 0) {
      console.log('❌ No worker found with name containing "nkululeko"');
      await pool.end();
      process.exit(1);
    }

    console.log('CURRENT STATUS:');
    checkResult.rows.forEach(worker => {
      console.log(`\n${worker.name} (ID: ${worker.id})`);
      console.log(`  Is Verified: ${worker.is_verified}`);
      console.log(`  Approval Status: ${worker.approval_status}`);
    });

    // Update is_verified to true for Nkululeko
    const workerId = checkResult.rows[0].id;
    console.log(`\n=== SETTING is_verified = true FOR ${checkResult.rows[0].name} (ID: ${workerId}) ===\n`);

    const updateResult = await pool.query(`
      UPDATE workers
      SET is_verified = true
      WHERE id = $1
      RETURNING id, name, is_verified, approval_status
    `, [workerId]);

    console.log('✅ UPDATE SUCCESSFUL!');
    console.log('\nNEW STATUS:');
    const updated = updateResult.rows[0];
    console.log(`${updated.name} (ID: ${updated.id})`);
    console.log(`  Is Verified: ${updated.is_verified}`);
    console.log(`  Approval Status: ${updated.approval_status}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixNkululeko();
