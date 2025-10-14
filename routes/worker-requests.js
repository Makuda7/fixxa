const express = require('express');
const router = express.Router();

module.exports = (pool, logger, sendEmail, emailTemplates, io) => {
  const { requireAuth, workerOnly } = require('../middleware/auth');

  // Get worker's booking requests (new bookings + reschedule/cancellation requests)
  router.get('/worker/booking-requests', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      // Get reschedule/cancellation requests
      const requestsResult = await pool.query(`
        SELECT
          br.*,
          b.booking_date,
          b.booking_time,
          b.note,
          b.status as booking_status,
          b.service,
          u.name as client_name,
          u.email as client_email,
          'change_request' as request_category
        FROM booking_requests br
        JOIN bookings b ON br.booking_id = b.id
        JOIN users u ON br.user_id = u.id
        WHERE br.worker_id = $1
        AND br.request_type IN ('reschedule', 'cancellation', 'pending-reschedule')
        AND br.status = 'pending'
      `, [workerId]);

      // Get pending new bookings (awaiting worker approval)
      const pendingBookingsResult = await pool.query(`
        SELECT
          b.id as booking_id,
          b.booking_date,
          b.booking_time,
          b.note,
          b.service,
          b.status as booking_status,
          b.created_at,
          u.name as client_name,
          u.email as client_email,
          'new_booking' as request_type,
          'new_booking' as request_category
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.worker_id = $1
        AND b.status = 'Pending'
        ORDER BY b.created_at DESC
      `, [workerId]);

      // Combine both types of requests
      const allRequests = [
        ...pendingBookingsResult.rows,
        ...requestsResult.rows
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      res.json({ success: true, requests: allRequests });
    } catch (error) {
      logger.error('Failed to fetch worker booking requests', { error: error.message });
      console.error('Failed to fetch worker booking requests:', error);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Worker responds to booking request (approve/reject)
  router.post('/worker/booking-requests/:id/respond', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const requestId = req.params.id;
      const { action } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action' });
      }

      // Verify this request belongs to this worker
      const requestCheck = await pool.query(`
        SELECT br.*, b.id as booking_id, b.user_id
        FROM booking_requests br
        JOIN bookings b ON br.booking_id = b.id
        WHERE br.id = $1 AND br.worker_id = $2
      `, [requestId, workerId]);

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      const request = requestCheck.rows[0];

      if (action === 'approve') {
        // Update request status
        await pool.query(`
          UPDATE booking_requests
          SET status = 'approved', resolved_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [requestId]);

        // Handle based on request type
        if (request.request_type === 'reschedule' || request.request_type === 'pending-reschedule') {
          // Parse reschedule data from completion_notes (which contains JSON)
          const rescheduleData = typeof request.completion_notes === 'string'
            ? JSON.parse(request.completion_notes)
            : request.completion_notes;

          await pool.query(`
            UPDATE bookings
            SET booking_date = $1, booking_time = $2, status = 'Confirmed'
            WHERE id = $3
          `, [rescheduleData.newDate, rescheduleData.newTime, request.booking_id]);
        } else if (request.request_type === 'cancellation') {
          await pool.query(`
            UPDATE bookings
            SET status = 'Cancelled', cancelled_by = 'client'
            WHERE id = $1
          `, [request.booking_id]);
        }

        if (io) {
          io.emit('booking-request-response', {
            clientId: request.user_id,
            requestId,
            action: 'approved',
            type: request.request_type,
            bookingId: request.booking_id
          });
        }

        res.json({ success: true, message: 'Request approved' });
      } else {
        // Reject - restore original status
        await pool.query(`
          UPDATE booking_requests
          SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [requestId]);

        // Restore booking to Confirmed status
        await pool.query(`
          UPDATE bookings
          SET status = 'Confirmed'
          WHERE id = $1
        `, [request.booking_id]);

        if (io) {
          io.emit('booking-request-response', {
            clientId: request.user_id,
            requestId,
            action: 'rejected',
            type: request.request_type,
            bookingId: request.booking_id
          });
        }

        res.json({ success: true, message: 'Request rejected' });
      }

    } catch (error) {
      logger.error('Worker booking request response error', { error: error.message });
      console.error('Worker booking request response error:', error);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Worker approves/declines new booking with optional reason
  router.post('/worker/booking/:bookingId/respond', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const bookingId = req.params.bookingId;
      const { action, declineReason } = req.body;

      if (!['approve', 'decline'].includes(action)) {
        return res.status(400).json({ success: false, error: 'Invalid action' });
      }

      // Verify this booking belongs to this worker and is pending
      const bookingCheck = await pool.query(`
        SELECT b.*, u.name as client_name, u.email as client_email
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.id = $1 AND b.worker_id = $2 AND b.status = 'Pending'
      `, [bookingId, workerId]);

      if (bookingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found or already processed' });
      }

      const booking = bookingCheck.rows[0];

      if (action === 'approve') {
        // Approve booking - change status to Confirmed
        await pool.query(`
          UPDATE bookings
          SET status = 'Confirmed', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [bookingId]);

        // Send approval email to client
        const approvalEmail = emailTemplates.createBookingApprovedEmail(
          booking,
          booking.client_name,
          req.session.user.name
        );
        sendEmail(booking.client_email, approvalEmail.subject, approvalEmail.html, logger).catch(err =>
          logger.error('Failed to send booking approval email', { error: err.message })
        );

        if (io) {
          io.emit('booking-approved', {
            clientId: booking.user_id,
            bookingId,
            workerName: req.session.user.name
          });
        }

        logger.info('Booking approved by worker', { bookingId, workerId });
        res.json({ success: true, message: 'Booking approved successfully' });

      } else {
        // Decline booking with reason
        const reason = declineReason || 'No reason provided';

        await pool.query(`
          UPDATE bookings
          SET status = 'Declined',
              cancellation_reason = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [reason, bookingId]);

        // Send decline email to client
        const declineEmail = emailTemplates.createBookingDeclinedEmail(
          booking,
          booking.client_name,
          req.session.user.name,
          reason
        );
        sendEmail(booking.client_email, declineEmail.subject, declineEmail.html, logger).catch(err =>
          logger.error('Failed to send booking decline email', { error: err.message })
        );

        if (io) {
          io.emit('booking-declined', {
            clientId: booking.user_id,
            bookingId,
            reason,
            workerName: req.session.user.name
          });
        }

        logger.info('Booking declined by worker', { bookingId, workerId, reason });
        res.json({ success: true, message: 'Booking declined', reason });
      }

    } catch (error) {
      logger.error('Worker booking response error', { error: error.message });
      console.error('Worker booking response error:', error);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return router;
};