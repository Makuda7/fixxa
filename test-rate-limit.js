// Rate Limiting Test
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testRateLimit(endpoint, maxRequests, description) {
  console.log(`\n=== Testing ${description} ===`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Expected limit: ${maxRequests} requests\n`);

  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 1; i <= maxRequests + 5; i++) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`);
      successCount++;
      console.log(`Request ${i}: ✅ Status ${response.status}`);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        rateLimitedCount++;
        console.log(`Request ${i}: ⛔ Rate limited (429)`);
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
          console.log(`   Retry-After: ${retryAfter} seconds`);
        }
      } else {
        console.log(`Request ${i}: ❌ Error ${error.response?.status || error.message}`);
      }
    }
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`\nResults:`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Rate Limited: ${rateLimitedCount}`);
  console.log(`  Status: ${rateLimitedCount > 0 ? '✅ Rate limiting working' : '⚠️ No rate limiting detected'}`);
}

async function testAuthRateLimit() {
  console.log(`\n=== Testing Auth Rate Limiting ===`);
  console.log(`Endpoint: POST /login`);
  console.log(`Expected limit: 5 attempts per 15 minutes\n`);

  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 1; i <= 7; i++) {
    try {
      const response = await axios.post(`${BASE_URL}/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      successCount++;
      console.log(`Request ${i}: ✅ Status ${response.status}`);
    } catch (error) {
      if (error.response && error.response.status === 429) {
        rateLimitedCount++;
        console.log(`Request ${i}: ⛔ Rate limited (429)`);
      } else if (error.response && error.response.status === 400) {
        successCount++;
        console.log(`Request ${i}: ✅ Request processed (validation error expected)`);
      } else {
        console.log(`Request ${i}: ❌ Error ${error.response?.status || error.message}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nResults:`);
  console.log(`  Processed: ${successCount}`);
  console.log(`  Rate Limited: ${rateLimitedCount}`);
  console.log(`  Status: ${rateLimitedCount > 0 ? '✅ Auth rate limiting working' : '⚠️ No rate limiting detected'}`);
}

async function runTests() {
  console.log('===========================================');
  console.log('Rate Limiting Test Suite');
  console.log('===========================================');

  try {
    // Test global rate limiter (1000 requests per 15 minutes)
    await testRateLimit('/health', 10, 'Global Rate Limiter (sampling first 10 requests)');

    // Test auth rate limiter (5 attempts per 15 minutes)
    await testAuthRateLimit();

    console.log('\n===========================================');
    console.log('✅ Rate Limiting Tests Complete');
    console.log('===========================================\n');
    console.log('Note: Rate limits are working if you see 429 responses.');
    console.log('For full testing, try hitting endpoints more aggressively.\n');

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
}

runTests();
