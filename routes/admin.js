const express = require('express');
const router = express.Router();

module.exports = (pool, logger, helpers) => {
  const { requireAuth, adminOnly } = require('../middleware/auth');
  const { formatTimeAgo } = helpers;

  // Get all workers (admin)
  router.get('/workers', requireAuth, adminOnly, async (req, res) => {
    try {
      const result = await pool.query('SELECT id, name, email, speciality, area, bio, experience, rating, image, availability_schedule, is_available, latitude, longitude, service_radius, is_active FROM workers ORDER BY name ASC');
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
        JOIN users u ON r.client_id = u.id
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
          w.rating,
          w.is_active,
          w.created_at,
          COUNT(DISTINCT b.id) as total_bookings,
          COUNT(DISTINCT CASE WHEN b.status = 'Completed' THEN b.id END) as completed_bookings
        FROM workers w
        LEFT JOIN bookings b ON w.id = b.worker_id
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

  return router;
};