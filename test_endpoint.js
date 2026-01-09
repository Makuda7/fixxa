const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('https://www.fixxa.co.za/admin/check-clement-nkululeko-12345');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

test();
