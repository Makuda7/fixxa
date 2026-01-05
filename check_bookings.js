const { pool } = require('./config/database');

async function checkBookings() {
  try {
    // Check if Waddi has any bookings
    const waddiBookings = await pool.query(`
      SELECT b.id, b.worker_id, b.user_id, b.service, b.booking_date, b.booking_time, b.status, u.name as client_name
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.worker_id = 4
      ORDER BY b.booking_date DESC
      LIMIT 10
    `);

    console.log('\n=== Waddi Bushe (worker_id=4) Bookings ===\n');
    if (waddiBookings.rows.length > 0) {
      waddiBookings.rows.forEach(booking => {
        console.log(`Booking ID: ${booking.id}`);
        console.log(`Client: ${booking.client_name}`);
        console.log(`Service: ${booking.service}`);
        console.log(`Date: ${booking.booking_date}`);
        console.log(`Time: ${booking.booking_time}`);
        console.log(`Status: ${booking.status}`);
        console.log('---');
      });
    } else {
      console.log('No bookings found for worker_id = 4');
    }

    // Check total bookings in system
    const totalBookings = await pool.query(`SELECT COUNT(*) as count FROM bookings`);
    console.log(`\nTotal bookings in system: ${totalBookings.rows[0].count}`);

    // Check if there are any bookings at all
    if (parseInt(totalBookings.rows[0].count) > 0) {
      const allBookings = await pool.query(`
        SELECT worker_id, COUNT(*) as count
        FROM bookings
        GROUP BY worker_id
        ORDER BY count DESC
      `);
      console.log('\nBookings per worker:');
      allBookings.rows.forEach(row => {
        console.log(`Worker ${row.worker_id}: ${row.count} bookings`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkBookings();
