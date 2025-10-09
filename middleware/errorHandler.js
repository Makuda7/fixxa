const multer = require('multer');

function errorHandler(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large (max 5MB)' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: 'Unexpected file field' });
    }
  }
  if (error.message === 'Only JPEG, PNG, and WebP images are allowed') {
    return res.status(400).json({ success: false, error: error.message });
  }
  next(error);
}

module.exports = { errorHandler };