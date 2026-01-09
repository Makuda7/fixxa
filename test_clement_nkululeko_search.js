const axios = require('axios');

async function testSearch() {
  try {
    const response = await axios.get('https://www.fixxa.co.za/search/workers', {
      params: {
        limit: 20
      }
    });

    console.log('Searching for Clement and Nkululeko...\n');

    const workers = response.data.workers.filter(w =>
      w.name.toLowerCase().includes('clement') ||
      w.name.toLowerCase().includes('nkululeko')
    );

    if (workers.length === 0) {
      console.log('❌ Clement and Nkululeko NOT found in search results!');
      console.log('\nAll workers in search:');
      response.data.workers.forEach(w => {
        console.log(`  - ${w.name} (ID: ${w.id})`);
      });
    } else {
      console.log('✅ Found workers:');
      workers.forEach(w => {
        console.log(`\nName: ${w.name}`);
        console.log(`  ID: ${w.id}`);
        console.log(`  Verified: ${w.id_verified}`);
        console.log(`  Approved Cert Count: ${w.approved_cert_count}`);
        console.log(`  Status: ${w.approval_status}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSearch();
