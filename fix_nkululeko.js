require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
  ssl: process.env.DATABASE_URL ? undefined : { rejectUnauthorized: false }
});

async function fixNkululeko() {
  try {
    console.log('\n=== CHECKING NKULULEKO & WADDI ===\n');

    // Check current status
    const checkResult = await pool.query(`
      SELECT id, name, rating, is_verified, approval_status, email_verified
      FROM workers
      WHERE name ILIKE '%nkululeko%' OR name ILIKE '%waddi%'
      ORDER BY id
    `);

    console.log('BEFORE FIX:');
    checkResult.rows.forEach(worker => {
      console.log(`\n${worker.name} (ID: ${worker.id})`);
      console.log(`  Rating: ${worker.rating}`);
      console.log(`  Is Verified: ${worker.is_verified}`);
      console.log(`  Approval Status: ${worker.approval_status}`);
      console.log(`  Email Verified: ${worker.email_verified}`);
    });

    // Fix Nkululeko's is_verified if he's approved but not verified
    const fixxesApplied = [];

    for (const worker of checkResult.rows) {
      if (worker.approval_status === 'approved' && !worker.is_verified) {
        await pool.query(
          'UPDATE workers SET is_verified = true WHERE id = $1',
          [worker.id]
        );
        fixxesApplied.push(`Set is_verified = true for ${worker.name}`);
      }

      // Fix rating if it's "11" (should be 1.1) or any other malformed rating
      if (worker.rating) {
        const ratingStr = String(worker.rating);
        if (ratingStr === '11') {
          await pool.query(
            'UPDATE workers SET rating = 1.1 WHERE id = $1',
            [worker.id]
          );
          fixxesApplied.push(`Fixed rating for ${worker.name}: 11 -> 1.1`);
        }
      }
    }

    console.log('\n\n=== FIXES APPLIED ===');
    if (fixxesApplied.length === 0) {
      console.log('No fixes needed!');
    } else {
      fixxesApplied.forEach(fix => console.log(`✓ ${fix}`));
    }

    // Check again after fixes
    const afterResult = await pool.query(`
      SELECT id, name, rating, is_verified, approval_status, email_verified
      FROM workers
      WHERE name ILIKE '%nkululeko%' OR name ILIKE '%waddi%'
      ORDER BY id
    `);

    console.log('\n\nAFTER FIX:');
    afterResult.rows.forEach(worker => {
      console.log(`\n${worker.name} (ID: ${worker.id})`);
      console.log(`  Rating: ${worker.rating}`);
      console.log(`  Is Verified: ${worker.is_verified}`);
      console.log(`  Approval Status: ${worker.approval_status}`);
      console.log(`  Email Verified: ${worker.email_verified}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixNkululeko();
