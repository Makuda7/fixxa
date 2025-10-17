const express = require('express');
const router = express.Router();
const multer = require('multer');
const { cloudinary, certificationStorage } = require('../config/cloudinary');

// Configure multer for certification uploads with Cloudinary
const upload = multer({
  storage: certificationStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const isImage = file.mimetype.startsWith('image/');
    const isPDF = file.mimetype === 'application/pdf';
    const isDoc = file.mimetype === 'application/msword' || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (isImage || isPDF || isDoc) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and Word documents are allowed'));
    }
  }
});

module.exports = (pool, logger) => {
  const { requireAuth, workerOnly, adminOnly } = require('../middleware/auth');
  const { sendEmail, createCertificationSubmissionNotification } = require('../utils/email');

  // Upload certification (worker only)
  router.post('/upload', requireAuth, workerOnly, upload.single('certification'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const workerId = req.session.user.id;
      // Cloudinary URL
      const fileUrl = req.file.path;
      const cloudinaryId = req.file.filename;
      const fileName = req.file.originalname;
      const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'document';

      const result = await pool.query(
        'INSERT INTO certifications (worker_id, document_url, cloudinary_id, document_name, file_type, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [workerId, fileUrl, cloudinaryId, fileName, fileType, 'pending']
      );

      const certificationId = result.rows[0].id;

      logger.info('Certification uploaded to Cloudinary', { workerId, certificationId, cloudinaryId });

      // Get worker details for the notification email
      const workerResult = await pool.query(
        'SELECT name, email, speciality FROM workers WHERE id = $1',
        [workerId]
      );

      if (workerResult.rows.length > 0) {
        const worker = workerResult.rows[0];

        // Send notification email to admin
        const emailContent = createCertificationSubmissionNotification(
          worker.name,
          worker.email,
          worker.speciality,
          fileName,
          certificationId
        );

        // Send to admin email (fixxaapp@gmail.com)
        await sendEmail(
          'fixxaapp@gmail.com',
          emailContent.subject,
          emailContent.html,
          logger
        );

        logger.info('Admin notification sent for certificate submission', { workerId, certificationId });
      }

      res.json({
        success: true,
        message: 'Certification uploaded successfully and pending admin approval',
        certification: result.rows[0]
      });
    } catch (error) {
      logger.error('Certification upload error', { error: error.message });
      console.error('Certification upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload certification' });
    }
  });

  // Get worker's certifications
  router.get('/my-certifications', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      
      const result = await pool.query(
        'SELECT * FROM certifications WHERE worker_id = $1 ORDER BY uploaded_at DESC',
        [workerId]
      );

      res.json({ success: true, certifications: result.rows });
    } catch (error) {
      logger.error('Get certifications error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch certifications' });
    }
  });

  // Admin: Get all pending certifications
  router.get('/admin/pending', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          c.*,
          w.name AS worker_name,
          w.email AS worker_email,
          w.speciality,
          w.is_verified
        FROM certifications c
        JOIN workers w ON c.worker_id = w.id
        WHERE c.status = 'pending'
        ORDER BY c.uploaded_at ASC
      `);

      res.json({ success: true, certifications: result.rows });
    } catch (error) {
      logger.error('Get pending certifications error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch pending certifications' });
    }
  });

  // Admin: Get all certifications (with filters)
  router.get('/admin/all', requireAuth, adminOnly, async (req, res) => {
    try {
      const { status } = req.query;
      
      let query = `
        SELECT 
          c.*,
          w.name AS worker_name,
          w.email AS worker_email,
          w.speciality,
          w.is_verified
        FROM certifications c
        JOIN workers w ON c.worker_id = w.id
      `;
      
      const params = [];
      if (status) {
        query += ' WHERE c.status = $1';
        params.push(status);
      }
      
      query += ' ORDER BY c.uploaded_at DESC';

      const result = await pool.query(query, params);

      res.json({ success: true, certifications: result.rows });
    } catch (error) {
      logger.error('Get all certifications error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch certifications' });
    }
  });

  // Admin: Approve certification
  router.post('/admin/approve/:certificationId', requireAuth, adminOnly, async (req, res) => {
    try {
      const certificationId = req.params.certificationId;
      const adminEmail = req.session.user.email;

      // Update certification status
      const certResult = await pool.query(
        'UPDATE certifications SET status = $1, reviewed_at = NOW(), reviewed_by_email = $2 WHERE id = $3 RETURNING worker_id',
        ['approved', adminEmail, certificationId]
      );

      if (certResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Certification not found' });
      }

      const workerId = certResult.rows[0].worker_id;

      // Check if worker has any approved certifications
      const approvedCount = await pool.query(
        'SELECT COUNT(*) FROM certifications WHERE worker_id = $1 AND status = $2',
        [workerId, 'approved']
      );

      // If this is their first approved certification, mark worker as verified
      if (parseInt(approvedCount.rows[0].count) >= 1) {
        await pool.query(
          'UPDATE workers SET is_verified = true, verification_date = NOW() WHERE id = $1',
          [workerId]
        );
      }

      logger.info('Certification approved', { certificationId, workerId, adminEmail });

      res.json({
        success: true,
        message: 'Certification approved successfully',
        workerVerified: parseInt(approvedCount.rows[0].count) >= 1
      });
    } catch (error) {
      logger.error('Approve certification error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to approve certification' });
    }
  });

  // Admin: Reject certification
  router.post('/admin/reject/:certificationId', requireAuth, adminOnly, async (req, res) => {
    try {
      const certificationId = req.params.certificationId;
      const adminEmail = req.session.user.email;
      const { reason } = req.body;

      const result = await pool.query(
        'UPDATE certifications SET status = $1, reviewed_at = NOW(), reviewed_by_email = $2 WHERE id = $3 RETURNING *',
        ['rejected', adminEmail, certificationId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Certification not found' });
      }

      logger.info('Certification rejected', { certificationId, adminEmail, reason });

      res.json({
        success: true,
        message: 'Certification rejected'
      });
    } catch (error) {
      logger.error('Reject certification error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to reject certification' });
    }
  });

  // Delete certification
  router.delete('/:certificationId', requireAuth, workerOnly, async (req, res) => {
    try {
      const certificationId = req.params.certificationId;
      const workerId = req.session.user.id;

      const result = await pool.query(
        'DELETE FROM certifications WHERE id = $1 AND worker_id = $2 RETURNING document_url, cloudinary_id, file_type',
        [certificationId, workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Certification not found' });
      }

      // Delete from Cloudinary
      const cloudinaryId = result.rows[0].cloudinary_id;
      const fileType = result.rows[0].file_type;

      if (cloudinaryId) {
        try {
          // Use appropriate resource_type for deletion
          const resourceType = fileType === 'image' ? 'image' : 'raw';
          await cloudinary.uploader.destroy(cloudinaryId, { resource_type: resourceType });
          logger.info('Certification deleted from Cloudinary', { workerId, certificationId, cloudinaryId });
        } catch (cloudinaryError) {
          logger.error('Failed to delete certification from Cloudinary', { error: cloudinaryError.message, cloudinaryId });
          // Continue even if Cloudinary deletion fails
        }
      }

      res.json({ success: true, message: 'Certification deleted successfully' });
    } catch (error) {
      logger.error('Delete certification error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to delete certification' });
    }
  });

  return router;
};