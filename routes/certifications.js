const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for certification uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'public/uploads/certifications';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cert-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
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
      const fileUrl = `/uploads/certifications/${req.file.filename}`;
      const fileName = req.file.originalname;

      const result = await pool.query(
        'INSERT INTO certifications (worker_id, document_url, document_name, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [workerId, fileUrl, fileName, 'pending']
      );

      const certificationId = result.rows[0].id;

      logger.info('Certification uploaded', { workerId, certificationId });

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
        'DELETE FROM certifications WHERE id = $1 AND worker_id = $2 RETURNING document_url',
        [certificationId, workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Certification not found' });
      }

      // Optionally delete file from disk
      // const filePath = path.join(__dirname, '..', 'public', result.rows[0].document_url);
      // await fs.unlink(filePath).catch(err => console.error('File deletion error:', err));

      res.json({ success: true, message: 'Certification deleted successfully' });
    } catch (error) {
      logger.error('Delete certification error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to delete certification' });
    }
  });

  return router;
};