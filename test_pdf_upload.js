const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create a simple test PDF-like file
const testContent = '%PDF-1.4\nTest PDF content';
fs.writeFileSync('/tmp/test.pdf', testContent);

// Try uploading with the NEW settings (access_mode: public)
cloudinary.uploader.upload('/tmp/test.pdf', {
  folder: 'fixxa/certifications',
  resource_type: 'auto',
  public_id: 'test-cert-' + Date.now(),
  type: 'upload',
  access_mode: 'public'
})
.then(result => {
  console.log('✅ Upload successful!');
  console.log('URL:', result.secure_url);
  console.log('Public ID:', result.public_id);
  console.log('Resource Type:', result.resource_type);
  console.log('\nTry opening this URL in browser:');
  console.log(result.secure_url);
  
  // Clean up
  fs.unlinkSync('/tmp/test.pdf');
})
.catch(err => {
  console.error('❌ Upload failed:', err);
  fs.unlinkSync('/tmp/test.pdf');
});
