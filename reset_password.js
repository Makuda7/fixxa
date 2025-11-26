// Reset password for testing
const { pool } = require('./config/database');
const bcrypt = require('bcrypt');
const { SALT_ROUNDS } = require('./config/constants');

async function resetPassword() {
  try {
    const email = 'kudadunbetter@gmail.com';
    const newPassword = 'test123'; // Simple test password

    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update worker password
    const result = await pool.query(
      'UPDATE workers SET password = $1 WHERE email = $2 RETURNING id, name, email',
      [hashedPassword, email]
    );

    if (result.rows.length > 0) {
      console.log('\n✓ Password reset successfully!');
      console.log('Email:', email);
      console.log('New Password: test123');
      console.log('\nYou can now log in with these credentials.');
    } else {
      console.log('\nNo worker account found with that email.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

resetPassword();
