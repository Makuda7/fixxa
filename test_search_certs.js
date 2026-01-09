const axios = require('axios');

async function testSearch() {
  try {
    const response = await axios.get('https://www.fixxa.co.za/search/workers', {
      params: {
        limit: 5
      }
    });

    console.log('Search Results:');
    console.log('===============');
    console.log('Full response:', JSON.stringify(response.data, null, 2));

    if (response.data.workers) {
      response.data.workers.forEach(worker => {
        console.log(`\nWorker: ${worker.name}`);
        console.log(`  ID: ${worker.id}`);
        console.log(`  Verified: ${worker.id_verified}`);
        console.log(`  Approved Cert Count: ${worker.approved_cert_count}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSearch();
