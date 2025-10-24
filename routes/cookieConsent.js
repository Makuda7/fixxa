const express = require('express');
const router = express.Router();

module.exports = (pool, logger) => {
  // Track cookie consent (optional - only if user is logged in)
  router.post('/cookie-consent', async (req, res) => {
    try {
      const { essential, analytics, performance, timestamp, version } = req.body;
      const userId = req.session?.user?.id;
      const userType = req.session?.user?.type;

      // Only track if user is logged in
      if (!userId || !userType) {
        return res.json({ success: true, message: 'Consent recorded locally' });
      }

      // Ensure cookie_consents table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS cookie_consents (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_type VARCHAR(20) NOT NULL,
          essential BOOLEAN DEFAULT true,
          analytics BOOLEAN DEFAULT false,
          performance BOOLEAN DEFAULT false,
          consent_version VARCHAR(10),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Check if consent already exists for this user
      const existingConsent = await pool.query(
        'SELECT id FROM cookie_consents WHERE user_id = $1 AND user_type = $2',
        [userId, userType]
      );

      if (existingConsent.rows.length > 0) {
        // Update existing consent
        await pool.query(
          `UPDATE cookie_consents
           SET essential = $1, analytics = $2, performance = $3,
               consent_version = $4, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $5 AND user_type = $6`,
          [essential || true, analytics || false, performance || false, version || '1.0', userId, userType]
        );
      } else {
        // Insert new consent record
        await pool.query(
          `INSERT INTO cookie_consents
           (user_id, user_type, essential, analytics, performance, consent_version)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, userType, essential || true, analytics || false, performance || false, version || '1.0']
        );
      }

      logger.info('Cookie consent recorded', {
        userId,
        userType,
        analytics,
        performance
      });

      res.json({ success: true, message: 'Consent recorded' });
    } catch (error) {
      logger.error('Cookie consent error', { error: error.message });
      // Don't fail - consent is already stored in localStorage
      res.json({ success: true, message: 'Consent recorded locally' });
    }
  });

  // Get user's current cookie consent
  router.get('/cookie-consent', async (req, res) => {
    try {
      const userId = req.session?.user?.id;
      const userType = req.session?.user?.type;

      if (!userId || !userType) {
        return res.json({ success: false, error: 'Not logged in' });
      }

      const result = await pool.query(
        'SELECT * FROM cookie_consents WHERE user_id = $1 AND user_type = $2',
        [userId, userType]
      );

      if (result.rows.length === 0) {
        return res.json({ success: false, error: 'No consent found' });
      }

      res.json({ success: true, consent: result.rows[0] });
    } catch (error) {
      logger.error('Get cookie consent error', { error: error.message });
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return router;
};
