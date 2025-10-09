// update_password.js
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// ✅ Use the same database credentials as simple-server.js
const pool = new Pool({
  user: 'fixxa_user',
  host: 'localhost',
  database: 'fixxa_messages',
  password: 'Maktentankee7!',
  port: 5432,
});

async function updatePassword() {
  try {
    const newPassword = '12345678';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update Siya’s password if Siya already exists
    const result = await pool.query(
      "UPDATE workers SET password = $1 WHERE name = $2",
      [hashedPassword, 'Siya']
    );

    if (result.rowCount === 0) {
      console.log("⚠️ No worker named 'Siya' found in the database.");
    } else {
      console.log("✅ Password updated successfully for Siya");
    }

  } catch (err) {
    console.error("❌ Error updating Siya’s password:", err);
  } finally {
    pool.end();
  }
}

updatePassword();
