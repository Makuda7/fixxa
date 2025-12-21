// Quick test to verify quote requests endpoint works with Railway database
const https = require('https');

console.log('Testing quote requests endpoint...\n');

// Test 1: Health check
https.get('https://fixxa.co.za/quotes/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const health = JSON.parse(data);
    console.log('✓ Health Check:');
    console.log(`  Version: ${health.version}`);
    console.log(`  Endpoints: ${health.endpoints.join(', ')}`);
    console.log(`  Has /requests: ${health.endpoints.includes('/requests') ? 'YES ✓' : 'NO ✗'}`);
    console.log('');

    if (health.endpoints.includes('/requests')) {
      console.log('✓ The /requests endpoint exists in deployed code!');
      console.log('  Your mobile app should work once it\'s deployed.');
    } else {
      console.log('✗ The /requests endpoint is NOT in deployed code yet.');
      console.log('  Railway hasn\'t deployed the latest commit.');
    }
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
