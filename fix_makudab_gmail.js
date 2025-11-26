// Fix makudab@gmail.com account
const { pool } = require('./config/database');
const bcrypt = require('bcrypt');
const { SALT_ROUNDS } = require('./config/constants');

async function fixAccount() {
  try {
    const email = 'makudab@gmail.com';

    // Check and fix client account
    const result = await pool.query(
      'SELECT id, name, email, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      const client = result.rows[0];
      console.log('\n=== Client Account Found ===');
      console.log('ID:', client.id);
      console.log('Name:', client.name);
      console.log('Email:', client.email);
      console.log('Email Verified:', client.email_verified);

      // Ensure email is verified
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

      console.log('\n✅ Account is ready for login:');
      console.log('  Email: makudab@gmail.com');
      console.log('  Password: test123');
      console.log('  Account Type: CLIENT');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixAccount();
