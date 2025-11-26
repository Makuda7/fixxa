// Test login and check user status
const { pool } = require('./config/database');
const bcrypt = require('bcrypt');

async function testLogin() {
  try {
    // Check worker account
    const workerResult = await pool.query(
      'SELECT id, name, email, email_verified, approval_status FROM workers WHERE email = $1',
      ['kudadunbetter@gmail.com']
    );

    if (workerResult.rows.length > 0) {
      const worker = workerResult.rows[0];
      console.log('\n=== Worker Account ===');
      console.log('ID:', worker.id);
      console.log('Name:', worker.name);
      console.log('Email:', worker.email);
      console.log('Email Verified:', worker.email_verified);
      console.log('Approval Status:', worker.approval_status);

      // If not verified, verify it
      if (!worker.email_verified) {
        console.log('\nVerifying worker email...');
        await pool.query(
          'UPDATE workers SET email_verified = true WHERE id = $1',
          [worker.id]
        );
        console.log('✓ Worker email verified!');
      }
    } else {
      console.log('\nNo worker account found for kudadunbetter@gmail.com');
    }

    // Check client account
    const clientResult = await pool.query(
      'SELECT id, name, email, email_verified FROM users WHERE email = $1',
      ['kudadunbetter@gmail.com']
    );

    if (clientResult.rows.length > 0) {
      const client = clientResult.rows[0];
      console.log('\n=== Client Account ===');
      console.log('ID:', client.id);
      console.log('Name:', client.name);
      console.log('Email:', client.email);
      console.log('Email Verified:', client.email_verified);

      // If not verified, verify it
      if (!client.email_verified) {
        console.log('\nVerifying client email...');
        await pool.query(
          'UPDATE users SET email_verified = true WHERE id = $1',
          [client.id]
        );
        console.log('✓ Client email verified!');
      }
    } else {
      console.log('\nNo client account found for kudadunbetter@gmail.com');
    }

    console.log('\n✓ Done! You can now try logging in.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

testLogin();
