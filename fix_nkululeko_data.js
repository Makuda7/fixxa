require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
});

async function fixNkululeko() {
  try {
    console.log('\n=== CHECKING NKULULEKO ===\n');

    // Check current status
    const checkResult = await pool.query(`
      SELECT id, name, rating, is_verified, approval_status, email_verified
      FROM workers
      WHERE name ILIKE '%nkululeko%'
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

    // Fix each worker
    const fixes = [];
    for (const worker of checkResult.rows) {
      const workerFixes = [];

      // Fix is_verified if approved but not verified
      if (worker.approval_status === 'approved' && !worker.is_verified) {
        await pool.query(
          'UPDATE workers SET is_verified = true WHERE id = $1',
          [worker.id]
        );
        workerFixes.push('Set is_verified = true');
      }

      // Fix rating if it's malformed (e.g., "11" should be 1.1)
      if (worker.rating) {
        const ratingStr = String(worker.rating);
        if (ratingStr === '11') {
          await pool.query(
            'UPDATE workers SET rating = 1.1 WHERE id = $1',
            [worker.id]
          );
          workerFixes.push('Fixed rating: 11 → 1.1');
        }
      }

      if (workerFixes.length > 0) {
        fixes.push(`${worker.name}: ${workerFixes.join(', ')}`);
      }
    }

    console.log('\n\n=== FIXES APPLIED ===');
    if (fixes.length === 0) {
      console.log('No fixes needed!');
    } else {
      fixes.forEach(fix => console.log(`✓ ${fix}`));
    }

    // Check again after fixes
    const afterResult = await pool.query(`
      SELECT id, name, rating, is_verified, approval_status, email_verified
      FROM workers
      WHERE name ILIKE '%nkululeko%'
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

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

fixNkululeko();
