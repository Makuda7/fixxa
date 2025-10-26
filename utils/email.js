const nodemailer = require('nodemailer');
const { retryEmailSend } = require('./retry');

// Configure transporter based on environment
const transporterConfig = process.env.SENDGRID_API_KEY ? {
  // SendGrid configuration (Production - Recommended)
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'apikey', // This is literally the string 'apikey'
    pass: process.env.SENDGRID_API_KEY
  },
  connectionTimeout: 30000,
  greetingTimeout: 10000,
  socketTimeout: 30000,
  pool: true,
  maxConnections: 5,
  maxMessages: 100
} : {
  // Gmail fallback configuration
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  connectionTimeout: 30000,
  greetingTimeout: 10000,
  socketTimeout: 30000,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,
  rateLimit: 3
};

const transporter = nodemailer.createTransport(transporterConfig);

// Verify email configuration on startup
const emailProvider = process.env.SENDGRID_API_KEY ? 'SendGrid' : (process.env.EMAIL_SERVICE || 'Gmail');
transporter.verify(function(error, success) {
  if (error) {
    console.error(`❌ Email transporter verification failed (${emailProvider}):`, error.message);
    if (process.env.SENDGRID_API_KEY) {
      console.error('   Please check SENDGRID_API_KEY environment variable');
    } else {
      console.error('   Please check EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASSWORD environment variables');
    }
  } else {
    console.log(`✅ Email transporter is ready to send emails via ${emailProvider}`);
  }
});

async function sendEmail(to, subject, html, logger) {
  try {
    await retryEmailSend(
      async () => {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to,
          subject,
          html
        });
      },
      logger,
      to
    );
    logger.info('Email sent successfully', { to, subject });
    console.log(`✅ Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error('Email send failed after retries', {
      error: error.message,
      code: error.code,
      command: error.command,
      to,
      subject
    });
    console.error(`❌ Email error (${to}): ${error.message}`);

    // Log specific error types for troubleshooting
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('   Network timeout - check internet connection or Gmail settings');
    } else if (error.code === 'EAUTH') {
      console.error('   Authentication failed - check EMAIL_USER and EMAIL_PASSWORD');
    } else if (error.responseCode === 550) {
      console.error('   Recipient address rejected - check email address validity');
    }

    // Don't throw - email failures shouldn't break user-facing operations
  }
}

function createWelcomeEmail(name) {
  return {
    subject: 'Welcome to Fixxa!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: forestgreen; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Welcome to Fixxa!</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hi ${name},</p>
          <p>Thank you for verifying your email and joining Fixxa! We're excited to have you as part of our community.</p>
          <p>With Fixxa, you can:</p>
          <ul>
            <li>Find trusted local professionals for any service</li>
            <li>Book appointments instantly</li>
            <li>Track your bookings and history</li>
            <li>Leave reviews and ratings</li>
          </ul>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}/clientProfile.html" 
               style="background: forestgreen; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Best regards,<br>The Fixxa Team</p>
        </div>
      </div>
    `
  };
}

function createBookingConfirmationEmail(booking, clientName, professionalName, professionalEmail) {
  return {
    client: {
      subject: 'Booking Confirmed - Fixxa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: forestgreen; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Booking Confirmed!</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Hi ${clientName},</p>
            <p>Your booking has been confirmed! Here are the details:</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Professional:</strong> ${professionalName}</p>
              <p><strong>Date:</strong> ${booking.booking_date}</p>
              <p><strong>Time:</strong> ${booking.booking_time}</p>
              <p><strong>Status:</strong> ${booking.status}</p>
              ${booking.note ? `<p><strong>Note:</strong> ${booking.note}</p>` : ''}
            </div>
            <p>The professional will contact you shortly to confirm the details.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.BASE_URL || 'http://localhost:3000'}/clientProfile.html" 
                 style="background: forestgreen; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Booking
              </a>
            </p>
            <p>Best regards,<br>The Fixxa Team</p>
          </div>
        </div>
      `
    },
    professional: {
      subject: 'New Booking Received - Fixxa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: forestgreen; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">New Booking!</h1>
          </div>
          <div style="padding: 20px; background: #f9f9f9;">
            <p>Hi ${professionalName},</p>
            <p>You have a new booking! Here are the details:</p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Client:</strong> ${clientName}</p>
              <p><strong>Date:</strong> ${booking.booking_date}</p>
              <p><strong>Time:</strong> ${booking.booking_time}</p>
              ${booking.note ? `<p><strong>Note:</strong> ${booking.note}</p>` : ''}
            </div>
            <p>Please review the booking and contact the client to confirm.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.BASE_URL || 'http://localhost:3000'}/prosite.html" 
                 style="background: forestgreen; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Booking
              </a>
            </p>
            <p>Best regards,<br>The Fixxa Team</p>
          </div>
        </div>
      `
    }
  };
}

