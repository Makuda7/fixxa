const express = require('express');
const router = express.Router();
const multer = require('multer');
const streamifier = require('streamifier');
const { cloudinary } = require('../config/cloudinary');

// Memory storage for all admin uploads — we pipe to Cloudinary manually
const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isPDF = file.mimetype === 'application/pdf';
    const isDoc = file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (isImage || isPDF || isDoc) return cb(null, true);
    cb(new Error('Only images, PDFs, and Word documents are allowed'));
  }
});

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
    if (error) return reject(error);
    resolve(result);
  });
  streamifier.createReadStream(buffer).pipe(stream);
});

module.exports = (pool, logger, helpers) => {
  const { requireAuth, adminOnly } = require('../middleware/auth');
  const { formatTimeAgo } = helpers;
  const { sendEmail } = require('../utils/email');

  // Get all workers (admin)
  router.get('/workers', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query('SELECT id, name, email, speciality, area, bio, experience, rating, profile_picture as image, availability_schedule, is_available, latitude, longitude, service_radius, is_active FROM workers ORDER BY name ASC');
      res.json(result.rows);
    } catch (err) {
      logger.error('Failed to fetch workers', { error: err.message });
      console.error('Failed to fetch workers:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Update worker status
  router.patch('/workers/:id/status', requireAuth, adminOnly, async (req, res) => {
    try {
      const workerId = req.params.id;
      const { available } = req.body;
      
      await pool.query(
        'UPDATE workers SET is_available = $1 WHERE id = $2',
        [available, workerId]
      );
      
      logger.info('Admin updated worker status', { workerId, available, adminEmail: req.session.user.email });
      
      res.json({ success: true, available });
    } catch (err) {
      logger.error('Failed to update worker status', { error: err.message });
      console.error('Failed to update worker status:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get admin messages/feedback
  router.get('/messages', requireAuth, adminOnly, async (req, res) => {
    try {
      const feedbackQuery = await pool.query(`
        SELECT
          'feedback' as type,
          r.id,
          u.name as sender,
          'Review for completed job' as subject,
          r.review_text as content,
          r.created_at,
          false as read
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
        LIMIT 10
      `);

      const messagesWithTime = feedbackQuery.rows.map(msg => ({
        ...msg,
        time: formatTimeAgo(msg.created_at)
      }));

      res.json(messagesWithTime);
    } catch (err) {
      logger.error('Failed to fetch admin messages', { error: err.message });
      console.error('Failed to fetch admin messages:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Mark message as read
  router.post('/messages/:id/read', requireAuth, adminOnly, async (req, res) => {
    try {
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Reply to message
  router.post('/messages/:id/reply', requireAuth, adminOnly, async (req, res) => {
    try {
      const { reply } = req.body;
      logger.info('Admin reply sent', { messageId: req.params.id, adminEmail: req.session.user.email });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get submissions (bookings)
  router.get('/submissions', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT b.*, u.name as customerName, w.name as workerName
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN workers w ON b.worker_id = w.id
        ORDER BY b.created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      logger.error('Failed to fetch submissions', { error: err.message });
      console.error('Failed to fetch submissions:', err);
      res.status(500).json([]);
    }
  });

  // Get completed jobs
  router.get('/completed-jobs', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT b.id, b.worker_id as workerId, r.overall_rating as rating
        FROM bookings b
        LEFT JOIN reviews r ON b.id = r.booking_id
        WHERE b.status = 'Completed'
      `);
      res.json(result.rows);
    } catch (err) {
      logger.error('Failed to fetch completed jobs', { error: err.message });
      console.error('Failed to fetch completed jobs:', err);
      res.status(500).json([]);
    }
  });

  // Get dashboard stats
  router.get('/stats', requireAuth, adminOnly, async (req, res) => {
    try {
      const professionalsResult = await pool.query(
        'SELECT COUNT(*) as total FROM workers'
      );
      
      const activeProfessionalsResult = await pool.query(
        'SELECT COUNT(*) as total FROM workers WHERE is_active = true'
      );
      
      const clientsResult = await pool.query(
        'SELECT COUNT(*) as total FROM users'
      );
      
      const bookingsResult = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM bookings
        GROUP BY status
      `);
      
      const bookingsByStatus = {};
      bookingsResult.rows.forEach(row => {
        bookingsByStatus[row.status] = parseInt(row.count);
      });
      
      res.json({
        success: true,
        stats: {
          totalProfessionals: parseInt(professionalsResult.rows[0].total),
          activeProfessionals: parseInt(activeProfessionalsResult.rows[0].total),
          totalClients: parseInt(clientsResult.rows[0].total),
          totalBookings: Object.values(bookingsByStatus).reduce((a, b) => a + b, 0),
          pendingBookings: bookingsByStatus['Pending'] || 0,
          inProgressBookings: bookingsByStatus['In Progress'] || 0,
          completedBookings: bookingsByStatus['Completed'] || 0,
          cancelledBookings: bookingsByStatus['Cancelled'] || 0
        }
      });
    } catch (error) {
      logger.error('Error fetching admin stats', { error: error.message });
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  });

  // Get recent bookings
  router.get('/recent-bookings', requireAuth, adminOnly, async (req, res) => {
    try {
      const limit = req.query.limit || 10;
      
      const result = await pool.query(`
        SELECT 
          b.id,
          b.status,
          b.booking_date,
          b.booking_time,
          b.created_at,
          u.name as client_name,
          u.email as client_email,
          w.name as professional_name,
          w.speciality as service_type
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN workers w ON b.worker_id = w.id
        ORDER BY b.created_at DESC
        LIMIT $1
      `, [limit]);
      
      res.json({
        success: true,
        bookings: result.rows
      });
    } catch (error) {
      logger.error('Error fetching recent bookings', { error: error.message });
      console.error('Error fetching recent bookings:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
  });

  // Get all professionals
  router.get('/professionals', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          w.id,
          w.name,
          w.email,
          w.speciality,
          w.area,
          w.is_active,
          w.approval_status,
          w.is_verified,
          w.verification_status,
          w.email_verified,
          w.created_at,
          COUNT(DISTINCT b.id) as total_bookings,
          COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) as completed_bookings,
          COALESCE(AVG(r.overall_rating), 0) as rating,
          COUNT(DISTINCT c.id) as cert_count,
          COUNT(DISTINCT CASE WHEN c.status = 'approved' THEN c.id END) as approved_cert_count
        FROM workers w
        LEFT JOIN bookings b ON w.id = b.worker_id
        LEFT JOIN reviews r ON w.id = r.worker_id
        LEFT JOIN certifications c ON w.id = c.worker_id
        GROUP BY w.id
        ORDER BY w.created_at DESC
      `);

      res.json({
        success: true,
        professionals: result.rows
      });
    } catch (error) {
      logger.error('Error fetching professionals', { error: error.message });
      console.error('Error fetching professionals:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch professionals' });
    }
  });

  // Get all clients
  router.get('/clients', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.phone,
          u.created_at,
          COUNT(b.id) as total_bookings
        FROM users u
        LEFT JOIN bookings b ON u.id = b.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
      
      res.json({
        success: true,
        clients: result.rows
      });
    } catch (error) {
      logger.error('Error fetching clients', { error: error.message });
      console.error('Error fetching clients:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch clients' });
    }
  });

  // Toggle professional status
  router.post('/toggle-professional/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      await pool.query(
        'UPDATE workers SET is_active = $1 WHERE id = $2',
        [isActive, id]
      );
      
      logger.info('Admin toggled professional status', { 
        professionalId: id, 
        isActive, 
        adminEmail: req.session.user.email 
      });
      
      res.json({
        success: true,
        message: `Professional ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error) {
      logger.error('Error toggling professional status', { error: error.message });
      console.error('Error toggling professional status:', error);
      res.status(500).json({ success: false, error: 'Failed to update status' });
    }
  });

  // Get platform settings
  router.get('/settings', requireAuth, adminOnly, async (req, res) => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS platform_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) UNIQUE NOT NULL,
          setting_value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const result = await pool.query(
        "SELECT setting_value FROM platform_settings WHERE setting_key = 'vacation_mode'"
      );
      
      const vacationMode = result.rows.length > 0 ? result.rows[0].setting_value === 'true' : false;
      
      res.json({
        success: true,
        settings: {
          vacationMode
        }
      });
    } catch (error) {
      logger.error('Error fetching settings', { error: error.message });
      console.error('Error fetching settings:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
  });

  // Update platform settings
  router.post('/settings', requireAuth, adminOnly, async (req, res) => {
    try {
      const { vacationMode } = req.body;
      
      await pool.query(`
        INSERT INTO platform_settings (setting_key, setting_value, updated_at)
        VALUES ('vacation_mode', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
      `, [vacationMode ? 'true' : 'false']);
      
      logger.info('Admin updated platform settings', { 
        vacationMode, 
        adminEmail: req.session.user.email 
      });
      
      res.json({
        success: true,
        message: `Vacation mode ${vacationMode ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      logger.error('Error updating settings', { error: error.message });
      console.error('Error updating settings:', error);
      res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
  });

  // Get account deletion requests
  router.get('/deletion-requests', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT adr.*, w.name as worker_name, w.email as worker_email, w.speciality
        FROM account_deletion_requests adr
        JOIN workers w ON adr.worker_id = w.id
        ORDER BY
          CASE adr.status
            WHEN 'pending' THEN 1
            WHEN 'approved' THEN 2
            WHEN 'rejected' THEN 3
          END,
          adr.requested_at DESC
      `);

      res.json({ success: true, requests: result.rows });
    } catch (error) {
      logger.error('Failed to fetch deletion requests', { error: error.message });
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Approve deletion request
  router.post('/deletion-requests/:id/approve', requireAuth, adminOnly, async (req, res) => {
    try {
      const requestId = req.params.id;
      const adminId = req.session.user.id;
      const { adminNotes } = req.body;

      // Get request details
      const requestResult = await pool.query(
        `SELECT adr.*, w.name as worker_name, w.email as worker_email
         FROM account_deletion_requests adr
         JOIN workers w ON adr.worker_id = w.id
         WHERE adr.id = $1`,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      const request = requestResult.rows[0];

      if (request.status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Request already processed' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update request status
        await client.query(
          `UPDATE account_deletion_requests
           SET status = 'approved',
               reviewed_at = CURRENT_TIMESTAMP,
               reviewed_by = $1,
               admin_notes = $2
           WHERE id = $3`,
          [adminId, adminNotes || 'Approved', requestId]
        );

        // Delete worker account (CASCADE will handle related records)
        await client.query('DELETE FROM workers WHERE id = $1', [request.worker_id]);

        await client.query('COMMIT');

        logger.info('Worker account deleted by admin', {
          workerId: request.worker_id,
          workerEmail: request.worker_email,
          adminId,
          requestId
        });

        res.json({
          success: true,
          message: `Worker account for ${request.worker_name} has been deleted`
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to approve deletion', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });

  // Reject deletion request
  router.post('/deletion-requests/:id/reject', requireAuth, adminOnly, async (req, res) => {
    try {
      const requestId = req.params.id;
      const adminId = req.session.user.id;
      const { adminNotes } = req.body;

      if (!adminNotes || adminNotes.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Please provide detailed notes (at least 10 characters)'
        });
      }

      // Get request details
      const requestResult = await pool.query(
        `SELECT adr.*, w.name as worker_name
         FROM account_deletion_requests adr
         JOIN workers w ON adr.worker_id = w.id
         WHERE adr.id = $1`,
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      const request = requestResult.rows[0];

      if (request.status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Request already processed' });
      }

      // Update request status
      await pool.query(
        `UPDATE account_deletion_requests
         SET status = 'rejected',
             reviewed_at = CURRENT_TIMESTAMP,
             reviewed_by = $1,
             admin_notes = $2
         WHERE id = $3`,
        [adminId, adminNotes, requestId]
      );

      logger.info('Deletion request rejected', {
        requestId,
        workerId: request.worker_id,
        adminId
      });

      res.json({
        success: true,
        message: `Deletion request for ${request.worker_name} has been rejected`
      });
    } catch (error) {
      logger.error('Failed to reject deletion', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });

  // Get pending workers for approval
  router.get('/pending-workers', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          w.id,
          w.name,
          w.email,
          w.speciality,
          w.phone,
          w.address,
          w.city,
          w.postal_code,
          w.bio,
          w.experience,
          w.area,
          w.approval_status,
          w.verification_status,
          w.email_verified,
          w.created_at,
          w.last_completion_email_sent,
          w.profile_pic,
          COUNT(c.id) as cert_count,
          COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as approved_cert_count,
          COUNT(CASE WHEN c.document_type = 'verification_document' THEN 1 END) as verification_doc_count
        FROM workers w
        LEFT JOIN certifications c ON w.id = c.worker_id
        WHERE w.approval_status = 'pending'
        GROUP BY w.id
        ORDER BY
          CASE WHEN w.email_verified = true THEN 0 ELSE 1 END,
          w.created_at ASC
      `);

      res.json({
        success: true,
        workers: result.rows
      });
    } catch (error) {
      logger.error('Error fetching pending workers', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch pending workers' });
    }
  });

  // Get worker verification details
  router.get('/worker-verification/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const workerId = req.params.id;
      console.log('=== Worker Verification Request ===');
      console.log('Worker ID:', workerId);
      console.log('User:', req.session?.user?.email);

      // Get comprehensive worker details - Use * to get all columns that exist
      const workerResult = await pool.query(`
        SELECT *
        FROM workers w
        WHERE w.id = $1
      `, [workerId]);

      console.log('Worker query result:', workerResult.rows.length);

      if (workerResult.rows.length === 0) {
        console.log('Worker not found');
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      // Get worker's certifications
      const certificationsResult = await pool.query(`
        SELECT
          id,
          document_url as file_url,
          cloudinary_id,
          document_name as file_name,
          file_type,
          status,
          uploaded_at
        FROM certifications
        WHERE worker_id = $1
        ORDER BY uploaded_at DESC
      `, [workerId]);

      console.log('Certifications query result:', certificationsResult.rows.length);

      // Fetch CORRECT URLs from Cloudinary API (database URLs might be wrong)
      const certifications = await Promise.all(certificationsResult.rows.map(async (cert) => {
        if (cert.file_type === 'document' && cert.cloudinary_id) {
          try {
            // Get the resource info from Cloudinary to get the REAL URL
            const cloudinaryFile = await cloudinary.api.resource(cert.cloudinary_id, {
              resource_type: 'image', // PDFs are stored as image type
              type: 'upload'
            });

            // Use PDF URL directly, or convert to JPG if PDF delivery is blocked
            let pdfUrl = cloudinaryFile.secure_url;

            // Alternative: Convert PDF first page to JPG as fallback
            // Uncomment if PDFs still don't work:
            // pdfUrl = pdfUrl.replace('.pdf', '.jpg').replace('/upload/', '/upload/pg_1/');

            console.log('Fixed URL for cert', cert.id, ':', pdfUrl);
            return { ...cert, file_url: pdfUrl };
          } catch (error) {
            console.log('Could not fetch Cloudinary URL for cert', cert.id, ':', error.message);
            return cert; // Return with original URL if fetch fails
          }
        }
        return cert;
      }));

      console.log('Returning certifications with CORRECT Cloudinary URLs');

      console.log('Sending success response');
      res.json({
        success: true,
        worker: workerResult.rows[0],
        certifications: certifications
      });
    } catch (error) {
      console.error('=== ERROR in worker-verification endpoint ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Worker ID:', req.params.id);

      logger.error('Error fetching worker verification details', {
        error: error.message,
        stack: error.stack,
        workerId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch verification details',
        details: error.message
      });
    }
  });

  // Approve worker
  router.post('/approve-worker/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { province, primary_suburb, secondary_areas, specialty_ids, bio, experience } = req.body;
      const adminEmail = req.session.user.email;

      console.log('=== APPROVE WORKER REQUEST ===');
      console.log('Worker ID:', id);
      console.log('Province:', province);
      console.log('Primary Suburb:', primary_suburb);
      console.log('Bio provided:', bio ? 'Yes' : 'No');
      console.log('Experience provided:', experience ? 'Yes' : 'No');
      console.log('Admin Email:', adminEmail);

      // Get worker details for email
      const workerResult = await pool.query(
        'SELECT name, email FROM workers WHERE id = $1',
        [id]
      );
      console.log('Worker found:', workerResult.rows.length);

      if (workerResult.rows.length === 0) {
        console.log('ERROR: Worker not found');
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      // Check if worker has approved certifications
      const certResult = await pool.query(
        'SELECT COUNT(*) as count FROM certifications WHERE worker_id = $1 AND status = $2',
        [id, 'approved']
      );
      const hasApprovedCerts = certResult.rows[0].count > 0;
      console.log('Has approved certifications:', hasApprovedCerts);

      // Build update query dynamically based on provided suburb data
      // Always set is_verified = true when approving a worker
      // The "Verified" badge indicates admin approval, not certifications
      // Certifications create the separate "Certified" badge
      let updateQuery = `UPDATE workers
         SET approval_status = 'approved',
             is_active = true,
             is_verified = true,
             approval_date = NOW(),
             approved_by = $1`;

      const params = [adminEmail];
      let paramIndex = 2;

      // Add suburb corrections if provided
      if (province !== undefined && province !== null) {
        updateQuery += `, province = $${paramIndex}`;
        params.push(province.trim());
        paramIndex++;
      }

      if (primary_suburb !== undefined && primary_suburb !== null) {
        updateQuery += `, primary_suburb = $${paramIndex}`;
        params.push(primary_suburb.trim());
        paramIndex++;
      }

      if (secondary_areas !== undefined && secondary_areas !== null) {
        updateQuery += `, secondary_areas = $${paramIndex}`;
        params.push(secondary_areas);
        paramIndex++;
      }

      // Add bio if provided (allows admin to correct spelling/offensive content)
      if (bio !== undefined && bio !== null) {
        updateQuery += `, bio = $${paramIndex}`;
        params.push(bio.trim());
        paramIndex++;
      }

      // Add experience if provided (allows admin to correct spelling/claims)
      if (experience !== undefined && experience !== null) {
        updateQuery += `, experience = $${paramIndex}`;
        params.push(experience.trim());
        paramIndex++;
      }

      updateQuery += ` WHERE id = $${paramIndex}`;
      params.push(id);

      // Update worker status with corrected suburb data
      await pool.query(updateQuery, params);

      // Update worker specialties if provided
      if (specialty_ids && Array.isArray(specialty_ids) && specialty_ids.length > 0) {
        // Delete existing specialties for this worker
        await pool.query('DELETE FROM worker_specialties WHERE worker_id = $1', [id]);

        // Insert new specialties
        for (const specialtyId of specialty_ids) {
          await pool.query(
            'INSERT INTO worker_specialties (worker_id, specialty_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, specialtyId]
          );
        }

        logger.info('Worker specialties updated', {
          workerId: id,
          specialtyCount: specialty_ids.length
        });
      }

      // Add suburb to suburbs table for dynamic dropdown
      if (primary_suburb && province) {
        try {
          // Capitalize properly
          const capitalizedSuburb = primary_suburb.trim().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');

          const capitalizedProvince = province.trim().split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');

          // Insert or update suburb in suburbs table
          await pool.query(`
            INSERT INTO suburbs (name, province, worker_count)
            VALUES ($1, $2, 1)
            ON CONFLICT (name, province)
            DO UPDATE SET
              worker_count = (
                SELECT COUNT(*)
                FROM workers
                WHERE primary_suburb = $1
                  AND province = $2
                  AND is_active = true
                  AND approval_status = 'approved'
              ),
              updated_at = NOW()
          `, [capitalizedSuburb, capitalizedProvince]);

          logger.info('Suburb added/updated in suburbs table', {
            suburb: capitalizedSuburb,
            province: capitalizedProvince,
            workerId: id
          });
        } catch (suburbError) {
          logger.error('Failed to update suburbs table', {
            error: suburbError.message,
            workerId: id
          });
          // Don't fail approval if suburb update fails
        }
      }

      logger.info('Worker approved by admin', {
        workerId: id,
        workerEmail: worker.email,
        adminEmail,
        isVerified: hasApprovedCerts
      });

      // Send approval email to worker
      const { sendEmail } = require('../utils/email');
      const { createWorkerApprovedEmail } = require('../templates/emails');

      const emailContent = createWorkerApprovedEmail(worker.name, worker.email);
      await sendEmail(worker.email, emailContent.subject, emailContent.html).catch(err => {
        logger.error('Failed to send worker approval email', {
          error: err.message,
          workerEmail: worker.email
        });
        // Don't fail the approval if email fails
      });

      const verificationMessage = hasApprovedCerts
        ? ' and verified with approved certifications'
        : ' (not yet verified - awaiting certification approval)';

      res.json({
        success: true,
        message: `${worker.name} has been approved and is now active on the platform${verificationMessage}`,
        isVerified: hasApprovedCerts
      });
    } catch (error) {
      console.log('=== APPROVE WORKER ERROR ===');
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      logger.error('Error approving worker', { error: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Failed to approve worker', details: error.message });
    }
  });

  // Reject worker
  router.post('/reject-worker/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminEmail = req.session.user.email;

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Please provide a detailed reason (at least 10 characters)'
        });
      }

      // Get worker details
      const workerResult = await pool.query(
        'SELECT name, email FROM workers WHERE id = $1',
        [id]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      // Update worker status
      await pool.query(
        `UPDATE workers
         SET approval_status = 'rejected',
             rejection_reason = $1,
             approval_date = NOW(),
             approved_by = $2
         WHERE id = $3`,
        [reason, adminEmail, id]
      );

      logger.info('Worker rejected by admin', {
        workerId: id,
        workerEmail: worker.email,
        adminEmail,
        reason
      });

      // Send rejection email to worker
      const { sendEmail } = require('../utils/email');
      const { createWorkerRejectedEmail } = require('../templates/emails');

      const emailContent = createWorkerRejectedEmail(worker.name, reason);
      await sendEmail(worker.email, emailContent.subject, emailContent.html).catch(err => {
        logger.error('Failed to send worker rejection email', {
          error: err.message,
          workerEmail: worker.email
        });
        // Don't fail the rejection if email fails
      });

      res.json({
        success: true,
        message: `${worker.name}'s application has been rejected`
      });
    } catch (error) {
      logger.error('Error rejecting worker', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to reject worker' });
    }
  });

  // Get worker detail with change history
  router.get('/worker-detail/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const workerId = req.params.id;

      // Get worker details
      const workerResult = await pool.query(
        `SELECT * FROM workers WHERE id = $1`,
        [workerId]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      // Try to get change history if table exists
      let changeHistory = [];
      try {
        const historyResult = await pool.query(
          `SELECT field_changed, old_value, new_value, changed_at, changed_by
           FROM worker_change_history
           WHERE worker_id = $1
           ORDER BY changed_at DESC
           LIMIT 50`,
          [workerId]
        );
        changeHistory = historyResult.rows;
      } catch (historyError) {
        // Table might not exist, that's okay - just return empty history
        logger.info('Change history table not found', { error: historyError.code });
      }

      res.json({
        success: true,
        details: workerResult.rows[0],
        changeHistory: changeHistory
      });
    } catch (error) {
      logger.error('Error fetching worker detail', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch worker details' });
    }
  });

  // Run database schema sync (ADMIN ONLY - USE WITH CAUTION)
  router.post('/sync-database-schema', requireAuth, adminOnly, async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');

      logger.info('Database schema sync requested', { adminEmail: req.session.user.email });

      // Read the SQL file
      const sqlFilePath = path.join(__dirname, '..', 'sync_database_schema.sql');

      if (!fs.existsSync(sqlFilePath)) {
        return res.status(404).json({
          success: false,
          error: 'Schema sync file not found'
        });
      }

      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

      // Execute the SQL
      await pool.query(sqlContent);

      logger.info('Database schema sync completed successfully', {
        adminEmail: req.session.user.email
      });

      res.json({
        success: true,
        message: 'Database schema synchronized successfully',
        details: 'All missing columns and constraints have been added'
      });

    } catch (error) {
      logger.error('Database schema sync failed', {
        error: error.message,
        stack: error.stack,
        adminEmail: req.session.user.email
      });

      res.status(500).json({
        success: false,
        error: 'Failed to sync database schema',
        details: error.message
      });
    }
  });

  // Get virus scan logs (admin only)
  router.get('/virus-scans', requireAuth, adminOnly, async (req, res) => {
    try {
      const { page = 1, limit = 50, filter = 'all' } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = '';
      if (filter === 'infected') {
        whereClause = "WHERE scan_result = 'INFECTED'";
      } else if (filter === 'failed') {
        whereClause = "WHERE scan_result LIKE '%FAILED%' OR scan_result LIKE '%ERROR%'";
      } else if (filter === 'clean') {
        whereClause = "WHERE scan_result = 'CLEAN'";
      }

      const result = await pool.query(`
        SELECT
          vsl.*,
          COALESCE(u.name, w.name) as user_name,
          COALESCE(u.email, w.email) as user_email
        FROM virus_scan_logs vsl
        LEFT JOIN users u ON vsl.user_id = u.id AND vsl.user_type = 'client'
        LEFT JOIN workers w ON vsl.user_id = w.id AND vsl.user_type = 'professional'
        ${whereClause}
        ORDER BY vsl.scanned_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      // Get total count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total FROM virus_scan_logs ${whereClause}
      `);

      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        scans: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Failed to fetch virus scan logs', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch scan logs' });
    }
  });

  // Get virus scan statistics (admin only)
  router.get('/virus-scans/stats', requireAuth, adminOnly, async (req, res) => {
    try {
      const stats = await pool.query(`
        SELECT
          COUNT(*) as total_scans,
          COUNT(*) FILTER (WHERE scan_result = 'CLEAN') as clean_count,
          COUNT(*) FILTER (WHERE scan_result = 'INFECTED') as infected_count,
          COUNT(*) FILTER (WHERE scan_result LIKE '%FAILED%' OR scan_result LIKE '%ERROR%') as failed_count,
          COUNT(*) FILTER (WHERE action_taken = 'blocked') as blocked_count,
          COUNT(*) FILTER (WHERE file_type = 'certification') as certification_scans,
          COUNT(*) FILTER (WHERE file_type = 'profile_pic') as profile_pic_scans,
          COUNT(*) FILTER (WHERE file_type = 'review_photo') as review_photo_scans,
          COUNT(*) FILTER (WHERE file_type = 'message_image') as message_image_scans,
          COUNT(*) FILTER (WHERE scanned_at >= NOW() - INTERVAL '24 hours') as last_24h,
          COUNT(*) FILTER (WHERE scanned_at >= NOW() - INTERVAL '7 days') as last_7d,
          COUNT(*) FILTER (WHERE scanned_at >= NOW() - INTERVAL '30 days') as last_30d
        FROM virus_scan_logs
      `);

      res.json({
        success: true,
        stats: stats.rows[0]
      });
    } catch (error) {
      logger.error('Failed to fetch virus scan stats', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
  });

  // Get recent virus detections (admin only)
  router.get('/virus-scans/recent-threats', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          vsl.*,
          COALESCE(u.name, w.name) as user_name,
          COALESCE(u.email, w.email) as user_email
        FROM virus_scan_logs vsl
        LEFT JOIN users u ON vsl.user_id = u.id AND vsl.user_type = 'client'
        LEFT JOIN workers w ON vsl.user_id = w.id AND vsl.user_type = 'professional'
        WHERE vsl.scan_result = 'INFECTED'
        ORDER BY vsl.scanned_at DESC
        LIMIT 20
      `);

      res.json({
        success: true,
        threats: result.rows
      });
    } catch (error) {
      logger.error('Failed to fetch recent threats', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch threats' });
    }
  });

  // Get referral source statistics (admin only)
  router.get('/stats/referrals', requireAuth, adminOnly, async (req, res) => {
    try {
      // Get referral breakdown for clients
      const clientReferrals = await pool.query(`
        SELECT
          referral_source,
          COUNT(*) as count
        FROM users
        WHERE referral_source IS NOT NULL
        GROUP BY referral_source
        ORDER BY count DESC
      `);

      // Get referral breakdown for workers
      const workerReferrals = await pool.query(`
        SELECT
          referral_source,
          COUNT(*) as count
        FROM workers
        WHERE referral_source IS NOT NULL
        GROUP BY referral_source
        ORDER BY count DESC
      `);

      // Combined stats
      const combinedStats = {};
      clientReferrals.rows.forEach(row => {
        combinedStats[row.referral_source] = {
          source: row.referral_source,
          clients: parseInt(row.count),
          workers: 0,
          total: parseInt(row.count)
        };
      });

      workerReferrals.rows.forEach(row => {
        if (combinedStats[row.referral_source]) {
          combinedStats[row.referral_source].workers = parseInt(row.count);
          combinedStats[row.referral_source].total += parseInt(row.count);
        } else {
          combinedStats[row.referral_source] = {
            source: row.referral_source,
            clients: 0,
            workers: parseInt(row.count),
            total: parseInt(row.count)
          };
        }
      });

      // Convert to array and sort by total
      const referralBreakdown = Object.values(combinedStats)
        .sort((a, b) => b.total - a.total);

      // Get totals
      const totals = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE referral_source IS NOT NULL) as total_clients,
          (SELECT COUNT(*) FROM workers WHERE referral_source IS NOT NULL) as total_workers,
          (SELECT COUNT(*) FROM users WHERE referral_source IS NOT NULL) +
          (SELECT COUNT(*) FROM workers WHERE referral_source IS NOT NULL) as total_all
      `);

      res.json({
        success: true,
        totals: {
          total_clients: parseInt(totals.rows[0].total_clients),
          total_workers: parseInt(totals.rows[0].total_workers),
          total_all: parseInt(totals.rows[0].total_all)
        },
        breakdown: referralBreakdown,
        clients: clientReferrals.rows,
        workers: workerReferrals.rows
      });
    } catch (error) {
      logger.error('Failed to fetch referral stats', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch referral stats' });
    }
  });

  // Get comprehensive platform statistics (admin only)
  router.get('/stats/platform', requireAuth, adminOnly, async (req, res) => {
    try {
      // User stats
      const userStats = await pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as users_last_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as users_last_30d
        FROM users
      `);

      // Worker stats
      const workerStats = await pool.query(`
        SELECT
          COUNT(*) as total_workers,
          COUNT(*) FILTER (WHERE is_active = true) as active_workers,
          COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_approval,
          COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_workers,
          COUNT(*) FILTER (WHERE approval_status = 'rejected') as rejected_workers,
          COUNT(*) FILTER (WHERE is_available = true) as available_workers,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as workers_last_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as workers_last_30d
        FROM workers
      `);

      // Booking stats
      const bookingStats = await pool.query(`
        SELECT
          COUNT(*) as total_bookings,
          COUNT(*) FILTER (WHERE status = 'Pending') as pending_bookings,
          COUNT(*) FILTER (WHERE status = 'Confirmed') as confirmed_bookings,
          COUNT(*) FILTER (WHERE status = 'Completed') as completed_bookings,
          COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled_bookings,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as bookings_last_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as bookings_last_30d
        FROM bookings
      `);

      // Review stats
      const reviewStats = await pool.query(`
        SELECT
          COUNT(*) as total_reviews,
          AVG(overall_rating) as average_rating,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as reviews_last_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as reviews_last_30d
        FROM reviews
      `);

      // Message stats
      const messageStats = await pool.query(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as messages_last_24h,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as messages_last_7d
        FROM messages
      `);

      // Certification stats  
      const certStats = await pool.query(`
        SELECT
          COUNT(*) as total_certifications,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_certifications,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_certifications,
          COUNT(*) FILTER (WHERE status = 'rejected') as rejected_certifications
        FROM certifications
      `);

      res.json({
        success: true,
        stats: {
          users: userStats.rows[0],
          workers: workerStats.rows[0],
          bookings: bookingStats.rows[0],
          reviews: {
            ...reviewStats.rows[0],
            average_rating: reviewStats.rows[0].average_rating ? parseFloat(reviewStats.rows[0].average_rating).toFixed(2) : '0.00'
          },
          messages: messageStats.rows[0],
          certifications: certStats.rows[0]
        },
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to fetch platform stats', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch platform stats' });
    }
  });

  // Test email sending
  router.post('/test-email', requireAuth, adminOnly, async (req, res) => {
    try {
      const adminEmail = req.session.user.email;
      const { sendEmail } = require('../utils/email');

      const testEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4a7c59;">✅ Email System Test</h1>
          <p>Congratulations! Your Fixxa email system is working perfectly.</p>
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0; color: #155724;">
              <strong>✓ SendGrid connected</strong><br>
              <strong>✓ Email sending functional</strong><br>
              <strong>✓ Ready for production</strong>
            </p>
          </div>
          <p>This test email confirms that you can successfully send emails to professionals and clients.</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Sent at: ${new Date().toLocaleString()}<br>
            From: Fixxa Admin Panel
          </p>
        </div>
      `;

      await sendEmail(adminEmail, 'Fixxa Email System Test ✅', testEmailHtml, logger);

      logger.info('Test email sent from admin panel', { adminEmail });

      res.json({
        success: true,
        message: `Test email sent to ${adminEmail}. Check your inbox!`
      });
    } catch (error) {
      logger.error('Test email failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to send test email',
        details: error.message
      });
    }
  });

  // Send incomplete profile email to worker
  router.post('/send-incomplete-profile-email/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const workerId = req.params.id;
      const adminEmail = req.session.user.email;

      // Accept custom missing items from request body (based on checkbox states)
      const customMissingItems = req.body?.missingItems;

      // Get worker details
      const workerResult = await pool.query(
        `SELECT * FROM workers WHERE id = $1`,
        [workerId]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      let missingItems = [];

      // If admin provided custom missing items (from checkboxes), use those
      if (customMissingItems && Array.isArray(customMissingItems) && customMissingItems.length > 0) {
        missingItems = customMissingItems;
      } else {
        // Otherwise, auto-detect missing items (legacy behavior)
        // Check profile picture
        if (!worker.profile_picture) {
          missingItems.push('Profile Picture');
        }

        // Check ID/Passport info
        if (!worker.id_type || !worker.id_number) {
          missingItems.push('ID/Passport Information');
        }

        // Check emergency contacts
        if (!worker.emergency_name_1 || !worker.emergency_phone_1 ||
            !worker.emergency_name_2 || !worker.emergency_phone_2) {
          missingItems.push('Emergency Contact Information');
        }

        // Check professional info
        if (!worker.bio || !worker.experience || !worker.speciality) {
          missingItems.push('Professional Information (Bio, Experience, Service Type)');
        }

        // Check location/suburb info
        if (!worker.province || !worker.primary_suburb) {
          missingItems.push('Service Area Information (Province & Primary Suburb)');
        }

        // Check certifications/documents
        const certResult = await pool.query(
          'SELECT COUNT(*) FROM certifications WHERE worker_id = $1',
          [workerId]
        );

        if (parseInt(certResult.rows[0].count) === 0) {
          missingItems.push('Certifications or Proof of Work Documents');
        }
      }

      if (missingItems.length === 0) {
        return res.json({
          success: true,
          message: 'Profile is complete! No email sent.',
          complete: true
        });
      }

      // Send the incomplete profile email
      const { sendEmail } = require('../utils/email');
      const { createIncompleteProfileEmail } = require('../templates/emails');

      const emailContent = createIncompleteProfileEmail(worker.name, missingItems);
      await sendEmail(worker.email, emailContent.subject, emailContent.html).catch(err => {
        logger.error('Failed to send incomplete profile email', {
          workerId,
          workerEmail: worker.email,
          error: err.message
        });
      });

      // Update last_completion_email_sent timestamp
      await pool.query(
        `UPDATE workers SET last_completion_email_sent = CURRENT_TIMESTAMP WHERE id = $1`,
        [workerId]
      );

      logger.info('Incomplete profile email sent by admin', {
        workerId,
        workerEmail: worker.email,
        adminEmail,
        missingItems,
        customRequested: !!customMissingItems
      });

      res.json({
        success: true,
        message: `Incomplete profile email sent to ${worker.name}`,
        missingItems
      });
    } catch (error) {
      logger.error('Failed to send incomplete profile email', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  });

  // Save verification checkbox states and specialties
  router.post('/save-verification/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const workerId = req.params.id;
      const {
        verified_profile_pic,
        verified_id_info,
        verified_emergency,
        verified_professional,
        verified_documents,
        specialty_ids,
        bio,
        experience,
        province,
        primary_suburb,
        secondary_areas
      } = req.body;

      console.log('=== SAVE VERIFICATION ===');
      console.log('Worker ID:', workerId);
      console.log('Specialty IDs received:', specialty_ids);
      console.log('Bio provided:', bio !== undefined ? 'Yes' : 'No');
      console.log('Experience provided:', experience !== undefined ? 'Yes' : 'No');
      console.log('Province provided:', province !== undefined ? 'Yes' : 'No');
      console.log('Primary suburb provided:', primary_suburb !== undefined ? 'Yes' : 'No');
      console.log('Secondary areas provided:', secondary_areas !== undefined ? 'Yes' : 'No');

      // Build dynamic UPDATE query
      let updateQuery = `UPDATE workers
         SET verified_profile_pic = $1,
             verified_id_info = $2,
             verified_emergency = $3,
             verified_professional = $4,
             verified_documents = $5,
             last_verification_update = CURRENT_TIMESTAMP`;

      const params = [
        verified_profile_pic || false,
        verified_id_info || false,
        verified_emergency || false,
        verified_professional || false,
        verified_documents || false
      ];

      let paramIndex = 6;

      // Add bio if provided
      if (bio !== undefined && bio !== null) {
        updateQuery += `, bio = $${paramIndex}`;
        params.push(bio.trim());
        paramIndex++;
      }

      // Add experience if provided
      if (experience !== undefined && experience !== null) {
        updateQuery += `, experience = $${paramIndex}`;
        params.push(experience.trim());
        paramIndex++;
      }

      // Add province if provided
      if (province !== undefined && province !== null && province !== '') {
        updateQuery += `, province = $${paramIndex}`;
        params.push(province.trim());
        paramIndex++;
      }

      // Add primary_suburb if provided
      if (primary_suburb !== undefined && primary_suburb !== null && primary_suburb !== '') {
        updateQuery += `, primary_suburb = $${paramIndex}`;
        params.push(primary_suburb.trim());
        paramIndex++;
      }

      // Add secondary_areas if provided
      if (secondary_areas !== undefined && secondary_areas !== null) {
        updateQuery += `, secondary_areas = $${paramIndex}`;
        params.push(secondary_areas);
        paramIndex++;
      }

      updateQuery += ` WHERE id = $${paramIndex}`;
      params.push(workerId);

      console.log('Executing UPDATE query with', params.length, 'parameters');
      await pool.query(updateQuery, params);

      // Update worker specialties if provided
      if (specialty_ids && Array.isArray(specialty_ids)) {
        console.log('Deleting existing specialties for worker', workerId);
        // Delete existing specialties for this worker
        await pool.query('DELETE FROM worker_specialties WHERE worker_id = $1', [workerId]);

        console.log('Inserting new specialties:', specialty_ids);
        // Insert new specialties
        for (const specialtyId of specialty_ids) {
          await pool.query(
            'INSERT INTO worker_specialties (worker_id, specialty_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [workerId, specialtyId]
          );
        }
        console.log('Specialties saved successfully');
      } else {
        console.log('No specialties to save or invalid format');
      }

      logger.info('Verification states and specialties saved', {
        workerId,
        adminEmail: req.session.user.email,
        states: { verified_profile_pic, verified_id_info, verified_emergency, verified_professional, verified_documents },
        specialtyCount: specialty_ids ? specialty_ids.length : 0
      });

      res.json({ success: true, message: 'Verification states saved' });
    } catch (error) {
      logger.error('Failed to save verification states', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to save verification states' });
    }
  });

  // ===== WORKER PROFILE UPDATES TRACKING =====

  // Get all profile updates with optional status filter
  router.get('/profile-updates', requireAuth, adminOnly, async (req, res) => {
    try {
      const { status } = req.query;
      const { getPendingUpdates, getUpdateCounts } = require('../utils/profileUpdateLogger');

      const updates = await getPendingUpdates(pool, status);
      const counts = await getUpdateCounts(pool);

      res.json({
        success: true,
        updates,
        counts
      });
    } catch (error) {
      logger.error('Get profile updates error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to load profile updates' });
    }
  });

  // Mark profile update as reviewed
  router.post('/profile-updates/:id/review', requireAuth, adminOnly, async (req, res) => {
    try {
      const updateId = parseInt(req.params.id);
      const adminId = req.session.user.id;
      const { markAsReviewed } = require('../utils/profileUpdateLogger');

      await markAsReviewed(pool, updateId, adminId);

      res.json({
        success: true,
        message: 'Profile update marked as reviewed'
      });
    } catch (error) {
      logger.error('Review profile update error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to mark as reviewed' });
    }
  });

  // Proxy endpoint to serve PDFs from Cloudinary (bypasses authentication issues)
  router.get('/certification-pdf/:certId', requireAuth, adminOnly, async (req, res) => {
    const https = require('https');

    try {
      const { certId } = req.params;

      // Get certification details from database
      const result = await pool.query(
        'SELECT cloudinary_id, document_name FROM certifications WHERE id = $1',
        [certId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Certification not found' });
      }

      const { cloudinary_id, document_name } = result.rows[0];

      // Use Cloudinary Admin API to get authenticated download URL
      const downloadUrl = cloudinary.url(cloudinary_id, {
        resource_type: 'image',
        type: 'upload',
        sign_url: true,
        attachment: true,
        flags: 'attachment:' + (document_name || 'document.pdf')
      });

      console.log('Streaming PDF from Cloudinary:', downloadUrl);

      // Fetch the file from Cloudinary using the authenticated SDK
      https.get(downloadUrl, (cloudinaryRes) => {
        // Set proper headers for PDF display/download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${document_name || 'certification.pdf'}"`);

        // Stream the PDF data to the client
        cloudinaryRes.pipe(res);
      }).on('error', (error) => {
        console.error('Error streaming PDF:', error);
        res.status(500).json({ success: false, error: 'Failed to stream PDF' });
      });

    } catch (error) {
      console.error('PDF proxy error:', error);
      logger.error('Failed to serve PDF', { error: error.message, certId: req.params.certId });
      res.status(500).json({ success: false, error: 'Failed to retrieve PDF' });
    }
  });

  // Delete a single certification (admin only)
  router.delete('/certifications/:certificationId', requireAuth, adminOnly, async (req, res) => {
    try {
      const certificationId = req.params.certificationId;
      const adminEmail = req.session.user.email;

      // Get certification details before deleting
      const certResult = await pool.query(
        'SELECT worker_id, document_name, cloudinary_id, file_type FROM certifications WHERE id = $1',
        [certificationId]
      );

      if (certResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Certification not found' });
      }

      const cert = certResult.rows[0];

      // Delete from database
      await pool.query('DELETE FROM certifications WHERE id = $1', [certificationId]);

      // Delete from Cloudinary
      if (cert.cloudinary_id) {
        try {
          const { cloudinary } = require('../config/cloudinary');
          const resourceType = cert.file_type === 'image' ? 'image' : 'raw';
          await cloudinary.uploader.destroy(cert.cloudinary_id, { resource_type: resourceType });
          logger.info('Certification deleted from Cloudinary', {
            certificationId,
            cloudinaryId: cert.cloudinary_id,
            adminEmail
          });
        } catch (cloudinaryError) {
          logger.error('Failed to delete certification from Cloudinary', {
            error: cloudinaryError.message,
            cloudinaryId: cert.cloudinary_id
          });
          // Continue even if Cloudinary deletion fails
        }
      }

      logger.info('Admin deleted single certification', {
        adminEmail,
        certificationId,
        workerId: cert.worker_id,
        documentName: cert.document_name
      });

      res.json({
        success: true,
        message: 'Certification deleted successfully'
      });
    } catch (error) {
      console.error('Delete certification error:', error);
      logger.error('Failed to delete certification', {
        error: error.message,
        certificationId: req.params.certificationId
      });
      res.status(500).json({ success: false, error: 'Failed to delete certification' });
    }
  });

  // Delete all broken certifications for a worker (admin only)
  router.delete('/worker/:workerId/certifications', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;

      // Get all certifications for this worker before deleting (need cloudinary IDs)
      const certsResult = await pool.query(
        'SELECT id, document_name, cloudinary_id, file_type FROM certifications WHERE worker_id = $1',
        [workerId]
      );

      const certs = certsResult.rows;

      // Delete all certifications from database
      const result = await pool.query(
        'DELETE FROM certifications WHERE worker_id = $1 RETURNING id, document_name',
        [workerId]
      );

      // Delete from Cloudinary
      for (const cert of certs) {
        if (cert.cloudinary_id) {
          try {
            const resourceType = cert.file_type === 'image' ? 'image' : 'raw';
            await cloudinary.uploader.destroy(cert.cloudinary_id, { resource_type: resourceType });
            logger.info('Certification deleted from Cloudinary', {
              certificationId: cert.id,
              cloudinaryId: cert.cloudinary_id,
              adminEmail: req.session.user.email
            });
          } catch (cloudinaryError) {
            logger.error('Failed to delete certification from Cloudinary', {
              error: cloudinaryError.message,
              cloudinaryId: cert.cloudinary_id,
              certificationId: cert.id
            });
            // Continue even if Cloudinary deletion fails
          }
        }
      }

      logger.info('Admin deleted all worker certifications', {
        adminEmail: req.session.user.email,
        workerId,
        deletedCount: result.rowCount,
        deletedCerts: result.rows
      });

      res.json({
        success: true,
        message: `Deleted ${result.rowCount} certification(s)`,
        deleted: result.rows
      });
    } catch (error) {
      console.error('Delete certifications error:', error);
      logger.error('Failed to delete certifications', { error: error.message, workerId: req.params.workerId });
      res.status(500).json({ success: false, error: 'Failed to delete certifications' });
    }
  });

  // Get all specialties
  router.get('/specialties', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT id, name, description, icon, is_active, display_order
        FROM specialties
        ORDER BY display_order ASC, name ASC
      `);

      res.json({ success: true, specialties: result.rows });
    } catch (error) {
      logger.error('Failed to fetch specialties', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch specialties' });
    }
  });

  // Fix worker data (admin utility endpoint)
  router.post('/fix-worker/:workerId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;
      const { rating, is_verified } = req.body;
      const adminEmail = req.session.user.email;

      const fixes = [];
      const updates = [];
      const params = [];
      let paramIndex = 1;

      // Fix rating if provided
      if (rating !== undefined) {
        updates.push(`rating = $${paramIndex}`);
        params.push(parseFloat(rating));
        paramIndex++;
        fixes.push(`Set rating to ${rating}`);
      }

      // Fix is_verified if provided
      if (is_verified !== undefined) {
        updates.push(`is_verified = $${paramIndex}`);
        params.push(is_verified);
        paramIndex++;
        fixes.push(`Set is_verified to ${is_verified}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fixes specified' });
      }

      params.push(workerId);
      const query = `UPDATE workers SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

      await pool.query(query, params);

      logger.info('Admin fixed worker data', {
        workerId,
        fixes,
        adminEmail
      });

      res.json({
        success: true,
        message: `Applied fixes: ${fixes.join(', ')}`,
        fixes
      });
    } catch (error) {
      logger.error('Failed to fix worker data', { error: error.message, workerId: req.params.workerId });
      res.status(500).json({ success: false, error: 'Failed to fix worker data' });
    }
  });

  // Upload worker profile photo (admin only)
  router.post('/upload-worker-photo/:workerId', requireAuth, adminOnly, profilePicUpload.single('profilePicture'), async (req, res) => {
    try {
      const { workerId } = req.params;
      const adminEmail = req.session.user.email;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Get the worker's current profile picture to delete old one
      const workerResult = await pool.query(
        'SELECT profile_picture FROM workers WHERE id = $1',
        [workerId]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const oldProfilePic = workerResult.rows[0].profile_picture;

      // Delete old profile picture from Cloudinary if it exists
      if (oldProfilePic && oldProfilePic.includes('cloudinary')) {
        try {
          const urlParts = oldProfilePic.split('/');
          const publicIdWithExt = urlParts[urlParts.length - 1];
          const publicId = `profile_pictures/${publicIdWithExt.split('.')[0]}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (deleteError) {
          logger.warn('Failed to delete old profile picture from Cloudinary', {
            error: deleteError.message,
            oldProfilePic
          });
        }
      }

      // Get the new image URL from Cloudinary
      const imageUrl = req.file.path;

      // Update worker's profile picture in database
      await pool.query(
        'UPDATE workers SET profile_picture = $1 WHERE id = $2',
        [imageUrl, workerId]
      );

      logger.info('Admin uploaded worker profile photo', {
        workerId,
        imageUrl,
        adminEmail
      });

      res.json({
        success: true,
        imageUrl,
        message: 'Profile picture updated successfully'
      });
    } catch (error) {
      logger.error('Failed to upload worker profile photo', {
        error: error.message,
        workerId: req.params.workerId
      });
      res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
    }
  });

  // Toggle worker verified status (admin only)
  router.post('/toggle-verified/:workerId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;
      const { is_verified } = req.body;
      const adminEmail = req.session.user.email;

      // Validate input
      if (typeof is_verified !== 'boolean') {
        return res.status(400).json({ success: false, error: 'is_verified must be a boolean' });
      }

      // Update worker verification status
      const result = await pool.query(
        'UPDATE workers SET is_verified = $1 WHERE id = $2 RETURNING id, name, is_verified',
        [is_verified, workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = result.rows[0];

      logger.info('Admin toggled worker verification status', {
        workerId,
        workerName: worker.name,
        isVerified: is_verified,
        adminEmail
      });

      res.json({
        success: true,
        message: `Worker ${is_verified ? 'verified' : 'unverified'} successfully`,
        worker: {
          id: worker.id,
          name: worker.name,
          is_verified: worker.is_verified
        }
      });
    } catch (error) {
      logger.error('Failed to toggle worker verification status', {
        error: error.message,
        workerId: req.params.workerId
      });
      res.status(500).json({ success: false, error: 'Failed to update verification status' });
    }
  });

  // Quick fix: Set specific worker as verified by name (emergency endpoint)
  router.post('/quick-verify-worker', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerName } = req.body;
      const adminEmail = req.session.user.email;

      if (!workerName) {
        return res.status(400).json({ success: false, error: 'Worker name is required' });
      }

      // Update worker verification status
      const result = await pool.query(
        `UPDATE workers
         SET is_verified = true
         WHERE LOWER(name) LIKE LOWER($1)
         RETURNING id, name, is_verified, approval_status`,
        [`%${workerName}%`]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: `No worker found with name containing "${workerName}"` });
      }

      const worker = result.rows[0];

      logger.info('Admin quick-verified worker by name', {
        workerId: worker.id,
        workerName: worker.name,
        searchName: workerName,
        adminEmail
      });

      res.json({
        success: true,
        message: `${worker.name} has been verified successfully`,
        worker: {
          id: worker.id,
          name: worker.name,
          is_verified: worker.is_verified,
          approval_status: worker.approval_status
        }
      });
    } catch (error) {
      logger.error('Failed to quick-verify worker', {
        error: error.message,
        workerName: req.body.workerName
      });
      res.status(500).json({ success: false, error: 'Failed to verify worker' });
    }
  });

  // Get worker's current specialties
  router.get('/worker-specialties/:workerId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;

      const result = await pool.query(`
        SELECT s.id, s.name, s.icon
        FROM specialties s
        JOIN worker_specialties ws ON s.id = ws.specialty_id
        WHERE ws.worker_id = $1
        ORDER BY s.name ASC
      `, [workerId]);

      res.json({ success: true, specialties: result.rows });
    } catch (error) {
      logger.error('Failed to fetch worker specialties', { error: error.message, workerId: req.params.workerId });
      res.status(500).json({ success: false, error: 'Failed to fetch worker specialties' });
    }
  });

  // Add new specialty
  router.post('/specialties', requireAuth, adminOnly, async (req, res) => {
    try {
      const { name, description, icon } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Specialty name is required' });
      }

      const result = await pool.query(`
        INSERT INTO specialties (name, description, icon, is_active, display_order)
        VALUES ($1, $2, $3, true, 100)
        RETURNING id, name, description, icon, is_active, display_order
      `, [name.trim(), description || null, icon || '🔧']);

      logger.info('New specialty added', { specialtyId: result.rows[0].id, name: name.trim(), adminEmail: req.session.user.email });
      res.json({ success: true, specialty: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ success: false, error: 'A specialty with this name already exists' });
      }
      logger.error('Failed to add specialty', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to add specialty' });
    }
  });

  // Update specialty
  router.put('/specialties/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, icon, is_active } = req.body;

      const result = await pool.query(`
        UPDATE specialties
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            icon = COALESCE($3, icon),
            is_active = COALESCE($4, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, name, description, icon, is_active, display_order
      `, [name, description, icon, is_active, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Specialty not found' });
      }

      logger.info('Specialty updated', { specialtyId: id, adminEmail: req.session.user.email });
      res.json({ success: true, specialty: result.rows[0] });
    } catch (error) {
      logger.error('Failed to update specialty', { error: error.message, specialtyId: req.params.id });
      res.status(500).json({ success: false, error: 'Failed to update specialty' });
    }
  });

  // Delete specialty (only if no workers are using it)
  router.delete('/specialties/:id', requireAuth, adminOnly, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if any workers are using this specialty
      const usageCheck = await pool.query(
        'SELECT COUNT(*) FROM worker_specialties WHERE specialty_id = $1',
        [id]
      );

      if (parseInt(usageCheck.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete specialty that is assigned to workers. Remove it from all workers first.'
        });
      }

      const result = await pool.query('DELETE FROM specialties WHERE id = $1 RETURNING name', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Specialty not found' });
      }

      logger.info('Specialty deleted', { specialtyId: id, name: result.rows[0].name, adminEmail: req.session.user.email });
      res.json({ success: true, message: 'Specialty deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete specialty', { error: error.message, specialtyId: req.params.id });
      res.status(500).json({ success: false, error: 'Failed to delete specialty' });
    }
  });

  // Get worker certifications for verification modal
  router.get('/worker-certifications/:workerId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;

      const result = await pool.query(
        `SELECT id, document_name, document_url, cloudinary_id, file_type, status, created_at
         FROM certifications
         WHERE worker_id = $1
         ORDER BY created_at DESC`,
        [workerId]
      );

      logger.info('Fetched worker certifications', { workerId, count: result.rows.length, adminEmail: req.session.user.email });
      res.json({ success: true, certifications: result.rows });
    } catch (error) {
      logger.error('Failed to fetch worker certifications', { error: error.message, workerId: req.params.workerId });
      res.status(500).json({ success: false, error: 'Failed to fetch certifications' });
    }
  });

  // Save verification states for a worker
  router.post('/save-verification-states/:workerId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;
      const {
        verified_profile_pic,
        verified_id_info,
        verified_emergency,
        verified_professional,
        verified_documents,
        province,
        primary_suburb,
        secondary_areas,
        bio,
        experience,
        specialty_ids
      } = req.body;

      // Update verification states and editable fields
      const result = await pool.query(
        `UPDATE workers
         SET verified_profile_pic = $1,
             verified_id_info = $2,
             verified_emergency = $3,
             verified_professional = $4,
             verified_documents = $5,
             province = $6,
             primary_suburb = $7,
             secondary_areas = $8,
             bio = $9,
             experience = $10,
             updated_at = NOW()
         WHERE id = $11
         RETURNING id`,
        [
          verified_profile_pic,
          verified_id_info,
          verified_emergency,
          verified_professional,
          verified_documents,
          province,
          primary_suburb,
          secondary_areas,
          bio,
          experience,
          workerId
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      // Update worker specialties if provided
      if (specialty_ids && Array.isArray(specialty_ids)) {
        // Delete existing specialties
        await pool.query('DELETE FROM worker_specialties WHERE worker_id = $1', [workerId]);

        // Insert new specialties
        if (specialty_ids.length > 0) {
          const values = specialty_ids.map((specId, idx) =>
            `($1, $${idx + 2})`
          ).join(', ');

          await pool.query(
            `INSERT INTO worker_specialties (worker_id, specialty_id) VALUES ${values}`,
            [workerId, ...specialty_ids]
          );
        }
      }

      logger.info('Verification states saved', {
        workerId,
        verificationStates: {
          verified_profile_pic,
          verified_id_info,
          verified_emergency,
          verified_professional,
          verified_documents
        },
        adminEmail: req.session.user.email
      });

      res.json({ success: true, message: 'Verification states saved successfully' });
    } catch (error) {
      logger.error('Failed to save verification states', { error: error.message, workerId: req.params.workerId });
      res.status(500).json({ success: false, error: 'Failed to save verification states' });
    }
  });

  // Send incomplete profile email to worker
  router.post('/send-incomplete-email/:workerId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;
      const { missingItems } = req.body;

      // Get worker details
      const workerResult = await pool.query(
        'SELECT name, email FROM workers WHERE id = $1',
        [workerId]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      // Send email
      const emailHtml = `
        <h2>Complete Your Fixxa Profile</h2>
        <p>Hi ${worker.name},</p>
        <p>We're reviewing your application, but we need some additional information to complete your verification:</p>
        <ul>
          ${missingItems.map(item => `<li>${item}</li>`).join('')}
        </ul>
        <p>Please log in to your Fixxa account and complete these items as soon as possible.</p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>The Fixxa Team</p>
      `;

      await sendEmail(
        worker.email,
        'Complete Your Fixxa Profile',
        emailHtml
      );

      // Update last_completion_email_sent timestamp
      await pool.query(
        'UPDATE workers SET last_completion_email_sent = NOW() WHERE id = $1',
        [workerId]
      );

      logger.info('Incomplete profile email sent', {
        workerId,
        workerEmail: worker.email,
        missingItems,
        adminEmail: req.session.user.email
      });

      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      logger.error('Failed to send incomplete profile email', { error: error.message, workerId: req.params.workerId });
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  });

  // Upload profile photo for worker (admin helping worker)
  router.post('/upload-worker-photo/:workerId', requireAuth, adminOnly, profilePicUpload.single('profilePicture'), async (req, res) => {
    try {
      const { workerId } = req.params;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      // Get current worker photo to delete from Cloudinary if exists
      const workerResult = await pool.query(
        'SELECT profile_picture, cloudinary_profile_id FROM workers WHERE id = $1',
        [workerId]
      );

      if (workerResult.rows.length === 0) {
        // Delete uploaded file from Cloudinary since worker doesn't exist
        if (req.file.cloudinaryId) {
          await cloudinary.uploader.destroy(req.file.cloudinaryId);
        }
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const oldCloudinaryId = workerResult.rows[0].cloudinary_profile_id;

      // Update worker with new profile picture
      await pool.query(
        'UPDATE workers SET profile_picture = $1, cloudinary_profile_id = $2, updated_at = NOW() WHERE id = $3',
        [req.file.path, req.file.filename, workerId]
      );

      // Delete old profile picture from Cloudinary if it exists
      if (oldCloudinaryId) {
        try {
          await cloudinary.uploader.destroy(oldCloudinaryId);
        } catch (deleteError) {
          logger.warn('Failed to delete old profile picture from Cloudinary', {
            error: deleteError.message,
            cloudinaryId: oldCloudinaryId
          });
        }
      }

      logger.info('Admin uploaded profile photo for worker', {
        workerId,
        adminEmail: req.session.user.email,
        cloudinaryId: req.file.filename
      });

      res.json({
        success: true,
        message: 'Profile photo uploaded successfully',
        profile_picture: req.file.path
      });
    } catch (error) {
      logger.error('Failed to upload worker profile photo', {
        error: error.message,
        workerId: req.params.workerId
      });

      // Try to clean up uploaded file if database update failed
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (cleanupError) {
          logger.error('Failed to cleanup uploaded file after error', {
            error: cleanupError.message,
            cloudinaryId: req.file.filename
          });
        }
      }

      res.status(500).json({ success: false, error: 'Failed to upload profile photo' });
    }
  });

  // Upload certification for worker (admin helping worker)
  router.post('/upload-worker-certification/:workerId', requireAuth, adminOnly, certificationUpload.single('certification'), async (req, res) => {
    try {
      const { workerId } = req.params;
      const { documentName } = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      if (!documentName || !documentName.trim()) {
        // Delete uploaded file from Cloudinary since no document name provided
        if (req.file.filename) {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
          });
        }
        return res.status(400).json({ success: false, error: 'Document name is required' });
      }

      // Verify worker exists
      const workerResult = await pool.query('SELECT id, name FROM workers WHERE id = $1', [workerId]);

      if (workerResult.rows.length === 0) {
        // Delete uploaded file from Cloudinary since worker doesn't exist
        if (req.file.filename) {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
          });
        }
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      // Determine file type for database
      let fileType = 'document';
      if (req.file.mimetype === 'application/pdf') {
        fileType = 'pdf';
      } else if (req.file.mimetype.startsWith('image/')) {
        fileType = 'image';
      }

      // Insert certification into database (mark as professional certification, not verification doc)
      const insertResult = await pool.query(
        `INSERT INTO certifications
         (worker_id, document_name, document_url, cloudinary_id, file_type, document_type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'certification', 'pending', NOW())
         RETURNING id, document_name, document_url, file_type, status, created_at`,
        [workerId, documentName.trim(), req.file.path, req.file.filename, fileType]
      );

      logger.info('Admin uploaded certification for worker', {
        workerId,
        workerName: workerResult.rows[0].name,
        adminEmail: req.session.user.email,
        documentName: documentName.trim(),
        cloudinaryId: req.file.filename,
        fileType
      });

      res.json({
        success: true,
        message: 'Certification uploaded successfully',
        certification: insertResult.rows[0]
      });
    } catch (error) {
      logger.error('Failed to upload worker certification', {
        error: error.message,
        workerId: req.params.workerId
      });

      // Try to clean up uploaded file if database insert failed
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
          });
        } catch (cleanupError) {
          logger.error('Failed to cleanup uploaded file after error', {
            error: cleanupError.message,
            cloudinaryId: req.file.filename
          });
        }
      }

      res.status(500).json({ success: false, error: 'Failed to upload certification' });
    }
  });

  // Upload ID/Passport document for worker (admin helping worker)
  router.post('/upload-worker-id/:workerId', requireAuth, adminOnly, certificationUpload.single('idDocument'), async (req, res) => {
    try {
      const { workerId } = req.params;
      const { documentType } = req.body; // 'id' or 'passport'

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      if (!documentType || !['id', 'passport'].includes(documentType)) {
        // Delete uploaded file from Cloudinary since invalid document type
        if (req.file.filename) {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
          });
        }
        return res.status(400).json({ success: false, error: 'Valid document type is required (id or passport)' });
      }

      // Verify worker exists
      const workerResult = await pool.query('SELECT id, name, cloudinary_id_document_id FROM workers WHERE id = $1', [workerId]);

      if (workerResult.rows.length === 0) {
        // Delete uploaded file from Cloudinary since worker doesn't exist
        if (req.file.filename) {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
          });
        }
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const oldCloudinaryId = workerResult.rows[0].cloudinary_id_document_id;

      // Update worker with ID/Passport document
      await pool.query(
        `UPDATE workers
         SET id_document_url = $1,
             id_document_type = $2,
             cloudinary_id_document_id = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [req.file.path, documentType, req.file.filename, workerId]
      );

      // Delete old ID document from Cloudinary if it exists
      if (oldCloudinaryId) {
        try {
          await cloudinary.uploader.destroy(oldCloudinaryId, {
            resource_type: 'raw' // ID documents are stored as raw files
          });
        } catch (deleteError) {
          logger.warn('Failed to delete old ID document from Cloudinary', {
            error: deleteError.message,
            cloudinaryId: oldCloudinaryId
          });
        }
      }

      logger.info('Admin uploaded ID/Passport document for worker', {
        workerId,
        workerName: workerResult.rows[0].name,
        adminEmail: req.session.user.email,
        documentType,
        cloudinaryId: req.file.filename
      });

      res.json({
        success: true,
        message: `${documentType === 'passport' ? 'Passport' : 'ID'} document uploaded successfully`,
        id_document_url: req.file.path,
        id_document_type: documentType
      });
    } catch (error) {
      logger.error('Failed to upload worker ID document', {
        error: error.message,
        workerId: req.params.workerId
      });

      // Try to clean up uploaded file if database update failed
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename, {
            resource_type: req.file.mimetype.startsWith('image/') ? 'image' : 'raw'
          });
        } catch (cleanupError) {
          logger.error('Failed to cleanup uploaded file after error', {
            error: cleanupError.message,
            cloudinaryId: req.file.filename
          });
        }
      }

      res.status(500).json({ success: false, error: 'Failed to upload ID document' });
    }
  });

  // TEMPORARY: Manual migration endpoint for document_type column
  // Visit /admin/run-document-type-migration to execute
  // DELETE THIS AFTER RUNNING ONCE
  router.get('/run-document-type-migration', async (req, res) => {
    try {
      const results = [];

      // Step 1: Add column
      await pool.query(`
        ALTER TABLE certifications
        ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'certification';
      `);
      results.push('✓ Added document_type column (or already exists)');

      // Step 2: Update verification documents
      const updateResult = await pool.query(`
        UPDATE certifications
        SET document_type = 'verification_document'
        WHERE document_type = 'certification'
          AND (LOWER(document_name) LIKE '%id%'
           OR LOWER(document_name) LIKE '%proof%'
           OR LOWER(document_name) LIKE '%residence%'
           OR LOWER(document_name) LIKE '%address%'
           OR LOWER(document_name) LIKE '%passport%'
           OR LOWER(document_name) LIKE '%identity%'
           OR LOWER(document_name) LIKE '%verification%');
      `);
      results.push(`✓ Updated ${updateResult.rowCount} verification documents`);

      // Step 3: Create index
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_certifications_document_type
        ON certifications(document_type);
      `);
      results.push('✓ Created index on document_type');

      // Step 4: Check Worker 4
      const worker4 = await pool.query(`
        SELECT id, document_name, document_type, status
        FROM certifications
        WHERE worker_id = 4;
      `);
      results.push(`\nWorker 4 has ${worker4.rows.length} total certifications:`);
      worker4.rows.forEach(row => {
        results.push(`  - ${row.document_name}: ${row.document_type} (${row.status})`);
      });

      const worker4Approved = await pool.query(`
        SELECT COUNT(*) as count
        FROM certifications
        WHERE worker_id = 4 AND status = 'approved' AND document_type = 'certification';
      `);
      results.push(`\nWorker 4 approved professional certs: ${worker4Approved.rows[0].count}`);

      res.json({
        success: true,
        message: 'Migration completed successfully!',
        results: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Cleanup test data for a specific user (admin only)
  router.delete('/cleanup-user-data/:userId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminEmail = req.session.user.email;

      // Get user details first
      const userResult = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = userResult.rows[0];
      const results = {
        reviews: 0,
        messages: 0,
        notifications: 0,
        bookings: 0
      };

      // Start transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Delete reviews by this user
        const reviewsResult = await client.query(
          'DELETE FROM reviews WHERE client_id = $1 RETURNING id',
          [userId]
        );
        results.reviews = reviewsResult.rowCount;

        // 2. Delete messages where this user is involved
        const messagesResult = await client.query(
          'DELETE FROM messages WHERE client_id = $1 RETURNING id',
          [userId]
        );
        results.messages = messagesResult.rowCount;

        // 3. Delete notifications for this user
        const notificationsResult = await client.query(
          'DELETE FROM notifications WHERE user_id = $1 RETURNING id',
          [userId]
        );
        results.notifications = notificationsResult.rowCount;

        // 4. Delete bookings made by this user
        const bookingsResult = await client.query(
          'DELETE FROM bookings WHERE user_id = $1 RETURNING id',
          [userId]
        );
        results.bookings = bookingsResult.rowCount;

        await client.query('COMMIT');

        logger.info('Admin cleaned up user test data', {
          adminEmail,
          userId,
          userName: user.name,
          userEmail: user.email,
          results
        });

        res.json({
          success: true,
          message: `Test data cleaned up for ${user.name}`,
          user: { id: user.id, name: user.name, email: user.email },
          deleted: results
        });

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to cleanup user data', { error: error.message, userId: req.params.userId });
      res.status(500).json({ success: false, error: 'Failed to cleanup user data' });
    }
  });

  // Delete a worker account (admin only)
  router.delete('/worker/:workerId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;
      const adminEmail = req.session.user.email;

      const workerResult = await pool.query('SELECT id, name, email FROM workers WHERE id = $1', [workerId]);
      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }
      const worker = workerResult.rows[0];

      // Delete related records that may not have CASCADE, then the worker (CASCADE handles the rest)
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Tables that may lack CASCADE — delete explicitly
        await client.query('DELETE FROM quote_requests WHERE worker_id = $1', [workerId]).catch(() => {});
        await client.query('DELETE FROM booking_requests WHERE worker_id = $1', [workerId]).catch(() => {});
        await client.query('DELETE FROM worker_profile_updates WHERE worker_id = $1', [workerId]).catch(() => {});
        // Delete the worker — CASCADE handles certifications, bookings, messages, reviews, notifications, specialties
        await client.query('DELETE FROM workers WHERE id = $1', [workerId]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      logger.warn('Admin deleted worker account', { adminEmail, workerId, workerName: worker.name, workerEmail: worker.email });
      res.json({ success: true, message: `Worker ${worker.name} deleted successfully` });
    } catch (error) {
      logger.error('Failed to delete worker', { error: error.message, workerId: req.params.workerId });
      res.status(500).json({ success: false, error: 'Failed to delete worker account' });
    }
  });

  // Delete a user (client) account (admin only)
  router.delete('/user/:userId', requireAuth, adminOnly, async (req, res) => {
    try {
      const { userId } = req.params;
      const adminEmail = req.session.user.email;

      const userResult = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const user = userResult.rows[0];

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Tables that may lack CASCADE — delete explicitly
        await client.query('DELETE FROM quote_requests WHERE client_id = $1', [userId]).catch(() => {});
        await client.query('DELETE FROM booking_requests WHERE user_id = $1', [userId]).catch(() => {});
        // Delete the user — CASCADE handles bookings, messages, reviews, notifications
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }

      logger.warn('Admin deleted user account', { adminEmail, userId, userName: user.name, userEmail: user.email });
      res.json({ success: true, message: `Client ${user.name} deleted successfully` });
    } catch (error) {
      logger.error('Failed to delete user', { error: error.message, userId: req.params.userId });
      res.status(500).json({ success: false, error: 'Failed to delete user account' });
    }
  });

  // Delete ALL reviews (for pre-launch cleanup)
  router.delete('/cleanup-all-reviews', requireAuth, adminOnly, async (req, res) => {
    try {
      const adminEmail = req.session.user.email;

      // Get count first
      const countResult = await pool.query('SELECT COUNT(*) as count FROM reviews');
      const totalCount = parseInt(countResult.rows[0].count);

      // Delete all reviews
      const deleteResult = await pool.query('DELETE FROM reviews RETURNING id');

      logger.info('Admin deleted all reviews', {
        adminEmail,
        deletedCount: deleteResult.rowCount
      });

      res.json({
        success: true,
        message: `Deleted all ${deleteResult.rowCount} reviews`,
        deletedCount: deleteResult.rowCount
      });
    } catch (error) {
      logger.error('Failed to delete all reviews', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to delete reviews' });
    }
  });

  // Find user by name for cleanup
  router.get('/find-user', requireAuth, adminOnly, async (req, res) => {
    try {
      const { name } = req.query;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Name parameter is required' });
      }

      const result = await pool.query(
        `SELECT id, name, email, created_at FROM users WHERE LOWER(name) LIKE LOWER($1)`,
        [`%${name}%`]
      );

      res.json({
        success: true,
        users: result.rows
      });
    } catch (error) {
      logger.error('Failed to find user', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to find user' });
    }
  });

  // Check Clement and Nkululeko certifications
  router.get('/check-clement-nkululeko-12345', async (req, res) => {
    try {
      const results = [];

      // Find workers
      const workers = await pool.query(`
        SELECT id, name, email, is_verified, id_verified, approval_status
        FROM workers
        WHERE name ILIKE '%clement%' OR name ILIKE '%nkululeko%'
      `);

      results.push(`Found ${workers.rows.length} workers:`);

      for (const worker of workers.rows) {
        results.push(`\n=== ${worker.name} (ID: ${worker.id}) ===`);
        results.push(`Email: ${worker.email}`);
        results.push(`Verified: ${worker.is_verified}, ID Verified: ${worker.id_verified}`);
        results.push(`Status: ${worker.approval_status}`);

        // Get all certifications
        const certs = await pool.query(`
          SELECT id, document_name, document_type, status, uploaded_at
          FROM certifications
          WHERE worker_id = $1
          ORDER BY uploaded_at DESC
        `, [worker.id]);

        results.push(`\nTotal certifications: ${certs.rows.length}`);

        certs.rows.forEach(cert => {
          results.push(`  - ${cert.document_name}`);
          results.push(`    Type: ${cert.document_type}, Status: ${cert.status}`);
        });

        // Count approved professional certifications
        const approvedCount = await pool.query(`
          SELECT COUNT(*) as count
          FROM certifications
          WHERE worker_id = $1
            AND status = 'approved'
            AND document_type = 'certification'
        `, [worker.id]);

        results.push(`\nAPPROVED PROFESSIONAL CERTS: ${approvedCount.rows[0].count}`);
      }

      res.json({
        success: true,
        results: results
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Upload ID document for a worker (admin only)
  router.post('/upload-worker-id/:workerId', requireAuth, adminOnly, adminUpload.single('idDocument'), async (req, res) => {
    try {
      const workerId = req.params.workerId;
      const documentType = req.body.documentType || 'id';

      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const isImage = req.file.mimetype.startsWith('image/');
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'fixxa/id-documents',
        resource_type: isImage ? 'image' : 'raw',
        public_id: `id-${workerId}-${Date.now()}`,
        transformation: isImage ? [{ width: 1200, height: 1600, crop: 'limit', quality: 'auto' }] : undefined
      });

      await pool.query(
        `UPDATE workers SET id_document_url = $1, id_document_cloudinary_id = $2, id_type = $3, id_submitted_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [result.secure_url, result.public_id, documentType, workerId]
      );

      res.json({ success: true, id_document_url: result.secure_url, id_document_type: documentType });
    } catch (error) {
      logger.error('Admin upload worker ID error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to upload ID document: ' + error.message });
    }
  });

  // Upload certification for a worker (admin only)
  router.post('/upload-worker-certification/:workerId', requireAuth, adminOnly, adminUpload.single('certification'), async (req, res) => {
    try {
      const workerId = req.params.workerId;
      const documentName = req.body.documentName || 'Certification';

      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      const isImage = req.file.mimetype.startsWith('image/');
      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'fixxa/certifications',
        resource_type: isImage ? 'image' : 'raw',
        public_id: `cert-admin-${workerId}-${Date.now()}`,
        transformation: isImage ? [{ width: 1200, height: 1600, crop: 'limit', quality: 'auto' }] : undefined
      });

      const dbResult = await pool.query(
        `INSERT INTO certifications (worker_id, document_url, cloudinary_id, document_name, file_type, status, document_type)
         VALUES ($1, $2, $3, $4, $5, 'approved', 'certification') RETURNING *`,
        [workerId, result.secure_url, result.public_id, documentName, req.file.mimetype]
      );

      res.json({ success: true, certification: dbResult.rows[0] });
    } catch (error) {
      logger.error('Admin upload worker certification error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to upload certification: ' + error.message });
    }
  });

  // Upload profile photo for a worker (admin only)
  router.post('/upload-worker-photo/:workerId', requireAuth, adminOnly, adminUpload.single('profilePhoto'), async (req, res) => {
    try {
      const workerId = req.params.workerId;

      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

      // Delete old photo from Cloudinary if exists
      const existing = await pool.query('SELECT cloudinary_profile_id FROM workers WHERE id = $1', [workerId]);
      if (existing.rows[0]?.cloudinary_profile_id) {
        try { await cloudinary.uploader.destroy(existing.rows[0].cloudinary_profile_id); } catch (e) {}
      }

      const result = await uploadToCloudinary(req.file.buffer, {
        folder: 'fixxa/profile-pictures',
        resource_type: 'image',
        public_id: `worker-admin-${workerId}-${Date.now()}`,
        transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }]
      });

      await pool.query(
        `UPDATE workers SET profile_picture = $1, cloudinary_profile_id = $2 WHERE id = $3`,
        [result.secure_url, result.public_id, workerId]
      );

      res.json({ success: true, profile_picture: result.secure_url });
    } catch (error) {
      logger.error('Admin upload worker photo error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to upload photo: ' + error.message });
    }
  });

  return router;
};
