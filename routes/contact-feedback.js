const express = require('express');
const router = express.Router();

module.exports = (pool, logger, sendEmail, emailTemplates) => {
  const { requireAuth, workerOnly } = require('../middleware/auth');

  // Worker contacts admin
  router.post('/worker/contact-admin', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { subject, message } = req.body;

      if (!subject || !message || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Subject and message are required' });
      }

      // Get worker details
      const workerResult = await pool.query(
        'SELECT name, email, speciality FROM workers WHERE id = $1',
        [workerId]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      // Save to database
      const result = await pool.query(
        `INSERT INTO worker_contact_messages (worker_id, subject, message, status)
         VALUES ($1, $2, $3, 'pending') RETURNING *`,
        [workerId, subject, message.trim()]
      );

      // Send email notification to admin
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@fixxa.co.za';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc3545;">New Support Message from Professional</h1>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Worker Details</h3>
            <p><strong>Name:</strong> ${worker.name}</p>
            <p><strong>Email:</strong> ${worker.email}</p>
            <p><strong>Specialty:</strong> ${worker.speciality || 'Not specified'}</p>
            <p><strong>Worker ID:</strong> ${workerId}</p>
          </div>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Subject: ${subject}</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            Submitted: ${new Date().toLocaleString()}
          </p>
          <p style="color: #666; font-size: 14px;">
            Please respond to ${worker.email} as soon as possible.
          </p>
        </div>
      `;

      sendEmail(adminEmail, `Support: ${subject} - ${worker.name}`, emailHtml, logger).catch(err =>
        logger.error('Failed to send contact admin email', { error: err.message })
      );

      logger.info('Worker contacted admin', { workerId, subject });
      res.json({ success: true, message: 'Message sent successfully', contactId: result.rows[0].id });

    } catch (error) {
      logger.error('Contact admin error', { error: error.message });
      console.error('Contact admin error:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  });

  // Worker submits feature suggestion
  router.post('/worker/feature-suggestion', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { category, suggestion } = req.body;

      if (!suggestion || !suggestion.trim()) {
        return res.status(400).json({ success: false, error: 'Suggestion is required' });
      }

      // Get worker details
      const workerResult = await pool.query(
        'SELECT name, email FROM workers WHERE id = $1',
        [workerId]
      );

      if (workerResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = workerResult.rows[0];

      // Save to database
      const result = await pool.query(
        `INSERT INTO feature_suggestions (worker_id, category, suggestion, status)
         VALUES ($1, $2, $3, 'pending') RETURNING *`,
        [workerId, category || 'General', suggestion.trim()]
      );

      // Send email notification to admin
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@fixxa.co.za';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #17a2b8;">New Feature Suggestion</h1>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">From Professional</h3>
            <p><strong>Name:</strong> ${worker.name}</p>
            <p><strong>Email:</strong> ${worker.email}</p>
            <p><strong>Worker ID:</strong> ${workerId}</p>
          </div>
          <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Category: ${category || 'General'}</h3>
            <p style="white-space: pre-wrap;">${suggestion}</p>
          </div>
          <p style="color: #666; font-size: 14px;">
            Submitted: ${new Date().toLocaleString()}
          </p>
        </div>
      `;

      sendEmail(adminEmail, `Feature Suggestion: ${category || 'General'} - ${worker.name}`, emailHtml, logger).catch(err =>
        logger.error('Failed to send feature suggestion email', { error: err.message })
      );

      logger.info('Worker submitted feature suggestion', { workerId, category });
      res.json({ success: true, message: 'Suggestion submitted successfully', suggestionId: result.rows[0].id });

    } catch (error) {
      logger.error('Feature suggestion error', { error: error.message });
      console.error('Feature suggestion error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit suggestion' });
    }
  });

  // Get worker's recent submissions
  router.get('/worker/submissions', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      // Get contact messages
      const contactMessages = await pool.query(
        `SELECT id, subject as subject, message, 'contact' as type, created_at, status
         FROM worker_contact_messages
         WHERE worker_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [workerId]
      );

      // Get feature suggestions
      const suggestions = await pool.query(
        `SELECT id, category, suggestion, 'suggestion' as type, created_at, status
         FROM feature_suggestions
         WHERE worker_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [workerId]
      );

      // Combine and sort
      const allSubmissions = [
        ...contactMessages.rows,
        ...suggestions.rows
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);

      res.json({ success: true, submissions: allSubmissions });

    } catch (error) {
      logger.error('Get submissions error', { error: error.message });
      console.error('Get submissions error:', error);
      res.status(500).json({ success: false, error: 'Failed to load submissions' });
    }
  });

  return router;
};
