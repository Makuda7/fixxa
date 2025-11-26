// Create makudab@icloud.com worker account
const { pool } = require('./config/database');
const bcrypt = require('bcrypt');
const { SALT_ROUNDS } = require('./config/constants');

async function createWorkerAccount() {
  try {
    const email = 'makudab@icloud.com';
    const password = 'test123';

    // Check if account already exists
    const existing = await pool.query(
      'SELECT id FROM workers WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log('Account already exists! Updating it...');

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await pool.query(
        `UPDATE workers
         SET password = $1, email_verified = true, approval_status = 'approved', is_active = true
         WHERE email = $2`,
        [hashedPassword, email]
      );

      console.log('\n✅ Account updated successfully!');
    } else {
      console.log('Creating new worker account...');

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      await pool.query(
        `INSERT INTO workers
         (name, email, phone, area, primary_suburb, password, speciality, experience, is_active,
          email_verified, approval_status, terms_accepted, terms_accepted_at, terms_version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, 'approved', true, CURRENT_TIMESTAMP, '1.0')`,
        [
          'Makudab Worker',
          email,
          '0123456789',
          'Gauteng',
          'Sandton',
          hashedPassword,
          'plumbing',
          '5 years experience'
        ]
      );

      console.log('\n✅ New worker account created successfully!');
    }

    console.log('\n📋 Account Details:');
    console.log('  Email: makudab@icloud.com');
    console.log('  Password: test123');
    console.log('  Type: WORKER (Professional)');
    console.log('  Status: Verified & Approved');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

createWorkerAccount();
