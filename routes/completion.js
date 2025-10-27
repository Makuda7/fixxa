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

          // Generate receipt if quote was accepted
          try {
            const quoteCheck = await pool.query(
              'SELECT * FROM quotes WHERE booking_id = $1 AND status = $2',
              [request.booking_id, 'accepted']
            );

            if (quoteCheck.rows.length > 0) {
              const quote = quoteCheck.rows[0];

              // Create receipt
              await pool.query(`
                INSERT INTO receipts (
                  booking_id, quote_id, worker_id, client_id,
                  line_items, subtotal, tax_amount, total_amount,
                  payment_method, payment_status, emailed_to
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              `, [
                request.booking_id,
                quote.id,
                request.worker_id,
                clientId,
                quote.line_items,
                quote.subtotal,
                quote.tax_amount,
                quote.total_amount,
                'pending', // payment_method - set when client pays
                'pending', // payment_status
                null // emailed_at - will be set when email is sent
              ]);

              // Get receipt number for email
              const receiptResult = await pool.query(
                'SELECT * FROM receipts WHERE booking_id = $1 ORDER BY created_at DESC LIMIT 1',
                [request.booking_id]
              );

              if (receiptResult.rows.length > 0) {
                const receipt = receiptResult.rows[0];

                // Get client details
                const clientDetails = await pool.query(
                  'SELECT email, name FROM users WHERE id = $1',
                  [clientId]
                );

                if (clientDetails.rows.length > 0) {
                  const clientEmail = clientDetails.rows[0].email;
                  const clientName = clientDetails.rows[0].name;

                  // Send receipt email
                  const receiptEmailContent = emailTemplates.createJobCompletionReceiptEmail(
                    clientName,
                    request.worker_name,
                    {
                      receipt_number: receipt.receipt_number,
                      line_items: typeof receipt.line_items === 'string'
                        ? JSON.parse(receipt.line_items)
                        : receipt.line_items,
                      total_amount: receipt.total_amount,
                      payment_status: receipt.payment_status
                    }
                  );

                  try {
                    await sendEmail(clientEmail, receiptEmailContent.subject, receiptEmailContent.html);

                    // Update receipt with email sent timestamp
                    await pool.query(
                      'UPDATE receipts SET emailed_to = $1, emailed_at = NOW() WHERE id = $2',
                      [clientEmail, receipt.id]
                    );

                    logger.info('Receipt generated and emailed', {
                      receiptId: receipt.id,
                      receiptNumber: receipt.receipt_number,
                      bookingId: request.booking_id
                    });
                  } catch (emailError) {
                    logger.error('Failed to send receipt email', {
                      error: emailError.message,
                      receiptId: receipt.id
                    });
                  }
                }
              }
            }
          } catch (receiptError) {
            logger.error('Failed to generate receipt', {
              error: receiptError.message,
              bookingId: request.booking_id
            });
            // Don't fail completion if receipt generation fails
          }

          // Send notification to worker (after successful commit)
          if (io) {
            io.emit('completion-response', {
              workerId: request.worker_id,
              requestId,
              action: 'approved'
            });
          }

          // Get client details for email
          const clientDetails = await pool.query(`
            SELECT u.email, u.name FROM users u WHERE u.id = $1
          `, [clientId]);

          if (clientDetails.rows.length > 0) {
            const clientEmail = clientDetails.rows[0].email;
            const clientName = clientDetails.rows[0].name;

            // Send completion confirmation email with review link
            const reviewUrl = `${process.env.BASE_URL || 'https://fixxa-app-production.up.railway.app'}/clientProfile.html#reviews`;

            const emailSubject = `✅ Job Completed - Review Your Experience with ${request.worker_name}`;
            const emailBody = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #228b22, #32cd32); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; font-size: 2rem;">✅ Job Completed!</h1>
                </div>

                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                  <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi ${clientName},</p>

                  <p style="font-size: 16px; color: #333; line-height: 1.6;">
                    Great news! Your job with <strong>${request.worker_name}</strong> has been marked as complete and approved.
                  </p>

                  <div style="background: white; border-left: 4px solid #228b22; padding: 20px; margin: 25px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 10px 0; color: #228b22;">📋 Job Details</h3>
                    <p style="margin: 5px 0; color: #555;"><strong>Professional:</strong> ${request.worker_name}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Date:</strong> ${new Date(request.booking_date).toLocaleDateString()}</p>
                    <p style="margin: 5px 0; color: #555;"><strong>Your Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
                  </div>

                  <div style="background: #e8f5e9; border: 2px solid #4caf50; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0 0 15px 0; color: #2e7d32;">📝 Share Your Experience</h3>
                    <p style="margin: 0 0 20px 0; color: #555; line-height: 1.6;">
                      Your feedback helps other clients make informed decisions and helps professionals improve their services.
                    </p>
                    <a href="${reviewUrl}"
                       style="display: inline-block; background: #228b22; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">
                      ⭐ Write a Review
                    </a>
                  </div>

                  <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #856404; font-size: 14px;">
                      <strong>💡 Why review?</strong><br>
                      • Help other clients find great professionals<br>
                      • Support quality work with positive feedback<br>
                      • Help professionals grow their business<br>
                      • Build a trusted community on Fixxa
                    </p>
                  </div>

                  <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                    Thank you for using Fixxa! We hope you're satisfied with the service.
                  </p>
                </div>
              </div>
            `;

            try {
              await sendEmail(clientEmail, emailSubject, emailBody);
              logger.info('Completion email sent to client', { clientId, bookingId: request.booking_id });
            } catch (emailError) {
              logger.error('Failed to send completion email', { error: emailError.message, clientId });
            }

            // Create in-app notification for review reminder
            try {
              await pool.query(`
                INSERT INTO notifications (user_id, booking_id, type, title, message, link)
                VALUES ($1, $2, 'review_reminder', $3, $4, $5)
              `, [
                clientId,
                request.booking_id,
                'Job Completed - Share Your Experience',
                `Your job with ${request.worker_name} is complete! Please take a moment to leave a review and help other clients.`,
                '/clientProfile.html#reviews'
              ]);
            } catch (notifError) {
              logger.error('Failed to create review reminder notification', { error: notifError.message });
            }
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