const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Try to get info about one of the "missing" files
const publicId = 'fixxa/certifications/cert-4-1762200276711';

console.log('Checking for file:', publicId);
console.log('Trying different resource types...\n');

const resourceTypes = ['image', 'raw', 'video'];

async function checkFile() {
  for (const type of resourceTypes) {
    try {
      console.log(`\nTrying resource_type: ${type}`);
      const result = await cloudinary.api.resource(publicId, { 
        resource_type: type,
        type: 'upload'
      });
      
      console.log('✅ FOUND IT!');
      console.log('Resource Type:', result.resource_type);
      console.log('URL:', result.secure_url);
      console.log('Format:', result.format);
      console.log('Bytes:', result.bytes);
      console.log('Created:', result.created_at);
      console.log('Access Mode:', result.access_mode || 'not set');
      return;
    } catch (error) {
      console.log(`❌ Not found as ${type}:`, error.error?.message || error.message);
    }
  }
  
  console.log('\n❌ File not found with any resource type');
}

checkFile();
