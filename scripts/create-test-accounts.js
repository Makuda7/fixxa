// Create Test Accounts for Beta Testing
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

const SALT_ROUNDS = 10;
const TEST_PASSWORD = 'Test123!';

const provinces = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape',
  'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape'
];

const specialities = [
  'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Gardener',
  'Cleaner', 'HVAC Technician', 'Handyman', 'Locksmith', 'Roofer'
];

const cities = {
  'Gauteng': ['Johannesburg', 'Pretoria', 'Sandton', 'Midrand', 'Centurion'],
  'Western Cape': ['Cape Town', 'Stellenbosch', 'Paarl', 'Somerset West', 'Bellville'],
  'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Richards Bay', 'Newcastle', 'Empangeni']
};

async function createTestAccounts() {
  try {
    console.log('🔄 Creating test accounts...\n');

    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS);

    // Create 10 test clients
    console.log('📝 Creating 10 test clients...');
    for (let i = 1; i <= 10; i++) {
      const province = provinces[i % provinces.length];
      const cityList = cities[province] || ['City ' + i];
      const city = cityList[0];
      const phoneNum = 7000000000 + i * 1000000 + Math.floor(Math.random() * 999999);

      try {
        await pool.query(
          `INSERT INTO users (name, email, password, phone, city, address, postal_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (email) DO NOTHING`,
          [
            `Test Client ${i}`,
            `client${i}@test.com`,
            hashedPassword,
            `+27${phoneNum}`,
            city,
            `${i * 10} Test Street, ${city}`,
            `${1000 + i * 100}`
          ]
        );
        console.log(`  ✅ Created: client${i}@test.com`);
      } catch (err) {
        console.log(`  ⚠️  Skipped: client${i}@test.com (already exists)`);
      }
    }

    // Create 10 test workers
    console.log('\n🔧 Creating 10 test workers...');
    for (let i = 1; i <= 10; i++) {
      const province = provinces[i % provinces.length];
      const cityList = cities[province] || ['City ' + i];
      const city = cityList[0];
      const speciality = specialities[i % specialities.length];
      const phoneNum = 8000000000 + i * 1000000 + Math.floor(Math.random() * 999999);

      try {
        await pool.query(
          `INSERT INTO workers (
            name, email, password, phone, city, address, postal_code,
            speciality, area, bio, experience, rating, is_available, is_active
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (email) DO NOTHING`,
          [
            `Test Worker ${i}`,
            `worker${i}@test.com`,
            hashedPassword,
            `+27${phoneNum}`,
            city,
            `${i * 20} Worker Avenue, ${city}`,
            `${2000 + i * 100}`,
            speciality,
            province,
            `Experienced ${speciality.toLowerCase()} with ${3 + i} years of expertise in the field.`,
            `${3 + i} years`,
            (4.0 + (Math.random() * 1.0)).toFixed(2),
            true,
            true
          ]
        );
        console.log(`  ✅ Created: worker${i}@test.com (${speciality} - ${province})`);
      } catch (err) {
        console.log(`  ⚠️  Skipped: worker${i}@test.com (already exists)`);
      }
    }

    // Create admin if not exists
    console.log('\n👑 Creating admin account...');
    try {
      await pool.query(
        `INSERT INTO admins (email, password, name)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO NOTHING`,
        ['admin@fixxa.com', hashedPassword, 'Admin User']
      );
      console.log('  ✅ Created: admin@fixxa.com');
    } catch (err) {
      console.log('  ⚠️  Skipped: admin@fixxa.com (already exists)');
    }

    console.log('\n✅ Test accounts created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 BETA TESTER CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🔑 All Passwords: Test123!\n');
    
    console.log('👤 CLIENTS (10):');
    for (let i = 1; i <= 10; i++) {
      console.log(`   client${i}@test.com`);
    }
    
    console.log('\n🔧 WORKERS (10):');
    for (let i = 1; i <= 10; i++) {
      const speciality = specialities[i % specialities.length];
      console.log(`   worker${i}@test.com (${speciality})`);
    }
    
    console.log('\n👑 ADMIN:');
    console.log('   admin@fixxa.com');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error creating test accounts:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestAccounts();
