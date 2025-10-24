const express = require('express');
const router = express.Router();
const { uploadLimiter } = require('../middleware/rateLimiter');
const { scanFile } = require('../utils/virusScanner');
const { cloudinary } = require('../config/cloudinary');

module.exports = (pool, logger, bcrypt, profilePicUpload, saltRounds) => {
  const { requireAuth, workerOnly } = require('../middleware/auth');

  // Update worker professional profile (bio, experience, area)
  router.post('/worker/profile', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { bio, experience, area } = req.body;

      if (!bio || !experience || !area) {
        return res.status(400).json({ success: false, error: 'Bio, experience, and province are required' });
      }

      // Validate province
      const validProvinces = [
        'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
        'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
      ];

      if (!validProvinces.includes(area)) {
        return res.status(400).json({ success: false, error: 'Invalid province selected' });
      }

      await pool.query(
        `UPDATE workers SET bio = $1, experience = $2, area = $3 WHERE id = $4`,
        [bio, experience, area, workerId]
      );

      res.json({ 
        success: true, 
        message: 'Professional profile updated successfully. Changes will appear on your public profile.'
      });
    } catch (error) {
      logger.error('Update worker profile error', { error: error.message });
      console.error('Update worker profile error:', error);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  });

  // Update profile picture
  router.post('/update-profile-picture', requireAuth, uploadLimiter, profilePicUpload.single('profilePic'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const userId = req.session.user.id;
      const userType = req.session.user.type;
      const fileName = req.file.originalname;

      // STEP 1: Virus scan the file BEFORE uploading to Cloudinary
      logger.info('Scanning profile picture for viruses', { userId, userType, fileName });
      const scanResult = await scanFile(req.file);

      if (!scanResult.clean) {
        logger.warn('VIRUS DETECTED in profile picture upload', {
          userId,
          userType,
          fileName,
          viruses: scanResult.foundViruses
        });

        return res.status(400).json({
          success: false,
          error: 'File failed security scan - malware detected. Please ensure your image is safe and try again.',
          code: 'VIRUS_DETECTED'
        });
      }

      logger.info('Profile picture passed virus scan', { userId, userType, fileName, scanResult: scanResult.scanResult });

      // STEP 2: Upload to Cloudinary (file is clean)
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'fixxa/profile-pics',
            resource_type: 'image',
            transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face', quality: 'auto' }],
            public_id: `profile-${userType}-${userId}-${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      const cloudinaryResult = await uploadPromise;
      const fileUrl = cloudinaryResult.secure_url;
      const cloudinaryId = cloudinaryResult.public_id;

      const table = userType === 'professional' ? 'workers' : 'users';

      await pool.query(
        `UPDATE ${table} SET profile_pic = $1, cloudinary_id = $2 WHERE id = $3`,
        [fileUrl, cloudinaryId, userId]
      );

      // Update session with new profile picture
      req.session.user.profilePic = fileUrl;
      req.session.user.image = fileUrl;

      logger.info('Profile picture updated successfully', { userId, userType, cloudinaryId });

      res.json({
        success: true,
        url: fileUrl,
        message: 'Profile picture updated successfully'
      });
    } catch (error) {
      logger.error('Profile picture upload error', { error: error.message });
      console.error('Profile picture upload error:', error);
      res.status(500).json({ success: false, error: 'Upload failed' });
    }
  });

  // Update profile
  router.post('/update-profile', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.type;
      const { name, phone, address, city, postalCode } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }

      const table = userType === 'professional' ? 'workers' : 'users';
      
      await pool.query(
        `UPDATE ${table} 
         SET name = $1, phone = $2, address = $3, city = $4, postal_code = $5 
         WHERE id = $6`,
        [name, phone || null, address || null, city || null, postalCode || null, userId]
      );

      req.session.user.name = name;

      res.json({ 
        success: true, 
        message: 'Profile updated successfully',
        user: req.session.user
      });
    } catch (error) {
      logger.error('Update profile error', { error: error.message });
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  });

  // Change password
  router.post('/change-password', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.type;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Both passwords required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
      }

      const table = userType === 'professional' ? 'workers' : 'users';
      
      const result = await pool.query(`SELECT password FROM ${table} WHERE id = $1`, [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const match = await bcrypt.compare(currentPassword, result.rows[0].password);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      await pool.query(
        `UPDATE ${table} SET password = $1 WHERE id = $2`,
        [hashedPassword, userId]
      );

      res.json({ 
        success: true, 
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error', { error: error.message });
      console.error('Change password error:', error);
      res.status(500).json({ success: false, error: 'Failed to change password' });
    }
  });

  // Update notification preferences
  router.post('/update-notification-preferences', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.type;
      const preferences = req.body;

      const table = userType === 'professional' ? 'workers' : 'users';
      
      await pool.query(
        `UPDATE ${table} 
         SET notification_preferences = $1 
         WHERE id = $2`,
        [JSON.stringify(preferences), userId]
      );

      res.json({ 
        success: true, 
        message: 'Notification preferences saved'
      });
    } catch (error) {
      logger.error('Update notification preferences error', { error: error.message });
      console.error('Update notification preferences error:', error);
      res.status(500).json({ success: false, error: 'Failed to save preferences' });
    }
  });

  // Update privacy preferences
  router.post('/update-privacy-preferences', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.type;
      const preferences = req.body;

      const table = userType === 'professional' ? 'workers' : 'users';
      
      await pool.query(
        `UPDATE ${table} 
         SET privacy_preferences = $1 
         WHERE id = $2`,
        [JSON.stringify(preferences), userId]
      );

      res.json({ 
        success: true, 
        message: 'Privacy settings saved'
      });
    } catch (error) {
      logger.error('Update privacy preferences error', { error: error.message });
      console.error('Update privacy preferences error:', error);
      res.status(500).json({ success: false, error: 'Failed to save settings' });
    }
  });

  // Delete account
  router.post('/delete-account', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.type;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ success: false, error: 'Password required' });
      }

      const table = userType === 'professional' ? 'workers' : 'users';
      
      const result = await pool.query(`SELECT password FROM ${table} WHERE id = $1`, [userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const match = await bcrypt.compare(password, result.rows[0].password);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Incorrect password' });
      }

      if (userType === 'client') {
        await pool.query('DELETE FROM messages WHERE client_id = $1', [userId]);
        await pool.query('DELETE FROM bookings WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM reviews WHERE client_id = $1', [userId]);
      } else {
        await pool.query('DELETE FROM messages WHERE professional_id = $1', [userId]);
        await pool.query('DELETE FROM bookings WHERE worker_id = $1', [userId]);
        await pool.query('DELETE FROM reviews WHERE worker_id = $1', [userId]);
      }

      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [userId]);

      req.session.destroy();
      res.clearCookie('connect.sid');

      res.json({ 
        success: true, 
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Delete account error', { error: error.message });
      console.error('Delete account error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
  });

  // Request account deletion (worker only)
  router.post('/worker/request-deletion', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { reason } = req.body;

      if (!reason || reason.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a detailed reason (at least 10 characters)'
        });
      }

      // Check if there's already a pending request
      const existingRequest = await pool.query(
        `SELECT id FROM account_deletion_requests WHERE worker_id = $1 AND status = 'pending'`,
        [workerId]
      );

      if (existingRequest.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'You already have a pending deletion request. Please wait for admin review.'
        });
      }

      // Create deletion request
      await pool.query(
        `INSERT INTO account_deletion_requests (worker_id, reason) VALUES ($1, $2)`,
        [workerId, reason]
      );

      logger.info('Account deletion requested', { workerId, reason });

      res.json({
        success: true,
        message: 'Your deletion request has been submitted. An admin will review it shortly.'
      });
    } catch (error) {
      logger.error('Request deletion error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to submit request' });
    }
  });

  // Check deletion request status (worker only)
  router.get('/worker/deletion-status', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      const result = await pool.query(
        `SELECT id, status, requested_at, reviewed_at, admin_notes
         FROM account_deletion_requests
         WHERE worker_id = $1
         ORDER BY requested_at DESC
         LIMIT 1`,
        [workerId]
      );

      if (result.rows.length === 0) {
        return res.json({ success: true, hasRequest: false });
      }

      res.json({
        success: true,
        hasRequest: true,
        request: result.rows[0]
      });
    } catch (error) {
      logger.error('Get deletion status error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to get status' });
    }
  });

  return router;
};