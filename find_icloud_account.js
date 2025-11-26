// Search for icloud.com accounts
const { pool } = require('./config/database');

async function findIcloudAccount() {
  try {
    console.log('=== Searching for @icloud.com accounts ===\n');

    // Search workers
    const workerResults = await pool.query(
      `SELECT id, name, email, email_verified, approval_status, is_active
       FROM workers
       WHERE email ILIKE '%icloud.com%'
       ORDER BY id`
    );

    if (workerResults.rows.length > 0) {
      console.log('Worker Accounts with @icloud.com:');
      workerResults.rows.forEach(worker => {
        console.log(`\n  ID: ${worker.id}`);
        console.log(`  Name: ${worker.name}`);
        console.log(`  Email: ${worker.email}`);
        console.log(`  Email Verified: ${worker.email_verified}`);
        console.log(`  Approval Status: ${worker.approval_status}`);
        console.log(`  Is Active: ${worker.is_active}`);
      });
    } else {
      console.log('No worker accounts found with @icloud.com\n');
    }

    // Search clients
    const clientResults = await pool.query(
      `SELECT id, name, email, email_verified
       FROM users
       WHERE email ILIKE '%icloud.com%'
       ORDER BY id`
    );

    if (clientResults.rows.length > 0) {
      console.log('\nClient Accounts with @icloud.com:');
      clientResults.rows.forEach(client => {
        console.log(`\n  ID: ${client.id}`);
        console.log(`  Name: ${client.name}`);
        console.log(`  Email: ${client.email}`);
        console.log(`  Email Verified: ${client.email_verified}`);
      });
    } else {
      console.log('\nNo client accounts found with @icloud.com\n');
    }

    // Also search for any makudab variations
    console.log('\n=== Searching for all "makudab" variations ===\n');

    const allMakudabWorkers = await pool.query(
      `SELECT id, name, email, email_verified, approval_status, is_active
       FROM workers
       WHERE email ILIKE '%makudab%'
       ORDER BY id`
    );

    if (allMakudabWorkers.rows.length > 0) {
      console.log('All Worker accounts with "makudab":');
      allMakudabWorkers.rows.forEach(worker => {
        console.log(`  ${worker.id} | ${worker.email} | ${worker.name} | Active: ${worker.is_active}`);
      });
    }

    const allMakudabClients = await pool.query(
      `SELECT id, name, email, email_verified
       FROM users
       WHERE email ILIKE '%makudab%'
       ORDER BY id`
    );

    if (allMakudabClients.rows.length > 0) {
      console.log('\nAll Client accounts with "makudab":');
      allMakudabClients.rows.forEach(client => {
        console.log(`  ${client.id} | ${client.email} | ${client.name}`);
      });
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

findIcloudAccount();
