const express = require('express');
const router = express.Router();
const { createBookingValidation, updateBookingStatusValidation } = require('../middleware/validation');
const { bookingLimiter } = require('../middleware/rateLimiter');

module.exports = (pool, logger, sendEmail, emailTemplates, io, helpers) => {
  const { requireAuth, clientOnly, workerOnly } = require('../middleware/auth');
  const { containsContactInfo } = helpers;

  // Create booking - THIS MUST BE FIRST
  router.post('/', requireAuth, bookingLimiter, createBookingValidation, async (req, res) => {
    const { workerId, booking_date, booking_time, note } = req.body;
    if (!workerId || !booking_date || !booking_time)
      return res.status(400).json({ success: false, error: 'Missing required fields' });

    // Check booking note for contact information
    if (note && note.trim()) {
      const filterResult = containsContactInfo(note);
      if (filterResult.blocked) {
        return res.status(400).json({
          success: false,
          error: 'Booking notes cannot contain contact information. Please keep all communication on the platform.',
          blockedReason: filterResult.reason
        });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert booking with Pending status (requires worker approval)
      const result = await client.query(
        `INSERT INTO bookings (user_id, worker_id, booking_date, booking_time, note, status, payment_method, booking_amount, payment_status)
         VALUES ($1, $2, $3, $4, $5, 'Pending', $6, $7, 'pending') RETURNING *`,
        [req.session.user.id, workerId, booking_date, booking_time, note || '', req.body.payment_method || null, req.body.booking_amount || null]
      );

      const booking = result.rows[0];

      // Get client and professional details for emails
      const clientResult = await client.query('SELECT name, email FROM users WHERE id = $1', [req.session.user.id]);
      const professionalResult = await client.query('SELECT name, email FROM workers WHERE id = $1', [workerId]);

      if (clientResult.rows.length === 0 || professionalResult.rows.length === 0) {
        throw new Error('Client or worker not found');
      }

      const clientData = clientResult.rows[0];
      const professional = professionalResult.rows[0];

      await client.query('COMMIT');

      // Send emails after successful commit (non-critical operations)
      const emails = emailTemplates.createBookingConfirmationEmail(booking, clientData.name, professional.name, professional.email);

      sendEmail(clientData.email, emails.client.subject, emails.client.html, logger).catch(err =>
        logger.error('Failed to send booking confirmation to client', { error: err.message })
      );

      sendEmail(professional.email, emails.professional.subject, emails.professional.html, logger).catch(err =>
        logger.error('Failed to send booking confirmation to professional', { error: err.message })
      );

      if (io) {
        io.emit('new-booking', { booking });
      }

      logger.info('Booking created successfully', { bookingId: booking.id, workerId, clientId: req.session.user.id });
      res.json({ success: true, booking });
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error('Booking creation failed', { error: err.message, code: err.code, stack: err.stack });
      console.error('Booking error:', err);

      if (err.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'This time slot is already booked. Please choose a different time.'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Unable to create booking. Please try again.'
      });
    } finally {
      client.release();
    }
  });

  // Get client bookings
  router.get('/', requireAuth, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      const result = await pool.query(
        `SELECT b.*,
                w.name AS professional_name,
                w.speciality AS professional_service
         FROM bookings b
         JOIN workers w ON b.worker_id = w.id
         WHERE b.user_id = $1
         ORDER BY b.booking_date DESC, b.booking_time DESC`,
        [clientId]
      );

      res.json({ success: true, bookings: result.rows });
    } catch (err) {
      logger.error('Failed to fetch bookings', { error: err.message });
      console.error('Failed to fetch bookings:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Get worker bookings with 48-hour priority sorting
  router.get('/worker', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const result = await pool.query(
        `SELECT b.*,
                u.name AS client_name,
                u.email AS client_email,
                EXTRACT(EPOCH FROM (b.booking_date + b.booking_time::time - NOW())) / 3600 AS hours_until_booking
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         WHERE b.worker_id = $1
         ORDER BY
           CASE
             WHEN b.status IN ('Confirmed', 'In Progress')
                  AND b.booking_date + b.booking_time::time <= NOW() + INTERVAL '48 hours'
                  AND b.booking_date + b.booking_time::time > NOW()
             THEN 0
             ELSE 1
           END,
           b.booking_date ASC,
           b.booking_time ASC`,
        [workerId]
      );

      // Categorize bookings
      const now = new Date();
      const fortyEightHoursFromNow = new Date(now.getTime() + (48 * 60 * 60 * 1000));

      const bookings = result.rows.map(booking => {
        const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
        const isPriority = bookingDateTime <= fortyEightHoursFromNow &&
                          bookingDateTime > now &&
                          ['Confirmed', 'In Progress'].includes(booking.status);

        return {
          ...booking,
          is_priority: isPriority,
          hours_until: Math.round(booking.hours_until_booking * 10) / 10
        };
      });

      res.json({ success: true, bookings });
    } catch (err) {
      logger.error('Failed to fetch worker bookings', { error: err.message });
      console.error('Failed to fetch worker bookings:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Get single booking details (for both clients and workers)
  router.get('/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.type;
      const bookingId = req.params.id;

      // Different query based on user type
      let query;
      let params;

      if (userType === 'professional') {
        // Worker viewing their booking
        query = `
          SELECT b.*,
                 u.name AS client_name,
                 u.email AS client_email,
                 u.phone AS client_phone,
                 w.name AS worker_name,
                 w.speciality AS worker_speciality,
                 w.phone AS worker_phone
          FROM bookings b
          JOIN users u ON b.user_id = u.id
          JOIN workers w ON b.worker_id = w.id
          WHERE b.id = $1 AND b.worker_id = $2
        `;
        params = [bookingId, userId];
      } else {
        // Client viewing their booking
        query = `
          SELECT b.*,
                 u.name AS client_name,
                 w.name AS worker_name,
                 w.speciality AS worker_speciality,
                 w.phone AS worker_phone,
                 w.email AS worker_email,
                 CASE WHEN r.id IS NOT NULL THEN true ELSE false END AS has_review
          FROM bookings b
          JOIN users u ON b.user_id = u.id
          JOIN workers w ON b.worker_id = w.id
          LEFT JOIN reviews r ON r.booking_id = b.id
          WHERE b.id = $1 AND b.user_id = $2
        `;
        params = [bookingId, userId];
      }

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found'
        });
      }

      const booking = result.rows[0];

      // Add service_type field if not present
      if (!booking.service_type && booking.service) {
        booking.service_type = booking.service;
      } else if (!booking.service_type && booking.worker_speciality) {
        booking.service_type = booking.worker_speciality;
      }

      logger.info('Booking details fetched', { bookingId, userId, userType });
      res.json({ success: true, booking });
    } catch (err) {
      logger.error('Failed to fetch booking details', {
        error: err.message,
        bookingId: req.params.id
      });
      console.error('Failed to fetch booking details:', err);
      res.status(500).json({
        success: false,
        error: 'Database error',
        detail: err.message
      });
    }
  });

  // Reschedule booking - with 48-hour validation and approval required
  router.post('/:id/reschedule', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const bookingId = req.params.id;
      const { bookingDate, bookingTime, reason } = req.body;

      if (!bookingDate || !bookingTime)
        return res.status(400).json({ success: false, error: 'Missing new date/time' });

      // Get booking details with names and emails
      const bookingResult = await pool.query(
        `SELECT b.*, u.name as client_name, u.email as client_email,
                w.name as professional_name, w.email as professional_email
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN workers w ON b.worker_id = w.id
         WHERE b.id = $1`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingResult.rows[0];

      if (booking.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Check 48-hour restriction
      const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
      const now = new Date();
      const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

      if (hoursUntilBooking < 48) {
        return res.status(400).json({
          success: false,
          error: 'Reschedule must be requested at least 48 hours before the original booking time',
          hoursTooLate: Math.round(48 - hoursUntilBooking)
        });
      }

      // Create reschedule request for worker approval
      const requestData = {
        newDate: bookingDate,
        newTime: bookingTime,
        originalDate: booking.booking_date,
        originalTime: booking.booking_time,
        reason: reason || 'Schedule conflict'
      };

      await pool.query(
        `INSERT INTO booking_requests (booking_id, user_id, worker_id, request_type, completion_notes)
         VALUES ($1, $2, $3, 'pending-reschedule', $4)`,
        [bookingId, userId, booking.worker_id, JSON.stringify(requestData)]
      );

      // Update booking status to show pending reschedule
      await pool.query(
        `UPDATE bookings SET status = 'Pending Reschedule' WHERE id = $1`,
        [bookingId]
      );

      // Send notification email to professional
      const professionalEmail = emailTemplates.createRescheduleEmail(booking, booking.professional_name, bookingDate, bookingTime, false);
      sendEmail(booking.professional_email, professionalEmail.subject, professionalEmail.html, logger).catch(err =>
        logger.error('Failed to send reschedule request email to professional', { error: err.message })
      );

      if (io) {
        io.emit('booking-updated', {
          bookingId,
          status: 'Pending Reschedule',
          worker_id: booking.worker_id
        });
        io.emit('new-reschedule-request', {
          bookingId,
          worker_id: booking.worker_id,
          client_name: booking.client_name,
          newDate: bookingDate,
          newTime: bookingTime
        });
      }

      logger.info('Reschedule request created', { bookingId, newDate: bookingDate, newTime: bookingTime });
      res.json({
        success: true,
        message: 'Reschedule request sent to professional. They will review and respond soon.',
        requiresApproval: true
      });
    } catch (err) {
      logger.error('Reschedule booking error', { error: err.message });
      console.error('Reschedule booking error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Cancel booking - with inline ownership check
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const bookingId = req.params.id;

      // Get booking details and verify ownership
      const bookingResult = await pool.query(
        `SELECT b.*, u.name as client_name, u.email as client_email, 
                w.name as professional_name, w.email as professional_email
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN workers w ON b.worker_id = w.id
         WHERE b.id = $1`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingResult.rows[0];
      
      if (booking.user_id !== userId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      await pool.query(
        `UPDATE bookings SET status='Cancelled', cancelled_by='client' WHERE id=$1`,
        [bookingId]
      );

      // Send cancellation emails
      const clientEmail = emailTemplates.createCancellationEmail(booking, booking.client_name, 'client', true);
      const professionalEmail = emailTemplates.createCancellationEmail(booking, booking.professional_name, 'client', false);
      
      sendEmail(booking.client_email, clientEmail.subject, clientEmail.html, logger).catch(err => 
        logger.error('Failed to send cancellation email to client', { error: err.message })
      );
      
      sendEmail(booking.professional_email, professionalEmail.subject, professionalEmail.html, logger).catch(err => 
        logger.error('Failed to send cancellation email to professional', { error: err.message })
      );

      if (io) {
        io.emit('booking-updated', { 
          bookingId, 
          status: 'Cancelled', 
          user_id: userId
        });
      }

      res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (err) {
      logger.error('Cancel booking error', { error: err.message });
      console.error('Cancel booking error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Complete booking (worker) - with inline ownership check
  router.post('/worker/:id/complete', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const bookingId = req.params.id;

      // Get booking details and verify ownership
      const bookingResult = await pool.query(
        `SELECT b.*, u.name as client_name, u.email as client_email, 
                w.name as professional_name, w.email as professional_email
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN workers w ON b.worker_id = w.id
         WHERE b.id = $1`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingResult.rows[0];
      
      if (booking.worker_id !== workerId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      await pool.query(
        `UPDATE bookings SET status='Awaiting Client Confirmation', completed_at=CURRENT_TIMESTAMP WHERE id=$1`,
        [bookingId]
      );

      // Send completion email to client
      const completionEmail = emailTemplates.createCompletionEmail(booking, booking.client_name, booking.professional_name);
      sendEmail(booking.client_email, completionEmail.subject, completionEmail.html, logger).catch(err =>
        logger.error('Failed to send completion email to client', { error: err.message })
      );

      if (io) {
        io.emit('booking-updated', {
          bookingId,
          status: 'Awaiting Client Confirmation',
          workerId: workerId
        });
      }

      res.json({ success: true, message: 'Booking marked as awaiting client confirmation' });
    } catch (err) {
      logger.error('Complete booking error', { error: err.message });
      console.error('Complete booking error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Client approves job completion
  router.post('/:bookingId/approve-completion', requireAuth, clientOnly, async (req, res) => {
    const bookingId = req.params.bookingId;
    const userId = req.session.user.id;

    try {
      // Verify booking exists and belongs to this client
      const bookingResult = await pool.query(
        'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
        [bookingId, userId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingResult.rows[0];

      // Only allow approval if status is "Awaiting Client Confirmation"
      if (booking.status !== 'Awaiting Client Confirmation') {
        return res.status(400).json({
          success: false,
          error: 'This booking is not awaiting confirmation'
        });
      }

      // Update booking status to Completed
      await pool.query(
        `UPDATE bookings SET status='Completed', completed_at=CURRENT_TIMESTAMP WHERE id=$1`,
        [bookingId]
      );

      // Emit socket event for real-time update
      if (io) {
        io.emit('booking-updated', {
          bookingId,
          status: 'Completed',
          userId: userId
        });
      }

      res.json({ success: true, message: 'Job completion confirmed' });
    } catch (err) {
      logger.error('Approve completion error', { error: err.message });
      console.error('Approve completion error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Update booking (worker) - with inline ownership check
  router.post('/worker/update/:bookingId', requireAuth, workerOnly, async (req, res) => {
    const bookingId = req.params.bookingId;
    const workerId = req.session.user.id;
    const { datetime, booking_date, booking_time, status } = req.body;

    if (!datetime && !booking_date && !booking_time && !status) {
      return res.status(400).json({ success: false, error: 'Nothing to update' });
    }

    try {
      // Get current booking details with user info
      const bookingResult = await pool.query(
        `SELECT b.*, u.name as client_name, u.email as client_email,
                w.name as professional_name, w.email as professional_email
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN workers w ON b.worker_id = w.id
         WHERE b.id = $1`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingResult.rows[0];

      if (booking.worker_id !== workerId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const oldStatus = booking.status;
      const updates = [];
      const values = [];
      let idx = 1;

      if (datetime) {
        const dt = new Date(datetime);
        if (isNaN(dt.getTime())) return res.status(400).json({ success: false, error: 'Invalid datetime' });
        const dateStr = dt.toISOString().slice(0,10);
        const timeStr = dt.toTimeString().slice(0,5);
        updates.push(`booking_date = $${idx++}`);
        values.push(dateStr);
        updates.push(`booking_time = $${idx++}`);
        values.push(timeStr);
      } else {
        if (booking_date) { updates.push(`booking_date = $${idx++}`); values.push(booking_date); }
        if (booking_time) { updates.push(`booking_time = $${idx++}`); values.push(booking_time); }
      }

      if (status) { updates.push(`status = $${idx++}`); values.push(status); }

      values.push(bookingId);
      const query = `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const updateRes = await pool.query(query, values);

      if (updateRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Booking not updated' });

      const updated = updateRes.rows[0];

      // Send email notification on status change
      if (status && status !== oldStatus) {
        const statusEmail = emailTemplates.createStatusChangeEmail(updated, booking.client_name, oldStatus, status, true);
        sendEmail(booking.client_email, statusEmail.subject, statusEmail.html, logger).catch(err =>
          logger.error('Failed to send status change email', { error: err.message })
        );
      }

      // Send reschedule email if date/time changed
      if (booking_date || booking_time || datetime) {
        const newDate = updated.booking_date;
        const newTime = updated.booking_time;
        const rescheduleEmail = emailTemplates.createRescheduleEmail(updated, booking.client_name, newDate, newTime, true);
        sendEmail(booking.client_email, rescheduleEmail.subject, rescheduleEmail.html, logger).catch(err =>
          logger.error('Failed to send reschedule email', { error: err.message })
        );
      }

      if (io) {
        io.emit('booking-updated', {
          bookingId: updated.id,
          worker_id: updated.worker_id,
          user_id: updated.user_id,
          status: updated.status,
          booking_date: updated.booking_date,
          booking_time: updated.booking_time
        });
      }

      res.json({ success: true, booking: updated });
    } catch (err) {
      logger.error('Update booking error', { error: err.message });
      console.error('Update booking error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Mark payment as received (worker only)
  router.post('/:id/mark-paid', requireAuth, workerOnly, async (req, res) => {
    try {
      const bookingId = req.params.id;
      const workerId = req.session.user.id;
      const { payment_method, payment_notes } = req.body;

      // Validate payment method
      if (!payment_method || !['cash', 'eft'].includes(payment_method)) {
        return res.status(400).json({
          success: false,
          error: 'Payment method must be either cash or eft'
        });
      }

      // Get booking and verify ownership
      const bookingResult = await pool.query(
        `SELECT b.*, u.name as client_name, u.email as client_email,
                w.name as professional_name
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN workers w ON b.worker_id = w.id
         WHERE b.id = $1`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingResult.rows[0];

      if (booking.worker_id !== workerId) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      // Only allow marking as paid if booking is completed
      if (booking.status !== 'Completed') {
        return res.status(400).json({
          success: false,
          error: 'Can only mark completed bookings as paid'
        });
      }

      // Update payment status
      await pool.query(
        `UPDATE bookings
         SET payment_status = 'paid',
             payment_method = $1,
             payment_notes = $2,
             paid_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [payment_method, payment_notes || '', bookingId]
      );

      // Send confirmation email to client
      const paymentEmail = {
        subject: 'Payment Confirmed - Fixxa',
        html: `
          <h2>Payment Confirmed</h2>
          <p>Hi ${booking.client_name},</p>
          <p>${booking.professional_name} has confirmed receipt of your payment for the booking on ${new Date(booking.booking_date).toLocaleDateString()} at ${booking.booking_time}.</p>
          <p><strong>Payment Method:</strong> ${payment_method.toUpperCase()}</p>
          ${payment_notes ? `<p><strong>Notes:</strong> ${payment_notes}</p>` : ''}
          ${booking.booking_amount ? `<p><strong>Amount:</strong> R${booking.booking_amount}</p>` : ''}
          <p>Thank you for using Fixxa!</p>
        `
      };

      sendEmail(booking.client_email, paymentEmail.subject, paymentEmail.html, logger).catch(err =>
        logger.error('Failed to send payment confirmation email', { error: err.message })
      );

      if (io) {
        io.emit('payment-updated', {
          bookingId,
          payment_status: 'paid',
          user_id: booking.user_id,
          worker_id: workerId
        });
      }

      logger.info('Payment marked as received', { bookingId, payment_method, workerId });
      res.json({
        success: true,
        message: 'Payment marked as received',
        payment_status: 'paid'
      });
    } catch (err) {
      logger.error('Mark paid error', { error: err.message });
      console.error('Mark paid error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Update payment method (client or worker)
  router.post('/:id/update-payment', requireAuth, async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.session.user.id;
      const { payment_method, booking_amount } = req.body;

      // Validate payment method
      if (payment_method && !['cash', 'eft', 'online'].includes(payment_method)) {
        return res.status(400).json({ success: false, error: 'Invalid payment method' });
      }

      // Get booking and verify ownership
      const bookingResult = await pool.query(
        `SELECT * FROM bookings WHERE id = $1 AND (user_id = $2 OR worker_id = $2)`,
        [bookingId, userId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found or not authorized' });
      }

      const booking = bookingResult.rows[0];

      // Build update query
      const updates = [];
      const values = [];
      let idx = 1;

      if (payment_method) {
        updates.push(`payment_method = $${idx++}`);
        values.push(payment_method);
      }

      if (booking_amount !== undefined) {
        updates.push(`booking_amount = $${idx++}`);
        values.push(booking_amount);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'Nothing to update' });
      }

      values.push(bookingId);
      const query = `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
      const result = await pool.query(query, values);

      if (io) {
        io.emit('payment-updated', {
          bookingId,
          payment_method,
          booking_amount,
          user_id: booking.user_id,
          worker_id: booking.worker_id
        });
      }

      logger.info('Payment details updated', { bookingId, payment_method, booking_amount });
      res.json({ success: true, booking: result.rows[0] });
    } catch (err) {
      logger.error('Update payment error', { error: err.message });
      console.error('Update payment error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Raise payment dispute (client or worker)
  router.post('/:id/dispute-payment', requireAuth, async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.session.user.id;
      const userType = req.session.user.type;
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Dispute reason is required' });
      }

      // Get booking and verify ownership
      const bookingResult = await pool.query(
        `SELECT b.*, u.name as client_name, u.email as client_email,
                w.name as professional_name, w.email as professional_email
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN workers w ON b.worker_id = w.id
         WHERE b.id = $1 AND (b.user_id = $2 OR b.worker_id = $2)`,
        [bookingId, userId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found or not authorized' });
      }

      const booking = bookingResult.rows[0];
      const raised_by = userType === 'professional' ? 'worker' : 'client';

      // Create dispute record
      await pool.query(
        `INSERT INTO payment_disputes (booking_id, raised_by, reason)
         VALUES ($1, $2, $3)`,
        [bookingId, raised_by, reason]
      );

      // Update booking payment status
      await pool.query(
        `UPDATE bookings SET payment_status = 'disputed' WHERE id = $1`,
        [bookingId]
      );

      // Send notification emails
      const disputeEmail = {
        subject: 'Payment Dispute Raised - Fixxa',
        html: `
          <h2>Payment Dispute</h2>
          <p>A payment dispute has been raised for booking #${bookingId}</p>
          <p><strong>Raised by:</strong> ${raised_by === 'client' ? booking.client_name : booking.professional_name}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Our support team will review this dispute and contact both parties soon.</p>
        `
      };

      sendEmail(booking.client_email, disputeEmail.subject, disputeEmail.html, logger).catch(err =>
        logger.error('Failed to send dispute email to client', { error: err.message })
      );

      sendEmail(booking.professional_email, disputeEmail.subject, disputeEmail.html, logger).catch(err =>
        logger.error('Failed to send dispute email to professional', { error: err.message })
      );

      if (io) {
        io.emit('payment-dispute', {
          bookingId,
          raised_by,
          user_id: booking.user_id,
          worker_id: booking.worker_id
        });
      }

      logger.info('Payment dispute raised', { bookingId, raised_by, userId });
      res.json({
        success: true,
        message: 'Payment dispute raised. Support team will contact you soon.'
      });
    } catch (err) {
      logger.error('Raise dispute error', { error: err.message });
      console.error('Raise dispute error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Complete booking (client) - client approves completion
  router.post('/:id/complete', requireAuth, clientOnly, async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.session.user.id;
      const { rating, review_text } = req.body;

      // Verify booking belongs to this client
      const bookingCheck = await pool.query(
        `SELECT b.*, w.name as worker_name, w.email as worker_email
         FROM bookings b
         JOIN workers w ON b.worker_id = w.id
         WHERE b.id = $1 AND b.user_id = $2`,
        [bookingId, userId]
      );

      if (bookingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingCheck.rows[0];

      // Update booking status to completed
      await pool.query(
        `UPDATE bookings
         SET status = 'Completed', completed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [bookingId]
      );

      // Create review if rating provided
      if (rating && rating >= 1 && rating <= 5) {
        await pool.query(
          `INSERT INTO reviews (client_id, booking_id, worker_id, overall_rating, review_text)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, bookingId, booking.worker_id, rating, review_text || '']
        );
      }

      // Send completion email to worker
      const completionEmail = emailTemplates.createCompletionEmail(booking, booking.worker_name, booking.worker_name);
      sendEmail(booking.worker_email, completionEmail.subject, completionEmail.html, logger).catch(err =>
        logger.error('Failed to send completion email to worker', { error: err.message })
      );

      if (io) {
        io.emit('booking-updated', {
          bookingId,
          status: 'Completed',
          user_id: userId
        });
      }

      logger.info('Booking completed by client', { bookingId, userId });
      res.json({ success: true, message: 'Job marked as completed' });
    } catch (err) {
      logger.error('Complete booking error', { error: err.message });
      console.error('Complete booking error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Submit service address for accepted booking (client only)
  router.post('/:id/submit-address', requireAuth, clientOnly, async (req, res) => {
    try {
      const bookingId = req.params.id;
      const userId = req.session.user.id;
      const { service_address } = req.body;

      if (!service_address || !service_address.trim()) {
        return res.status(400).json({ success: false, error: 'Service address is required' });
      }

      // Verify booking belongs to this client and is confirmed
      const bookingCheck = await pool.query(
        'SELECT id, status FROM bookings WHERE id = $1 AND user_id = $2',
        [bookingId, userId]
      );

      if (bookingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingCheck.rows[0];
      if (booking.status !== 'Confirmed') {
        return res.status(400).json({
          success: false,
          error: 'Can only provide address for confirmed bookings'
        });
      }

      // Update booking with service address
      await pool.query(
        `UPDATE bookings
         SET service_address = $1, service_address_provided_at = NOW()
         WHERE id = $2`,
        [service_address.trim(), bookingId]
      );

      logger.info('Service address provided for booking', {
        bookingId,
        userId
      });

      res.json({
        success: true,
        message: 'Service address shared with professional successfully'
      });
    } catch (error) {
      logger.error('Error submitting service address', {
        error: error.message,
        bookingId: req.params.id
      });
      res.status(500).json({ success: false, error: 'Failed to submit address' });
    }
  });

  // Legacy endpoints
  router.post('/:id/request-reschedule', requireAuth, async (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Use /bookings/:id/reschedule endpoint instead',
      redirect: true
    });
  });

  router.post('/:id/request-cancellation', requireAuth, async (req, res) => {
    return res.status(200).json({
      success: true,
      message: 'Use DELETE /bookings/:id endpoint instead',
      redirect: true
    });
  });

  return router;
};