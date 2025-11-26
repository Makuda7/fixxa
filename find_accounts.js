// Find all accounts with similar email patterns
const { pool } = require('./config/database');

async function findAccounts() {
  try {
    // Search for accounts with "makuda" in the email
    console.log('=== Searching for accounts with "makuda" in email ===\n');

    const workerResults = await pool.query(
      `SELECT id, name, email, email_verified, approval_status
       FROM workers
       WHERE email ILIKE '%makuda%'
       ORDER BY id`
    );

    if (workerResults.rows.length > 0) {
      console.log('Worker Accounts:');
      workerResults.rows.forEach(worker => {
        console.log(`  ID: ${worker.id}`);
        console.log(`  Name: ${worker.name}`);
        console.log(`  Email: ${worker.email}`);
        console.log(`  Verified: ${worker.email_verified}`);
        console.log(`  Approval: ${worker.approval_status}`);
        console.log('  ---');
      });
    } else {
      console.log('No worker accounts found with "makuda" in email\n');
    }

    const clientResults = await pool.query(
      `SELECT id, name, email, email_verified
       FROM users
       WHERE email ILIKE '%makuda%'
       ORDER BY id`
    );

    if (clientResults.rows.length > 0) {
      console.log('\nClient Accounts:');
      clientResults.rows.forEach(client => {
        console.log(`  ID: ${client.id}`);
        console.log(`  Name: ${client.name}`);
        console.log(`  Email: ${client.email}`);
        console.log(`  Verified: ${client.email_verified}`);
        console.log('  ---');
      });
    } else {
      console.log('No client accounts found with "makuda" in email\n');
    }

    // List all worker accounts
    console.log('\n=== All Worker Accounts ===\n');
    const allWorkers = await pool.query(
      `SELECT id, name, email, email_verified, approval_status
       FROM workers
       ORDER BY id
       LIMIT 20`
    );

    allWorkers.rows.forEach(worker => {
      console.log(`ID: ${worker.id} | ${worker.name} | ${worker.email} | Verified: ${worker.email_verified} | Approved: ${worker.approval_status}`);
    });

    console.log(`\nTotal workers: ${allWorkers.rows.length}`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

findAccounts();
