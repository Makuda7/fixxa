// Activate all pending workers so they show in Coming Soon listings
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function activatePendingWorkers() {
  try {
    console.log('Activating pending workers...\n');

    // Find pending workers with is_active = false
    const checkResult = await pool.query(
      `SELECT id, name, email, speciality, is_active, approval_status
       FROM workers
       WHERE approval_status = 'pending' AND is_active = false`
    );

    if (checkResult.rows.length === 0) {
      console.log('✓ No pending workers need activation');

      // Check if there are any pending workers at all
      const allPendingResult = await pool.query(
        `SELECT id, name, email, speciality, is_active, approval_status
         FROM workers
         WHERE approval_status = 'pending'`
      );

      if (allPendingResult.rows.length === 0) {
        console.log('❌ No pending workers found in database');
      } else {
        console.log(`\n✓ Found ${allPendingResult.rows.length} pending worker(s) that are already active:`);
        allPendingResult.rows.forEach(w => {
          console.log(`  - ${w.name} (${w.speciality}) - is_active: ${w.is_active}`);
        });
      }

      return;
    }

    console.log(`Found ${checkResult.rows.length} pending worker(s) to activate:`);
    checkResult.rows.forEach(worker => {
      console.log(`  - ${worker.name} (${worker.speciality})`);
    });

    // Activate them
    const updateResult = await pool.query(
      `UPDATE workers
       SET is_active = true
       WHERE approval_status = 'pending' AND is_active = false
       RETURNING id, name, speciality`
    );

    console.log(`\n✅ Activated ${updateResult.rows.length} worker(s):`);
    updateResult.rows.forEach(worker => {
      console.log(`  - ${worker.name} (${worker.speciality})`);
    });

    console.log('\n📝 These workers will now appear as "Coming Soon" on the services page');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

activatePendingWorkers();
