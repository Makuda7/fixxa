const multer = require('multer');

function errorHandler(error, req, res, next) {
  console.error('Global error handler:', error.message, error.stack);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File too large (max 10MB)' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: 'Unexpected file field' });
    }
    return res.status(400).json({ success: false, error: error.message });
  }

  // Always return JSON, never crash the server
  if (!res.headersSent) {
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

module.exports = { errorHandler };