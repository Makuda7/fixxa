// Test API connection and worker data
const axios = require('axios');

const API_BASE_URL = 'https://fixxa.co.za';

async function testAPIConnection() {
  console.log('🔍 Testing API connection to:', API_BASE_URL);
  console.log('');

  try {
    // Test 1: Basic connectivity
    console.log('Test 1: Basic connectivity...');
    const healthCheck = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is reachable');
    console.log('');

    // Test 2: Fetch workers without authentication
    console.log('Test 2: Fetching workers (no auth)...');
    const workersResponse = await axios.get(`${API_BASE_URL}/workers`, { timeout: 10000 });
    console.log('✅ Workers endpoint responded');
    console.log('Response status:', workersResponse.status);
    console.log('Response data keys:', Object.keys(workersResponse.data));

    if (workersResponse.data.workers) {
      const workers = workersResponse.data.workers;
      console.log('Total workers:', workers.length);

      const approved = workers.filter(w => w.approval_status === 'approved');
      console.log('Approved workers:', approved.length);

      const verified = workers.filter(w => w.is_verified === true);
      console.log('Verified workers:', verified.length);

      const approvedAndVerified = workers.filter(
        w => w.approval_status === 'approved' && w.is_verified === true
      );
      console.log('Approved AND verified workers:', approvedAndVerified.length);
      console.log('');

      if (approvedAndVerified.length > 0) {
        console.log('✅ Found workers that should appear in the app!');
        console.log('');
        console.log('Sample worker:');
        const sample = approvedAndVerified[0];
        console.log('  - ID:', sample.id);
        console.log('  - Name:', sample.name);
        console.log('  - Speciality:', sample.speciality);
        console.log('  - Location:', sample.location);
        console.log('  - Rating:', sample.rating);
        console.log('  - Verified:', sample.is_verified);
        console.log('  - Approval Status:', sample.approval_status);
      } else {
        console.log('⚠️  No approved & verified workers found!');
        console.log('');

        if (workers.length > 0) {
          console.log('Sample worker status:');
          const sample = workers[0];
          console.log('  - Name:', sample.name);
          console.log('  - Verified:', sample.is_verified);
          console.log('  - Approval Status:', sample.approval_status);
          console.log('');
          console.log('💡 Workers exist but may not be approved/verified yet.');
        } else {
          console.log('⚠️  Database has no workers at all!');
        }
      }
    } else {
      console.log('❌ No workers array in response');
      console.log('Response data:', workersResponse.data);
    }
    console.log('');

    // Test 3: Check if authentication endpoint exists
    console.log('Test 3: Testing auth endpoint...');
    try {
      const authTest = await axios.get(`${API_BASE_URL}/check-session`, { timeout: 5000 });
      console.log('✅ Auth endpoint exists');
      console.log('Auth response:', authTest.data);
    } catch (authError) {
      if (authError.response) {
        console.log('✅ Auth endpoint exists (returned', authError.response.status, ')');
      } else {
        console.log('⚠️  Auth endpoint issue:', authError.message);
      }
    }

  } catch (error) {
    console.error('❌ API Test Failed:');
    if (error.code === 'ENOTFOUND') {
      console.error('   Server not found. Check if https://fixxa.co.za is accessible.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Is the server running?');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   Connection timed out. Server may be slow or unreachable.');
    } else if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    } else {
      console.error('   Error:', error.message);
    }
  }
}

console.log('========================================');
console.log('  Fixxa Mobile API Connection Test');
console.log('========================================');
console.log('');

testAPIConnection().then(() => {
  console.log('');
  console.log('========================================');
  console.log('  Test Complete');
  console.log('========================================');
}).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
