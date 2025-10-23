const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for profile pictures
const profilePicStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fixxa/profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
    public_id: (req, file) => {
      const workerId = req.session?.user?.id || 'unknown';
      return `worker-${workerId}-${Date.now()}`;
    }
  }
});

// Storage for portfolio photos
const portfolioStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fixxa/portfolio',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
    public_id: (req, file) => {
      const workerId = req.session?.user?.id || 'unknown';
      return `portfolio-${workerId}-${Date.now()}`;
    }
  }
});

// Storage for certification documents
const certificationStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const workerId = req.session?.user?.id || 'unknown';
    const isImage = file.mimetype.startsWith('image/');

    return {
      folder: 'fixxa/certifications',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      resource_type: isImage ? 'image' : 'raw', // 'raw' for PDFs and docs
      public_id: `cert-${workerId}-${Date.now()}`,
      // Only transform images
      transformation: isImage ? [{ width: 1200, height: 1600, crop: 'limit', quality: 'auto' }] : undefined
    };
  }
});

// Storage for message images (client-worker communication)
const messageImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fixxa/message-images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    public_id: (req, file) => {
      const userId = req.session?.user?.id || 'unknown';
      const userType = req.session?.user?.type || 'user';
      return `msg-${userType}-${userId}-${Date.now()}`;
    }
  }
});

module.exports = {
  cloudinary,
  profilePicStorage,
  portfolioStorage,
  certificationStorage,
  messageImageStorage
};
