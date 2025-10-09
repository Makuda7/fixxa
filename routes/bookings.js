const express = require('express');
const router = express.Router();
const { createBookingValidation, updateBookingStatusValidation } = require('../middleware/validation');
const { bookingLimiter } = require('../middleware/rateLimiter');

module.exports = (pool, logger, sendEmail, emailTemplates, io) => {
  const { requireAuth, clientOnly, workerOnly } = require('../middleware/auth');

  // Create booking - THIS MUST BE FIRST
  router.post('/', requireAuth, bookingLimiter, createBookingValidation, async (req, res) => {
    const { workerId, booking_date, booking_time, note } = req.body;
    if (!workerId || !booking_date || !booking_time)
      return res.status(400).json({ success: false, error: 'Missing required fields' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert booking
      const result = await client.query(
        `INSERT INTO bookings (user_id, worker_id, booking_date, booking_time, note, status)
         VALUES ($1, $2, $3, $4, $5, 'Confirmed') RETURNING *`,
        [req.session.user.id, workerId, booking_date, booking_time, note || '']
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

  // Reschedule booking - with inline ownership check
  router.post('/:id/reschedule', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const bookingId = req.params.id;
      const { bookingDate, bookingTime } = req.body;

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

      await pool.query(
        `UPDATE bookings SET booking_date=$1, booking_time=$2, status='Confirmed' WHERE id=$3 AND user_id=$4`,
        [bookingDate, bookingTime, bookingId, userId]
      );

      // Send reschedule emails to both parties
      const clientEmail = emailTemplates.createRescheduleEmail(booking, booking.client_name, bookingDate, bookingTime, true);
      const professionalEmail = emailTemplates.createRescheduleEmail(booking, booking.professional_name, bookingDate, bookingTime, false);

      sendEmail(booking.client_email, clientEmail.subject, clientEmail.html, logger).catch(err =>
        logger.error('Failed to send reschedule email to client', { error: err.message })
      );

      sendEmail(booking.professional_email, professionalEmail.subject, professionalEmail.html, logger).catch(err =>
        logger.error('Failed to send reschedule email to professional', { error: err.message })
      );

      if (io) {
        io.emit('booking-updated', {
          bookingId,
          booking_date: bookingDate,
          booking_time: bookingTime,
          user_id: userId
        });
      }

      logger.info('Booking rescheduled', { bookingId, newDate: bookingDate, newTime: bookingTime });
      res.json({ success: true, message: 'Booking rescheduled successfully' });
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
        `UPDATE bookings SET status='Completed', completed_at=CURRENT_TIMESTAMP WHERE id=$1`,
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
          status: 'Completed',
          workerId: workerId
        });
      }

      res.json({ success: true, message: 'Booking marked as completed' });
    } catch (err) {
      logger.error('Complete booking error', { error: err.message });
      console.error('Complete booking error:', err);
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