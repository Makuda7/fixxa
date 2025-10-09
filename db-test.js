const sqlite3 = require('sqlite3').verbose();

// Open database (will create if not exists)
const db = new sqlite3.Database('./database/fixxa.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the Fixxa database.');
});

// Close database
db.close((err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Database connection closed.');
});
