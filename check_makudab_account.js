// Check makudab@icloud.com account status
const { pool } = require('./config/database');
const bcrypt = require('bcrypt');
const { SALT_ROUNDS } = require('./config/constants');

async function checkAccount() {
  try {
    // Check worker account
    const workerResult = await pool.query(
      'SELECT id, name, email, email_verified, approval_status, password FROM workers WHERE email = $1',
      ['makudab@icloud.com']
    );

    if (workerResult.rows.length > 0) {
      const worker = workerResult.rows[0];
      console.log('\n=== Worker Account Found ===');
      console.log('ID:', worker.id);
      console.log('Name:', worker.name);
      console.log('Email:', worker.email);
      console.log('Email Verified:', worker.email_verified);
      console.log('Approval Status:', worker.approval_status);
      console.log('Has Password:', !!worker.password);

      // Fix account if needed
      let needsUpdate = false;
      const updates = [];

      if (!worker.email_verified) {
        console.log('\n⚠️  Email not verified - fixing...');
        needsUpdate = true;
        updates.push("email_verified = true");
      }

      if (worker.approval_status !== 'approved') {
        console.log('\n⚠️  Not approved - fixing...');
        needsUpdate = true;
        updates.push("approval_status = 'approved'");
      }

      if (needsUpdate) {
        await pool.query(
          `UPDATE workers SET ${updates.join(', ')} WHERE id = $1`,
          [worker.id]
        );
        console.log('✓ Account fixed!');
      }

      // Reset password to test123
      console.log('\nResetting password to: test123');
      const hashedPassword = await bcrypt.hash('test123', SALT_ROUNDS);
      await pool.query(
        'UPDATE workers SET password = $1 WHERE id = $2',
        [hashedPassword, worker.id]
      );
      console.log('✓ Password reset successfully!');

      console.log('\n✓ Account is ready for login:');
      console.log('  Email: makudab@icloud.com');
      console.log('  Password: test123');

    } else {
      console.log('\n⚠️  No worker account found with makudab@icloud.com');
    }

    // Check client account
    const clientResult = await pool.query(
      'SELECT id, name, email, email_verified FROM users WHERE email = $1',
      ['makudab@icloud.com']
    );

    if (clientResult.rows.length > 0) {
      const client = clientResult.rows[0];
      console.log('\n=== Client Account Found ===');
      console.log('ID:', client.id);
      console.log('Name:', client.name);
      console.log('Email:', client.email);
      console.log('Email Verified:', client.email_verified);

      if (!client.email_verified) {
        console.log('\n⚠️  Email not verified - fixing...');
        await pool.query(
          'UPDATE users SET email_verified = true WHERE id = $1',
          [client.id]
        );
        console.log('✓ Email verified!');
      }

      // Reset password to test123
      console.log('\nResetting password to: test123');
      const hashedPassword = await bcrypt.hash('test123', SALT_ROUNDS);
      await pool.query(
        'UPDATE users SET password = $1 WHERE id = $2',
        [hashedPassword, client.id]
      );
      console.log('✓ Password reset successfully!');

      console.log('\n✓ Account is ready for login:');
      console.log('  Email: makudab@icloud.com');
      console.log('  Password: test123');
    }

    if (workerResult.rows.length === 0 && clientResult.rows.length === 0) {
      console.log('\n❌ No account found with email: makudab@icloud.com');
      console.log('The account may have been deleted or never existed.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkAccount();
