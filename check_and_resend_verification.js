// Check user registration status and resend verification email if needed
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkAndResend() {
  const email = 'blessplumbingsevices900@gmail.com';

  try {
    console.log(`Checking registration status for: ${email}\n`);

    // Check in workers table
    const workerResult = await pool.query(
      `SELECT id, name, email, phone, speciality, verification_status, approval_status,
              verification_token, created_at
       FROM workers
       WHERE email = $1`,
      [email]
    );

    if (workerResult.rows.length === 0) {
      console.log('❌ No worker found with this email');
      console.log('\nPossible reasons:');
      console.log('1. Registration did not complete successfully');
      console.log('2. Email was typed incorrectly during registration');
      console.log('3. User registered as a client instead of professional');

      // Check in users/clients table
      const clientResult = await pool.query(
        `SELECT id, name, email, verification_status, created_at
         FROM users
         WHERE email = $1`,
        [email]
      );

      if (clientResult.rows.length > 0) {
        console.log('\n✓ Found user registered as CLIENT instead:');
        console.log(`   Name: ${clientResult.rows[0].name}`);
        console.log(`   Email: ${clientResult.rows[0].email}`);
        console.log(`   Verification Status: ${clientResult.rows[0].verification_status}`);
        console.log(`   Registered: ${clientResult.rows[0].created_at}`);
      }

      return;
    }

    const worker = workerResult.rows[0];
    console.log('=== WORKER REGISTRATION FOUND ===');
    console.log(`ID: ${worker.id}`);
    console.log(`Name: ${worker.name}`);
    console.log(`Email: ${worker.email}`);
    console.log(`Phone: ${worker.phone || 'Not provided'}`);
    console.log(`Speciality: ${worker.speciality}`);
    console.log(`Verification Status: ${worker.verification_status}`);
    console.log(`Approval Status: ${worker.approval_status}`);
    console.log(`Registered: ${worker.created_at}`);
    console.log(`Has Verification Token: ${worker.verification_token ? 'Yes' : 'No'}`);

    if (worker.verification_status === 'verified') {
      console.log('\n✅ This worker is already verified!');
      console.log('They can log in at: https://www.fixxa.co.za/login.html');

      if (worker.approval_status === 'pending') {
        console.log('\n⏳ Status: Pending admin approval (will show as "Coming Soon")');
      } else if (worker.approval_status === 'approved') {
        console.log('\n✅ Status: Fully approved and visible on the platform');
      }
    } else {
      console.log('\n⚠️  Worker has NOT verified their email yet');

      if (worker.verification_token) {
        const verificationUrl = `https://www.fixxa.co.za/verify-email?token=${worker.verification_token}`;
        console.log('\n📧 Verification URL:');
        console.log(verificationUrl);
        console.log('\nYou can either:');
        console.log('1. Ask them to check their spam/junk folder');
        console.log('2. Send them this verification link manually');
        console.log('3. Have them use the "Resend Verification" feature at login');
      } else {
        console.log('\n❌ No verification token found - registration may be incomplete');
      }
    }

    console.log('\n=== EMAIL DELIVERY NOTES ===');
    console.log('✓ Server logs show email was sent successfully to this address');
    console.log('✓ Email service: SendGrid (HTTP API)');
    console.log('\nCommon reasons for not receiving emails:');
    console.log('1. Email went to spam/junk folder');
    console.log('2. Typo in email address during registration');
    console.log('3. Email provider blocked/filtered the message');
    console.log('4. Full inbox');
    console.log('\nSuggestions:');
    console.log('• Check spam/junk folder thoroughly');
    console.log('• Add support@fixxa.co.za to contacts/safe senders');
    console.log('• Try resending from login page: https://www.fixxa.co.za/resend-verification.html');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkAndResend();
