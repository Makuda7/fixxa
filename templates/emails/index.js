// Email template manager
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const emailTemplates = {
  // Booking request emails (pending approval)
  createBookingConfirmationEmail: (booking, clientName, professionalName) => ({
    client: {
      subject: 'Booking Request Submitted - Fixxa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ffc107;">Booking Request Submitted!</h1>
          <p>Hi ${clientName},</p>
          <p>Your booking request with <strong>${professionalName}</strong> has been submitted and is awaiting approval.</p>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0;">⏳ Pending Approval</h3>
            <p>The professional will review your request and respond shortly. You will be notified once they approve or decline.</p>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Requested Booking Details</h3>
            <p><strong>Date:</strong> ${booking.booking_date}</p>
            <p><strong>Time:</strong> ${booking.booking_time}</p>
            ${booking.note ? `<p><strong>Note:</strong> ${booking.note}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/clientProfile.html"
               style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View My Bookings
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
        </div>
      `
    },
    professional: {
      subject: 'New Booking Request - Action Required - Fixxa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ffc107;">New Booking Request - Action Required!</h1>
          <p>Hi ${professionalName},</p>
          <p>You have a new booking request from <strong>${clientName}</strong> that requires your approval.</p>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>⚠️ Please review and respond to this request as soon as possible.</strong></p>
          </div>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Requested Booking Details</h3>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Date:</strong> ${booking.booking_date}</p>
            <p><strong>Time:</strong> ${booking.booking_time}</p>
            ${booking.note ? `<p><strong>Client Note:</strong> ${booking.note}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}/prosite.html"
               style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review & Respond
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
        </div>
      `
    }
  }),

  // Booking approved email
  createBookingApprovedEmail: (booking, clientName, professionalName) => ({
    subject: 'Booking Confirmed - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Booking Confirmed!</h1>
        <p>Hi ${clientName},</p>
        <p>Great news! <strong>${professionalName}</strong> has approved your booking request.</p>
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #155724;">✓ Your Appointment is Confirmed</h3>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Professional:</strong> ${professionalName}</p>
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
  }),

  // Booking declined email
  createBookingDeclinedEmail: (booking, clientName, professionalName, declineReason) => ({
    subject: 'Booking Request Declined - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Booking Request Declined</h1>
        <p>Hi ${clientName},</p>
        <p>Unfortunately, <strong>${professionalName}</strong> is unable to accept your booking request.</p>
        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0; color: #721c24;">Reason for Declining</h3>
          <p style="margin: 0;">${declineReason}</p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Original Request Details</h3>
          <p><strong>Date:</strong> ${booking.booking_date}</p>
          <p><strong>Time:</strong> ${booking.booking_time}</p>
        </div>
        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460;">
          <h3 style="margin-top: 0; color: #0c5460;">💡 What to do next</h3>
          <p style="margin: 0;">You can message ${professionalName} to discuss alternative dates/times, or search for other professionals on Fixxa.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/service.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
            Find Other Professionals
          </a>
          <a href="${baseUrl}/profile.html?id=${booking.worker_id}"
             style="background: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Message ${professionalName}
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
      </div>
    `
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
