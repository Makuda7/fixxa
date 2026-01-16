/**
 * Cleanup Test Data Script for Waddi Bushe
 *
 * This script removes all test data (bookings, messages, reviews) for a specific user
 * while keeping the user account intact.
 *
 * Run with: node cleanup-test-data.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function cleanupTestData() {
  const client = await pool.connect();

  try {
    console.log('🔍 Finding user "Waddi Bushe"...\n');

    // Find the user (Waddi Bushe)
    const userResult = await client.query(
      "SELECT id, name, email FROM users WHERE LOWER(name) LIKE '%waddi%' OR LOWER(name) LIKE '%bushe%'"
    );

    if (userResult.rows.length === 0) {
      console.log('❌ No user found with name containing "Waddi" or "Bushe"');
      return;
    }

    console.log('📋 Found users:');
    userResult.rows.forEach(user => {
      console.log(`   - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
    });

    const userId = userResult.rows[0].id;
    const userName = userResult.rows[0].name;
    console.log(`\n🎯 Cleaning up test data for: ${userName} (ID: ${userId})\n`);

    // Start transaction
    await client.query('BEGIN');

    // 1. Delete reviews written by this user (client_id is the reviewer)
    console.log('🗑️  Deleting reviews...');
    const reviewsResult = await client.query(
      'DELETE FROM reviews WHERE client_id = $1 RETURNING id',
      [userId]
    );
    console.log(`   ✅ Deleted ${reviewsResult.rowCount} reviews`);

    // 2. Delete messages where this user is involved
    console.log('🗑️  Deleting messages...');
    const messagesResult = await client.query(
      'DELETE FROM messages WHERE client_id = $1 RETURNING id',
      [userId]
    );
    console.log(`   ✅ Deleted ${messagesResult.rowCount} messages`);

    // 3. Delete notifications for this user
    console.log('🗑️  Deleting notifications...');
    const notificationsResult = await client.query(
      'DELETE FROM notifications WHERE user_id = $1 RETURNING id',
      [userId]
    );
    console.log(`   ✅ Deleted ${notificationsResult.rowCount} notifications`);

    // 4. Delete bookings made by this user (user_id is the client who booked)
    console.log('🗑️  Deleting bookings...');
    const bookingsResult = await client.query(
      'DELETE FROM bookings WHERE user_id = $1 RETURNING id',
      [userId]
    );
    console.log(`   ✅ Deleted ${bookingsResult.rowCount} bookings`);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n' + '═'.repeat(50));
    console.log('✅ CLEANUP COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`   • Reviews deleted:       ${reviewsResult.rowCount}`);
    console.log(`   • Messages deleted:      ${messagesResult.rowCount}`);
    console.log(`   • Notifications deleted: ${notificationsResult.rowCount}`);
    console.log(`   • Bookings deleted:      ${bookingsResult.rowCount}`);
    console.log(`\n⚠️  User account "${userName}" was kept intact.`);
    console.log('   The user can still log in and use the platform.\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during cleanup:', error.message);
    console.error('   Transaction rolled back - no data was deleted.\n');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
cleanupTestData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