function createCancellationEmail(booking, recipientName, cancelledBy, isClient) {
  return {
    subject: 'Booking Cancelled - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #e74c3c; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Booking Cancelled</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hi ${recipientName},</p>
          <p>A booking has been cancelled by the ${cancelledBy}.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Booking ID:</strong> #${booking.id}</p>
            <p><strong>Date:</strong> ${booking.booking_date}</p>
            <p><strong>Time:</strong> ${booking.booking_time}</p>
            <p><strong>Status:</strong> Cancelled</p>
          </div>
          ${isClient ? 
            '<p>You can book another professional anytime from your dashboard.</p>' : 
            '<p>This time slot is now available for other bookings.</p>'
          }
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}/${isClient ? 'clientProfile' : 'prosite'}.html" 
               style="background: forestgreen; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </p>
          <p>Best regards,<br>The Fixxa Team</p>
        </div>
      </div>
    `
  };
}

function createCompletionEmail(booking, clientName, professionalName) {
  return {
    subject: 'Job Completed - Please Leave a Review',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: forestgreen; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Job Completed!</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hi ${clientName},</p>
          <p>Great news! ${professionalName} has marked your job as completed.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Professional:</strong> ${professionalName}</p>
            <p><strong>Date:</strong> ${booking.booking_date}</p>
            <p><strong>Time:</strong> ${booking.booking_time}</p>
            <p><strong>Status:</strong> Completed</p>
          </div>
          <p>We'd love to hear about your experience! Please take a moment to leave a review.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.BASE_URL || 'http://localhost:3000'}/reviews.html" 
               style="background: forestgreen; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Leave a Review
            </a>
          </p>
          <p>Best regards,<br>The Fixxa Team</p>
        </div>
      </div>
    `
  };
}

function createPasswordResetEmail(name, resetToken) {
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
  return {
    subject: 'Reset Your Password - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: forestgreen; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Reset Your Password</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hi ${name},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}"
               style="background: forestgreen; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
          <p>Best regards,<br>The Fixxa Team</p>
        </div>
      </div>
    `
  };
}

function createCertificationSubmissionNotification(workerName, workerEmail, speciality, fileName, certificationId) {
  const adminUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/admin.html`;
  return {
    subject: '🔔 New Certificate Submitted for Review - Fixxa Admin',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ff9800; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">📄 New Certificate Submission</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Hi Admin,</p>
          <p>A professional has submitted a certificate for review. Please review and approve or reject it as soon as possible.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <h3 style="margin-top: 0; color: #ff9800;">Professional Details</h3>
            <p><strong>Name:</strong> ${workerName}</p>
            <p><strong>Email:</strong> ${workerEmail}</p>
            <p><strong>Speciality:</strong> ${speciality}</p>
            <p><strong>Document:</strong> ${fileName}</p>
            <p><strong>Certification ID:</strong> #${certificationId}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="background: #fff3e0; padding: 12px; border-radius: 6px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <strong>⏰ Action Required:</strong> Please review this certificate promptly to help professionals get verified faster.
          </p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}"
               style="background: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Review Certificate Now
            </a>
          </p>
          <p style="font-size: 0.9rem; color: #666;">
            You can approve or reject this certificate from the Admin Dashboard under the "Certifications" section.
          </p>
          <p>Best regards,<br>Fixxa Automated System</p>
        </div>
      </div>
    `
  };
}

module.exports = {
  sendEmail,
  createWelcomeEmail,
  createBookingConfirmationEmail,
  createCancellationEmail,
  createCompletionEmail,
  createPasswordResetEmail,
  createCertificationSubmissionNotification
};