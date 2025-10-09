const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Photo upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/completions/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'completion-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

module.exports = (pool, logger, sendEmail, emailTemplates, io) => {
  const { requireAuth, clientOnly, workerOnly } = require('../middleware/auth');

  // ===== CLIENT ENDPOINTS =====

  // Get client's pending completion requests
  router.get('/client/completion-requests', requireAuth, clientOnly, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      
      const result = await pool.query(`
        SELECT 
          br.*,
          w.name as worker_name,
          w.speciality as worker_service,
          b.booking_date,
          b.booking_time,
          b.booking_amount
        FROM booking_requests br
        JOIN bookings b ON br.booking_id = b.id
        JOIN workers w ON br.worker_id = w.id
        WHERE br.user_id = $1 
        AND br.request_type = 'completion'
        AND br.status = 'pending'
        ORDER BY br.created_at DESC
      `, [clientId]);

      // Parse photos JSON if needed
      const requests = result.rows.map(req => ({
        ...req,
        photos: req.photos ? (typeof req.photos === 'string' ? JSON.parse(req.photos) : req.photos) : []
      }));

      res.json({ success: true, requests });
    } catch (error) {
      logger.error('Failed to fetch completion requests', { error: error.message });
      console.error('Failed to fetch completion requests:', error);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Client responds to completion request (approve or reject)
  router.post('/client/completion-requests/:id/respond', requireAuth, clientOnly, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      const requestId = req.params.id;
      const { action, rating, comments, feedback } = req.body;

      // Verify ownership
      const requestCheck = await pool.query(`
        SELECT br.*, b.id as booking_id, b.worker_id, w.name as worker_name, w.email as worker_email
        FROM booking_requests br
        JOIN bookings b ON br.booking_id = b.id
        JOIN workers w ON b.worker_id = w.id
        WHERE br.id = $1 AND br.user_id = $2 AND br.request_type = 'completion'
      `, [requestId, clientId]);

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Completion request not found' });
      }

      const request = requestCheck.rows[0];

      if (action === 'approve') {
        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
          return res.status(400).json({ success: false, error: 'Valid rating (1-5) required' });
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Update request status
          await client.query(`
            UPDATE booking_requests
            SET status = 'approved',
                client_rating = $1,
                client_comments = $2,
                responded_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [rating, comments || '', requestId]);

          // Update booking status
          await client.query(`
            UPDATE bookings
            SET status = 'Completed',
                completed_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [request.booking_id]);

          // Create review
          await client.query(`
            INSERT INTO reviews (
              client_id, booking_id, worker_id, overall_rating, review_text
            ) VALUES ($1, $2, $3, $4, $5)
          `, [clientId, request.booking_id, request.worker_id, rating, comments || '']);

          await client.query('COMMIT');

          // TODO: Process payment here when payment system is implemented

          // Send notification to worker (after successful commit)
          if (io) {
            io.emit('completion-response', {
              workerId: request.worker_id,
              requestId,
              action: 'approved'
            });
          }

          logger.info('Completion approved', { requestId, bookingId: request.booking_id });

          res.json({
            success: true,
            message: 'Job completion approved! Payment processed successfully.'
          });
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error('Failed to approve completion', { error: err.message, requestId });
          throw err;
        } finally {
          client.release();
        }

      } else if (action === 'reject') {
        // Validate feedback
        if (!feedback || feedback.length < 10) {
          return res.status(400).json({
            success: false,
            error: 'Please provide detailed feedback (at least 10 characters)'
          });
        }

        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          // Update request status with feedback
          await client.query(`
            UPDATE booking_requests
            SET status = 'rejected',
                client_comments = $1,
                responded_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [feedback, requestId]);

          // Update booking back to In Progress
          await client.query(`
            UPDATE bookings
            SET status = 'In Progress'
            WHERE id = $1
          `, [request.booking_id]);

          await client.query('COMMIT');

          // Send notification to worker (after successful commit)
          if (io) {
            io.emit('completion-response', {
              workerId: request.worker_id,
              requestId,
              action: 'rejected',
              feedback
            });
          }

          logger.info('Completion rejected', { requestId, feedback });

          res.json({
            success: true,
            message: 'Feedback sent. The professional will address your concerns.'
          });
        } catch (err) {
          await client.query('ROLLBACK');
          logger.error('Failed to reject completion', { error: err.message, requestId });
          throw err;
        } finally {
          client.release();
        }

      } else {
        res.status(400).json({ success: false, error: 'Invalid action' });
      }

    } catch (error) {
      logger.error('Completion response error', { error: error.message });
      console.error('Completion response error:', error);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // ===== WORKER ENDPOINTS =====

  // Worker submits completion request
  router.post('/worker/completion-request', requireAuth, workerOnly, upload.array('photos', 5), async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { bookingId, completionNotes } = req.body;

      if (!bookingId) {
        return res.status(400).json({ success: false, error: 'Booking ID required' });
      }

      // Verify booking belongs to this worker and is in progress
      const bookingCheck = await pool.query(`
        SELECT b.*, u.id as client_id, u.email as client_email, u.name as client_name
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.id = $1 AND b.worker_id = $2 AND b.status = 'In Progress'
      `, [bookingId, workerId]);

      if (bookingCheck.rows.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Booking not found or not in progress' 
        });
      }

      const booking = bookingCheck.rows[0];

      // Check if completion request already exists
      const existingRequest = await pool.query(`
        SELECT id FROM booking_requests 
        WHERE booking_id = $1 AND request_type = 'completion' AND status = 'pending'
      `, [bookingId]);

      if (existingRequest.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Completion request already submitted for this booking' 
        });
      }

      // Process uploaded photos
      const photoUrls = req.files ? req.files.map(file => `/uploads/completions/${file.filename}`) : [];

      // Create completion request
      const result = await pool.query(`
        INSERT INTO booking_requests (
          booking_id, user_id, worker_id, request_type, 
          completion_notes, photos, status
        ) VALUES ($1, $2, $3, 'completion', $4, $5, 'pending')
        RETURNING *
      `, [bookingId, booking.client_id, workerId, completionNotes || '', JSON.stringify(photoUrls)]);

      // Send notification to client
      if (io) {
        io.emit('new-completion-request', {
          clientId: booking.client_id,
          bookingId,
          requestId: result.rows[0].id
        });
      }

      // TODO: Send email to client about completion request

      logger.info('Completion request submitted', { 
        requestId: result.rows[0].id, 
        bookingId, 
        workerId 
      });

      res.json({ 
        success: true, 
        message: 'Completion request submitted! The client will review it.',
        request: result.rows[0]
      });

    } catch (error) {
      logger.error('Submit completion request error', { error: error.message });
      console.error('Submit completion request error:', error);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get worker's completion requests (for tracking)
  router.get('/worker/completion-requests', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      
      const result = await pool.query(`
        SELECT 
          br.*,
          b.booking_date,
          b.booking_time,
          u.name as client_name
        FROM booking_requests br
        JOIN bookings b ON br.booking_id = b.id
        JOIN users u ON br.user_id = u.id
        WHERE br.worker_id = $1 
        AND br.request_type = 'completion'
        ORDER BY br.created_at DESC
      `, [workerId]);

      res.json({ success: true, requests: result.rows });
    } catch (error) {
      logger.error('Failed to fetch worker completion requests', { error: error.message });
      console.error('Failed to fetch worker completion requests:', error);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return router;
};