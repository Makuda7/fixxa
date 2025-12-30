const express = require('express');
const router = express.Router();

module.exports = (pool, logger, profilePicUpload, uploadLimiter) => {
  const { requireAuth, workerOnly } = require('../middleware/auth');

  // ==================== COMPATIBILITY ALIASES FOR MOBILE APP ====================
  // Mobile app uses /upload/profile-picture instead of /workers/upload-profile-picture
  // This route forwards the request to maintain compatibility

  router.post('/profile-picture', requireAuth, workerOnly, uploadLimiter, profilePicUpload.single('profilePicture'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const workerId = req.session.user.id;
      const imageUrl = req.file.path;
      const cloudinaryId = req.file.filename;

      // Delete old profile picture from Cloudinary if exists
      const oldPicture = await pool.query(
        'SELECT profile_picture_cloudinary_id FROM workers WHERE id = $1',
        [workerId]
      );

      if (oldPicture.rows[0]?.profile_picture_cloudinary_id) {
        try {
          const cloudinary = require('cloudinary').v2;
          await cloudinary.uploader.destroy(oldPicture.rows[0].profile_picture_cloudinary_id);
        } catch (error) {
          logger.warn('Failed to delete old profile picture from Cloudinary', { error: error.message });
        }
      }

      // Update worker with new profile picture
      const result = await pool.query(
        `UPDATE workers
         SET profile_picture = $1,
             profile_picture_cloudinary_id = $2,
             profile_picture_uploaded_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING profile_picture, profile_picture_uploaded_at`,
        [imageUrl, cloudinaryId, workerId]
      );

      logger.info('Profile picture uploaded via compatibility route', { workerId, cloudinaryId });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profile_picture: result.rows[0].profile_picture
      });
    } catch (error) {
      logger.error('Upload profile picture error (compatibility route)', { error: error.message });
      console.error('Upload profile picture error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
    }
  });

  return router;
};
