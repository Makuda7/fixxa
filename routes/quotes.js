const express = require('express');
const router = express.Router();

module.exports = (pool, logger, sendEmail, emailTemplates) => {
  const { requireAuth } = require('../middleware/auth');

  // Health check endpoint to verify deployment
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Quotes routes are active',
      version: '2025-12-12-v3',
      endpoints: ['/request', '/send', '/requests', '/:id/accept', '/:id/reject', '/booking/:bookingId']
    });
  });

  // Client requests a quote from a worker (no booking yet)
  router.post('/request', requireAuth, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      const userType = req.session.user.type;

      if (userType !== 'client') {
        return res.status(403).json({ success: false, error: 'Only clients can request quotes' });
      }

      const { worker_id, description, notes } = req.body;

      // Validation
      if (!worker_id || !description || !description.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Worker ID and description are required'
        });
      }

      // Verify worker exists
      const workerResult = await pool.query(
        'SELECT id, name, email FROM workers WHERE id = $1',
        [worker_id]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      // Get client details
      const clientResult = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [clientId]
      );

      const client = clientResult.rows[0];

      // Create a quote request record
      const quoteRequestResult = await pool.query(`
        INSERT INTO quote_requests (
          client_id, worker_id, description, notes, status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `, [
        clientId,
        worker_id,
        description.trim(),
        notes ? notes.trim() : null,
        'pending'
      ]);

      const quoteRequest = quoteRequestResult.rows[0];

      // Send email notification to worker
      try {
        const emailSubject = `New Quote Request from ${client.name}`;
        const emailHtml = `
          <h2>New Quote Request</h2>
          <p>Hello ${worker.name},</p>
          <p>You have received a new quote request from <strong>${client.name}</strong>.</p>

          <h3>Request Details:</h3>
          <p><strong>Description:</strong><br/>${description}</p>
          ${notes ? `<p><strong>Additional Details:</strong><br/>${notes}</p>` : ''}

          <p>Please log in to your dashboard to review this request and provide a quote.</p>

          <p>Best regards,<br/>The Fixxa Team</p>
        `;

        await sendEmail(worker.email, emailSubject, emailHtml);
      } catch (emailError) {
        logger.error('Failed to send quote request email', {
          error: emailError.message,
          quoteRequestId: quoteRequest.id
        });
        // Don't fail the request if email fails
      }

      logger.info('Quote request created', {
        quoteRequestId: quoteRequest.id,
        clientId,
        workerId: worker_id
      });

      res.json({
        success: true,
        message: 'Quote request sent successfully',
        quoteRequest: {
          id: quoteRequest.id,
          status: quoteRequest.status
        }
      });

    } catch (error) {
      logger.error('Failed to create quote request', { error: error.message });
      console.error('Quote request error:', error);
      res.status(500).json({ success: false, error: 'Failed to send quote request' });
    }
  });

  // Worker sends quote for a booking
  router.post('/send', requireAuth, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const userType = req.session.user.type;

      if (userType !== 'professional') {
        return res.status(403).json({ success: false, error: 'Only professionals can send quotes' });
      }

      const {
        booking_id,
        line_items, // [{description, amount}]
        payment_methods, // ['cash', 'eft', 'card']
        banking_details, // {bank, account_number, account_type, branch_code}
        notes,
        valid_days = 7
      } = req.body;

      // Validation
      if (!booking_id || !line_items || !Array.isArray(line_items) || line_items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Booking ID and line items are required'
        });
      }

      // Verify booking belongs to this worker
      const bookingResult = await pool.query(
        'SELECT id, user_id, status FROM bookings WHERE id = $1 AND worker_id = $2',
        [booking_id, workerId]
      );

      if (bookingResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      const booking = bookingResult.rows[0];
      const clientId = booking.user_id;

      // Calculate totals
      const subtotal = line_items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      const taxAmount = 0; // No tax for now
      const totalAmount = subtotal + taxAmount;

      // Set expiry date
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + valid_days);

      // Check if there's already a pending quote for this booking
      const existingQuote = await pool.query(
        'SELECT id FROM quotes WHERE booking_id = $1 AND status = $2',
        [booking_id, 'pending']
      );

      let quoteResult;

      if (existingQuote.rows.length > 0) {
        // Update existing quote
        quoteResult = await pool.query(`
          UPDATE quotes
          SET line_items = $1,
              subtotal = $2,
              tax_amount = $3,
              total_amount = $4,
              payment_methods = $5,
              banking_details = $6,
              notes = $7,
              valid_until = $8,
              sent_at = NOW(),
              updated_at = NOW()
          WHERE id = $9
          RETURNING *
        `, [
          JSON.stringify(line_items),
          subtotal,
          taxAmount,
          totalAmount,
          payment_methods || ['cash'],
          banking_details ? JSON.stringify(banking_details) : null,
          notes,
          validUntil,
          existingQuote.rows[0].id
        ]);
      } else {
        // Create new quote
        quoteResult = await pool.query(`
          INSERT INTO quotes (
            booking_id, worker_id, client_id,
            line_items, subtotal, tax_amount, total_amount,
            payment_methods, banking_details, notes, valid_until
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [
          booking_id,
          workerId,
          clientId,
          JSON.stringify(line_items),
          subtotal,
          taxAmount,
          totalAmount,
          payment_methods || ['cash'],
          banking_details ? JSON.stringify(banking_details) : null,
          notes,
          validUntil
        ]);
      }

      const quote = quoteResult.rows[0];

      // Get client and worker details for email
      const clientResult = await pool.query('SELECT name, email FROM users WHERE id = $1', [clientId]);
      const workerResult = await pool.query('SELECT name FROM workers WHERE id = $1', [workerId]);

      const client = clientResult.rows[0];
      const worker = workerResult.rows[0];

      // Send email notification to client
      try {
        const emailContent = emailTemplates.createQuoteReceivedEmail(
          client.name,
          worker.name,
          totalAmount.toFixed(2),
          validUntil.toLocaleDateString()
        );
        await sendEmail(client.email, emailContent.subject, emailContent.html);
      } catch (emailError) {
        logger.error('Failed to send quote email', {
          error: emailError.message,
          quoteId: quote.id
        });
        // Don't fail the quote creation if email fails
      }

      logger.info('Quote sent', {
        quoteId: quote.id,
        bookingId: booking_id,
        workerId,
        clientId,
        totalAmount
      });

      res.json({
        success: true,
        message: 'Quote sent successfully',
        quote: {
          id: quote.id,
          total_amount: totalAmount.toFixed(2),
          valid_until: validUntil
        }
      });

    } catch (error) {
      logger.error('Failed to send quote', { error: error.message });
      console.error('Send quote error:', error);
      res.status(500).json({ success: false, error: 'Failed to send quote' });
    }
  });

  // Client accepts quote
  router.post('/:id/accept', requireAuth, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      const userType = req.session.user.type;
      const quoteId = req.params.id;

      if (userType !== 'client') {
        return res.status(403).json({ success: false, error: 'Only clients can accept quotes' });
      }

      // Get quote details
      const quoteResult = await pool.query(
        'SELECT * FROM quotes WHERE id = $1 AND client_id = $2',
        [quoteId, clientId]
      );

      if (quoteResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Quote not found' });
      }

      const quote = quoteResult.rows[0];

      if (quote.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Quote already ${quote.status}`
        });
      }

      // Check if quote is expired
      if (new Date(quote.valid_until) < new Date()) {
        await pool.query(
          'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2',
          ['expired', quoteId]
        );
        return res.status(400).json({ success: false, error: 'Quote has expired' });
      }

      // Accept quote
      await pool.query(
        'UPDATE quotes SET status = $1, responded_at = NOW(), updated_at = NOW() WHERE id = $2',
        ['accepted', quoteId]
      );

      // Update booking status to confirmed
      await pool.query(
        'UPDATE bookings SET status = $1 WHERE id = $2',
        ['Confirmed', quote.booking_id]
      );

      // Get worker details for email
      const workerResult = await pool.query('SELECT name, email FROM workers WHERE id = $1', [quote.worker_id]);
      const clientResult = await pool.query('SELECT name FROM users WHERE id = $1', [clientId]);

      const worker = workerResult.rows[0];
      const client = clientResult.rows[0];

      // Send email notification to worker
      try {
        const emailContent = emailTemplates.createQuoteAcceptedEmail(
          worker.name,
          client.name,
          quote.total_amount
        );
        await sendEmail(worker.email, emailContent.subject, emailContent.html);
      } catch (emailError) {
        logger.error('Failed to send quote acceptance email', {
          error: emailError.message,
          quoteId
        });
      }

      logger.info('Quote accepted', {
        quoteId,
        bookingId: quote.booking_id,
        clientId,
        workerId: quote.worker_id
      });

      res.json({
        success: true,
        message: 'Quote accepted successfully'
      });

    } catch (error) {
      logger.error('Failed to accept quote', { error: error.message });
      console.error('Accept quote error:', error);
      res.status(500).json({ success: false, error: 'Failed to accept quote' });
    }
  });

  // Client rejects quote
  router.post('/:id/reject', requireAuth, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      const userType = req.session.user.type;
      const quoteId = req.params.id;
      const { reason } = req.body;

      if (userType !== 'client') {
        return res.status(403).json({ success: false, error: 'Only clients can reject quotes' });
      }

      // Get quote details
      const quoteResult = await pool.query(
        'SELECT * FROM quotes WHERE id = $1 AND client_id = $2',
        [quoteId, clientId]
      );

      if (quoteResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Quote not found' });
      }

      const quote = quoteResult.rows[0];

      if (quote.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `Quote already ${quote.status}`
        });
      }

      // Reject quote
      await pool.query(
        'UPDATE quotes SET status = $1, responded_at = NOW(), notes = $2, updated_at = NOW() WHERE id = $3',
        ['rejected', reason || 'Client rejected quote', quoteId]
      );

      // Get worker details for email
      const workerResult = await pool.query('SELECT name, email FROM workers WHERE id = $1', [quote.worker_id]);
      const clientResult = await pool.query('SELECT name FROM users WHERE id = $1', [clientId]);

      const worker = workerResult.rows[0];
      const client = clientResult.rows[0];

      // Send email notification to worker
      try {
        const emailContent = emailTemplates.createQuoteRejectedEmail(
          worker.name,
          client.name,
          reason || 'No reason provided'
        );
        await sendEmail(worker.email, emailContent.subject, emailContent.html);
      } catch (emailError) {
        logger.error('Failed to send quote rejection email', {
          error: emailError.message,
          quoteId
        });
      }

      logger.info('Quote rejected', {
        quoteId,
        bookingId: quote.booking_id,
        clientId,
        workerId: quote.worker_id,
        reason
      });

      res.json({
        success: true,
        message: 'Quote rejected successfully'
      });

    } catch (error) {
      logger.error('Failed to reject quote', { error: error.message });
      console.error('Reject quote error:', error);
      res.status(500).json({ success: false, error: 'Failed to reject quote' });
    }
  });

  // Get quote by booking ID
  router.get('/booking/:bookingId', requireAuth, async (req, res) => {
    try {
      const bookingId = req.params.bookingId;
      const userId = req.session.user.id;
      const userType = req.session.user.type;

      // Verify user has access to this booking
      const bookingCheck = userType === 'client'
        ? await pool.query('SELECT id FROM bookings WHERE id = $1 AND user_id = $2', [bookingId, userId])
        : await pool.query('SELECT id FROM bookings WHERE id = $1 AND worker_id = $2', [bookingId, userId]);

      if (bookingCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      // Get all quotes for this booking (to show history)
      const quoteResult = await pool.query(
        'SELECT * FROM quotes WHERE booking_id = $1 ORDER BY created_at DESC',
        [bookingId]
      );

      if (quoteResult.rows.length === 0) {
        return res.json({ success: true, quotes: [] });
      }

      const quotes = quoteResult.rows.map(quote => ({
        ...quote,
        line_items: typeof quote.line_items === 'string' ? JSON.parse(quote.line_items) : quote.line_items,
        banking_details: quote.banking_details && typeof quote.banking_details === 'string'
          ? JSON.parse(quote.banking_details)
          : quote.banking_details
      }));

      res.json({
        success: true,
        quotes: quotes
      });

    } catch (error) {
      logger.error('Failed to get quote', { error: error.message });
      console.error('Get quote error:', error);
      res.status(500).json({ success: false, error: 'Failed to get quote' });
    }
  });

  // Get quote requests for a worker
  router.get('/requests', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.type;

      if (userType !== 'professional') {
        return res.status(403).json({ success: false, error: 'Only professionals can view quote requests' });
      }

      // Get all quote requests for this worker
      const result = await pool.query(`
        SELECT
          qr.*,
          u.name as client_name,
          u.email as client_email,
          u.phone as client_phone
        FROM quote_requests qr
        JOIN users u ON qr.client_id = u.id
        WHERE qr.worker_id = $1
        ORDER BY qr.created_at DESC
      `, [userId]);

      res.json({
        success: true,
        requests: result.rows
      });

    } catch (error) {
      logger.error('Failed to get quote requests', { error: error.message });
      console.error('Get quote requests error:', error);
      res.status(500).json({ success: false, error: 'Failed to get quote requests' });
    }
  });

  return router;
};
