const crypto = require('crypto');

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateVerificationUrl(token) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/verify-email?token=${token}`;
}

function createVerificationEmail(name, verificationUrl) {
  return {
    subject: 'Verify Your Email - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: forestgreen; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Verify Your Email</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hi ${name},</p>
          <p>Thank you for registering with Fixxa! Please verify your email address by clicking the button below:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: forestgreen; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <p>Best regards,<br>The Fixxa Team</p>
        </div>
      </div>
    `
  };
}

module.exports = {
  generateVerificationToken,
  generateVerificationUrl,
  createVerificationEmail
};