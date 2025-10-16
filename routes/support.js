const express = require('express');
const router = express.Router();

module.exports = (pool, logger, sendEmail) => {

  // Submit support/complaint request
  router.post('/support/submit', async (req, res) => {
    try {
      const { name, email, userType, category, subject, message, bookingId } = req.body;

      // Validation
      if (!name || !email || !subject || !message || !category) {
        return res.status(400).json({
          success: false,
          error: 'All required fields must be filled'
        });
      }

      // Save to database (optional - for tracking)
      try {
        await pool.query(
          `INSERT INTO support_requests (name, email, user_type, category, subject, message, booking_id, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP)`,
          [name, email, userType, category, subject, message, bookingId]
        );
      } catch (dbError) {
        // If table doesn't exist, just log and continue (email will still be sent)
        logger.warn('Support requests table not found, skipping database save', { error: dbError.message });
      }

      // Send email to admin
      const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || 'fixxaapp@gmail.com';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">🆘 New Support Request</h1>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none;">
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #2d5016;">Contact Information</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>User Type:</strong> ${userType}</p>
            </div>

            <div style="background: ${category.includes('complaint') || category === 'safety' ? '#fff3cd' : '#d1ecf1'}; padding: 15px; border-radius: 8px; border-left: 4px solid ${category.includes('complaint') || category === 'safety' ? '#ffc107' : '#17a2b8'}; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #2d5016;">Issue Details</h3>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              ${bookingId && bookingId !== 'N/A' ? `<p><strong>Booking ID:</strong> ${bookingId}</p>` : ''}
            </div>

            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #2d5016;">Message</h3>
              <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>

            <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
              <p style="margin: 0;">
                <strong>⏱️ Response Required:</strong> Please respond within 48 hours to ${email}
              </p>
            </div>

            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Submitted: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })} SAST
            </p>
          </div>
        </div>
      `;

      await sendEmail(
        adminEmail,
        `🆘 Support Request: ${category} - ${subject}`,
        emailHtml,
        logger
      );

      // Send confirmation email to user
      const confirmationHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: forestgreen; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">✅ Support Request Received</h1>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none;">
            <p>Hi ${name},</p>

            <p>Thank you for contacting Fixxa Support. We've received your request and will respond within <strong>48 hours</strong>.</p>

            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d5016;">Your Request Summary</h3>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Reference:</strong> ${new Date().getTime()}</p>
            </div>

            <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8;">
              <p style="margin: 0;">
                <strong>💡 What happens next?</strong><br>
                Our support team will review your request and respond to <strong>${email}</strong> within 48 hours (usually much sooner).
              </p>
            </div>

            <p style="margin-top: 20px;">If you have additional information to add, please reply to this email.</p>

            <p>Best regards,<br><strong>The Fixxa Support Team</strong></p>

            <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #dee2e6; padding-top: 15px;">
              This is an automated confirmation. Please do not reply to this email. For urgent issues, email us at fixxaapp@gmail.com
            </p>
          </div>
        </div>
      `;

      await sendEmail(
        email,
        'Fixxa Support: Request Received',
        confirmationHtml,
        logger
      );

      logger.info('Support request submitted', { name, email, category, subject });

      res.json({
        success: true,
        message: 'Support request submitted successfully. You will receive a confirmation email.'
      });

    } catch (error) {
      logger.error('Support request submission error', { error: error.message });
      console.error('Support error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit support request. Please email us directly at fixxaapp@gmail.com'
      });
    }
  });

  return router;
};
