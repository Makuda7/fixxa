// Check pending workers in the database
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkPendingWorkers() {
  try {
    console.log('Checking pending workers in database...\n');

    // Check workers table for pending workers
    const result = await pool.query(
      `SELECT id, name, email, speciality, approval_status, is_active, is_verified, created_at
       FROM workers
       WHERE approval_status = 'pending'
       ORDER BY created_at DESC`
    );

    console.log(`=== PENDING WORKERS (${result.rows.length} found) ===\n`);

    if (result.rows.length === 0) {
      console.log('❌ No pending workers found in database');
      console.log('\nPossible reasons:');
      console.log('1. Workers might not have approval_status = "pending"');
      console.log('2. Workers might have is_active = false');
      console.log('3. approval_status column might not exist');

      // Check what approval statuses exist
      const statusCheck = await pool.query(
        `SELECT approval_status, COUNT(*) as count
         FROM workers
         GROUP BY approval_status
         ORDER BY count DESC`
      );

      console.log('\n=== ALL APPROVAL STATUSES IN DATABASE ===');
      statusCheck.rows.forEach(row => {
        console.log(`${row.approval_status || 'NULL'}: ${row.count} workers`);
      });

      // Check recently created workers
      const recentWorkers = await pool.query(
        `SELECT id, name, email, speciality, approval_status, is_active, created_at
         FROM workers
         ORDER BY created_at DESC
         LIMIT 5`
      );

      console.log('\n=== MOST RECENT WORKERS ===');
      recentWorkers.rows.forEach(worker => {
        console.log(`ID: ${worker.id} | Name: ${worker.name} | Status: ${worker.approval_status} | Active: ${worker.is_active} | Created: ${worker.created_at}`);
      });

    } else {
      result.rows.forEach((worker, index) => {
        console.log(`${index + 1}. ${worker.name}`);
        console.log(`   ID: ${worker.id}`);
        console.log(`   Email: ${worker.email}`);
        console.log(`   Speciality: ${worker.speciality}`);
        console.log(`   Approval Status: ${worker.approval_status}`);
        console.log(`   Is Active: ${worker.is_active}`);
        console.log(`   Is Verified: ${worker.is_verified}`);
        console.log(`   Created: ${worker.created_at}`);
        console.log('');
      });

      // Now check what the search API would return
      console.log('=== SIMULATING SEARCH API QUERY ===');
      const searchResult = await pool.query(
        `SELECT id, name, speciality, approval_status, is_active
         FROM workers
         WHERE is_active = true AND approval_status IN ('approved', 'pending')
         ORDER BY approval_status, name`
      );

      console.log(`\nWorkers that SHOULD appear in search (${searchResult.rows.length} total):`);
      searchResult.rows.forEach(w => {
        console.log(`  - ${w.name} (${w.speciality}) [${w.approval_status}] Active: ${w.is_active}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkPendingWorkers();
