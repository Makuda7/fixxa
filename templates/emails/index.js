// Email template manager
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const emailTemplates = {
  // Booking confirmation emails
  createBookingConfirmationEmail: (booking, clientName, professionalName) => ({
    client: {
      subject: 'Booking Confirmed - Fixxa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4a7c59;">Booking Confirmed!</h1>
          <p>Hi ${clientName},</p>
          <p>Your booking with <strong>${professionalName}</strong> has been confirmed.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <p><strong>Date:</strong> ${booking.booking_date}</p>
            <p><strong>Time:</strong> ${booking.booking_time}</p>
            ${booking.note ? `<p><strong>Note:</strong> ${booking.note}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/clientProfile.html"
               style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Booking
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
        </div>
      `
    },
    professional: {
      subject: 'New Booking - Fixxa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4a7c59;">New Booking!</h1>
          <p>Hi ${professionalName},</p>
          <p>You have a new booking from <strong>${clientName}</strong>.</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <p><strong>Date:</strong> ${booking.booking_date}</p>
            <p><strong>Time:</strong> ${booking.booking_time}</p>
            ${booking.note ? `<p><strong>Note:</strong> ${booking.note}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/prosite.html"
               style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Booking
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
        </div>
      `
    }
  }),

  // Job completion email
  createCompletionEmail: (booking, clientName, professionalName) => ({
    subject: 'Job Completed - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a7c59;">Job Completed</h1>
        <p>Hi ${clientName},</p>
        <p><strong>${professionalName}</strong> has marked your job as completed.</p>
        <p>Please review and approve the completion, or contact the professional if there are any issues.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/clientProfile.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Job
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
      </div>
    `
  }),

  // Booking cancellation email
  createCancellationEmail: (booking, name, cancelledBy, isClient) => ({
    subject: 'Booking Cancelled - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #d9534f;">Booking Cancelled</h1>
        <p>Hi ${name},</p>
        <p>Your booking scheduled for <strong>${booking.booking_date}</strong> at <strong>${booking.booking_time}</strong> has been cancelled.</p>
        ${booking.cancellation_reason ? `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Reason:</strong> ${booking.cancellation_reason}</p>
          </div>
        ` : ''}
        <p>If you have any questions, please contact support.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/${isClient ? 'clientProfile.html' : 'prosite.html'}"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </div>
      </div>
    `
  }),

  // Welcome email
  createWelcomeEmail: (userName, userType) => ({
    subject: 'Welcome to Fixxa!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a7c59;">Welcome to Fixxa, ${userName}!</h1>
        <p>Your ${userType} account has been verified and is now active.</p>
        <p>You can now log in and start ${userType === 'professional' ? 'accepting bookings' : 'booking services'}!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/login.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Log In Now
          </a>
        </div>
        <p>Thank you for joining Fixxa!</p>
      </div>
    `
  }),

  // Booking reschedule email
  createRescheduleEmail: (booking, name, newDate, newTime, isClient) => ({
    subject: 'Booking Rescheduled - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f0ad4e;">Booking Rescheduled</h1>
        <p>Hi ${name},</p>
        <p>Your booking has been rescheduled to a new date and time.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Updated Booking Details</h3>
          <p><strong>New Date:</strong> ${newDate}</p>
          <p><strong>New Time:</strong> ${newTime}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/${isClient ? 'clientProfile.html' : 'prosite.html'}"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Booking
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">If you have any concerns, please contact support.</p>
      </div>
    `
  }),

  // Booking status change email
  createStatusChangeEmail: (booking, name, oldStatus, newStatus, isClient) => ({
    subject: `Booking ${newStatus} - Fixxa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a7c59;">Booking Status Updated</h1>
        <p>Hi ${name},</p>
        <p>The status of your booking scheduled for <strong>${booking.booking_date}</strong> at <strong>${booking.booking_time}</strong> has been updated.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Previous Status:</strong> ${oldStatus}</p>
          <p><strong>New Status:</strong> <span style="color: #4a7c59; font-weight: bold;">${newStatus}</span></p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/${isClient ? 'clientProfile.html' : 'prosite.html'}"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Booking
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
      </div>
    `
  })
};

module.exports = emailTemplates;
