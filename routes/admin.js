const express = require('express');
const router = express.Router();
const { cloudinary } = require('../config/cloudinary');

module.exports = (pool, logger, helpers) => {
  const { requireAuth, adminOnly } = require('../middleware/auth');
  const { formatTimeAgo } = helpers;

  // Get all workers (admin)
  router.get('/workers', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query('SELECT id, name, email, speciality, area, bio, experience, rating, profile_pic as image, availability_schedule, is_available, latitude, longitude, service_radius, is_active FROM workers ORDER BY name ASC');
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
          w.created_at,
          COUNT(DISTINCT b.id) as total_bookings,
          COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) as completed_bookings,
          COALESCE(AVG(r.overall_rating), 0) as rating
        FROM workers w
        LEFT JOIN bookings b ON w.id = b.worker_id
        LEFT JOIN reviews r ON w.id = r.worker_id
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
          w.created_at,
          COUNT(c.id) as cert_count,
          COUNT(CASE WHEN c.status = 'approved' THEN 1 END) as approved_cert_count
        FROM workers w
        LEFT JOIN certifications c ON w.id = c.worker_id
        WHERE w.approval_status = 'pending'
        GROUP BY w.id
        ORDER BY w.created_at ASC
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

            console.log('Fixed URL for cert', cert.id, ':', cloudinaryFile.secure_url);
            return { ...cert, file_url: cloudinaryFile.secure_url };
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
      const { province, primary_suburb, secondary_areas } = req.body;
      const adminEmail = req.session.user.email;

      // Get worker details for email
      const workerResult = await pool.query(
        'SELECT name, email FROM workers WHERE id = $1',
        [id]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      // Check if worker has any approved certifications
      const certResult = await pool.query(
        'SELECT COUNT(*) FROM certifications WHERE worker_id = $1 AND status = $2',
        [id, 'approved']
      );

      const hasApprovedCerts = parseInt(certResult.rows[0].count) > 0;

      // Build update query dynamically based on provided suburb data
      let updateQuery = `UPDATE workers
         SET approval_status = 'approved',
             is_active = true,
             is_verified = $1,
             approval_date = NOW(),
             approved_by = $2,
             verification_date = CASE WHEN $1 = true THEN NOW() ELSE verification_date END`;

      const params = [hasApprovedCerts, adminEmail];
      let paramIndex = 3;

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
        params.push(secondary_areas); // Already an array
        paramIndex++;
      }

      updateQuery += ` WHERE id = $${paramIndex}`;
      params.push(id);

      // Update worker status with corrected suburb data
      await pool.query(updateQuery, params);

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
      logger.error('Error approving worker', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to approve worker' });
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

      // Get worker details
      const workerResult = await pool.query(
        `SELECT * FROM workers WHERE id = $1`,
        [workerId]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      // Check what's missing from the profile
      const missingItems = [];

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

      logger.info('Incomplete profile email sent by admin', {
        workerId,
        workerEmail: worker.email,
        adminEmail,
        missingItems
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

      // Try different resource types to find where the PDF is actually stored
      const resourceTypes = ['raw', 'image', 'video', 'auto'];
      let signedUrl = null;

      for (const resourceType of resourceTypes) {
        try {
          console.log(`Trying resource_type: ${resourceType} for ${cloudinary_id}`);

          // For 'raw' type, don't specify format
          if (resourceType === 'raw') {
            signedUrl = cloudinary.utils.private_download_url(cloudinary_id, null, {
              resource_type: 'raw',
              expires_at: Math.floor(Date.now() / 1000) + 3600
            });
          } else {
            signedUrl = cloudinary.utils.private_download_url(cloudinary_id, 'pdf', {
              resource_type: resourceType,
              expires_at: Math.floor(Date.now() / 1000) + 3600
            });
          }

          console.log(`Generated signed URL with ${resourceType}:`, signedUrl);

          // Test if this URL works by redirecting
          return res.redirect(signedUrl);
        } catch (error) {
          console.log(`Failed with resource_type ${resourceType}:`, error.message);
          continue;
        }
      }

      // If we get here, none of the resource types worked
      throw new Error('Could not generate signed URL with any resource type');
    } catch (error) {
      console.error('PDF proxy error:', error);
      logger.error('Failed to serve PDF', { error: error.message, certId: req.params.certId });
      res.status(500).json({ success: false, error: 'Failed to retrieve PDF. The file may need to be re-uploaded.' });
    }
  });

  // Delete all broken certifications for a worker (admin only)
  router.delete('/worker/:workerId/certifications', requireAuth, adminOnly, async (req, res) => {
    try {
      const { workerId } = req.params;

      // Delete all certifications for this worker
      const result = await pool.query(
        'DELETE FROM certifications WHERE worker_id = $1 RETURNING id, document_name',
        [workerId]
      );

      logger.info('Admin deleted broken certifications', {
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

  return router;
};
