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
  }),

  // Worker application approved email
  createWorkerApprovedEmail: (workerName, workerEmail) => ({
    subject: 'Welcome to Fixxa - Your Application Has Been Approved!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Congratulations, ${workerName}! 🎉</h1>
        <p>Great news! Your professional application on Fixxa has been approved by our admin team.</p>

        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #155724;">✓ Your Profile is Now Active</h3>
          <p style="margin-bottom: 0;">Clients can now find you, view your profile, and book your services!</p>
        </div>

        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <h3 style="margin-top: 0; color: #0d47a1;">🚀 What's Next?</h3>
          <ul style="margin-bottom: 0;">
            <li>Log in to your dashboard to manage your profile and availability</li>
            <li>Respond promptly to booking requests from clients</li>
            <li>Provide excellent service to build your reputation and ratings</li>
            <li>Upload additional certifications to boost client trust</li>
          </ul>
        </div>

        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">💡 Tips for Success</h3>
          <ul style="margin-bottom: 0;">
            <li>Keep your availability calendar updated</li>
            <li>Respond to messages and bookings within 24 hours</li>
            <li>Complete jobs on time and request reviews from satisfied clients</li>
            <li>Maintain professionalism in all communications</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/login.html"
             style="background: #4a7c59; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: bold;">
            Access Your Dashboard
          </a>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">Welcome to the Fixxa community! If you have any questions, please don't hesitate to contact our support team.</p>

        <p style="color: #666; font-size: 14px;">Thank you for choosing Fixxa!</p>
      </div>
    `
  }),

  // Worker application rejected email
  createWorkerRejectedEmail: (workerName, reason) => ({
    subject: 'Fixxa Application Status Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Application Status Update</h1>
        <p>Hi ${workerName},</p>
        <p>Thank you for your interest in joining Fixxa as a professional service provider.</p>

        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0; color: #721c24;">Application Not Approved</h3>
          <p>After careful review, we are unable to approve your application at this time.</p>
          ${reason ? `
            <p style="margin-top: 15px;"><strong>Reason:</strong></p>
            <p style="margin: 0; background: white; padding: 15px; border-radius: 4px;">${reason}</p>
          ` : ''}
        </div>

        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460;">
          <h3 style="margin-top: 0; color: #0c5460;">💡 What You Can Do</h3>
          <ul style="margin-bottom: 0;">
            <li>Review the reason provided above and address any issues</li>
            <li>Update your profile information if needed</li>
            <li>Upload missing or updated documentation</li>
            <li>Contact our support team if you have questions or need clarification</li>
          </ul>
        </div>

        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>⚠️ Note:</strong> You may resubmit your application once you've addressed the concerns mentioned above. Please log in to your account to update your information.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/login.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
            Log In to Update Profile
          </a>
          <a href="mailto:support@fixxa.co.za"
             style="background: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Contact Support
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">We appreciate your interest in Fixxa and hope to work with you in the future.</p>
      </div>
    `
  }),

  // Certificate approved email
  createCertificateApprovedEmail: (workerName, certificateFileName, isVerified) => ({
    subject: 'Certificate Approved - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">Certificate Approved! ✓</h1>
        <p>Hi ${workerName},</p>
        <p>Great news! Your uploaded certification document has been reviewed and approved by our admin team.</p>

        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #155724;">✓ Document Approved</h3>
          <p style="margin: 0;"><strong>File:</strong> ${certificateFileName}</p>
        </div>

        ${isVerified ? `
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="margin-top: 0; color: #0d47a1;">🎖️ Verified Status Achieved!</h3>
            <p style="margin-bottom: 0;">Your profile now displays a <strong>verified badge</strong>, which helps build trust with potential clients and can increase your booking rates!</p>
          </div>
        ` : `
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin-top: 0; color: #856404;">💡 Get Verified</h3>
            <p style="margin-bottom: 0;">Upload more certifications to earn a verified badge on your profile and build more client trust!</p>
          </div>
        `}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/prosite.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Your Dashboard
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">Keep up the great work! Verified professionals get more bookings on Fixxa.</p>
      </div>
    `
  }),

  // Certificate rejected email
  createCertificateRejectedEmail: (workerName, certificateFileName, reason) => ({
    subject: 'Certificate Requires Attention - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Certificate Review - Action Required</h1>
        <p>Hi ${workerName},</p>
        <p>We've reviewed your uploaded certification document, but unfortunately we cannot approve it at this time.</p>

        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0; color: #721c24;">Document Not Approved</h3>
          <p><strong>File:</strong> ${certificateFileName}</p>
          ${reason ? `
            <p style="margin-top: 15px;"><strong>Reason:</strong></p>
            <p style="margin: 0; background: white; padding: 15px; border-radius: 4px;">${reason}</p>
          ` : ''}
        </div>

        <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0c5460;">
          <h3 style="margin-top: 0; color: #0c5460;">📋 Common Issues</h3>
          <ul style="margin-bottom: 0;">
            <li><strong>Poor Quality:</strong> Image is blurry or text is unreadable</li>
            <li><strong>Incomplete Document:</strong> Parts of the document are cut off</li>
            <li><strong>Wrong Document Type:</strong> Document doesn't match the required category</li>
            <li><strong>Not Certified:</strong> ID/Passport copy is not stamped by a commissioner of oaths</li>
            <li><strong>Expired:</strong> Proof of residence is older than 3 months</li>
          </ul>
        </div>

        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">✅ What to Upload</h3>
          <ul style="margin-bottom: 0;">
            <li><strong>Proof of Residence:</strong> Municipal bill, bank statement, or lease (not older than 3 months)</li>
            <li><strong>Certified ID/Passport:</strong> Copy stamped by commissioner of oaths, police station, or notary</li>
            <li><strong>Proof of Qualifications:</strong> Trade certificates, diplomas, licenses, or professional certifications</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/prosite.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Upload Corrected Document
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">If you have questions about this decision, please contact our support team.</p>
      </div>
    `
  }),

  // Review received notification for worker
  createReviewReceivedEmail: (workerName, clientName, rating, reviewText, bookingDate) => ({
    subject: `New ${rating}-Star Review Received - Fixxa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ffc107;">You've Received a New Review! ⭐</h1>
        <p>Hi ${workerName},</p>
        <p><strong>${clientName}</strong> has left a review for your completed job on <strong>${bookingDate}</strong>.</p>

        <div style="background: ${rating >= 4 ? '#d4edda' : rating >= 3 ? '#fff3cd' : '#f8d7da'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${rating >= 4 ? '#28a745' : rating >= 3 ? '#ffc107' : '#dc3545'};">
          <h3 style="margin-top: 0; color: ${rating >= 4 ? '#155724' : rating >= 3 ? '#856404' : '#721c24'};">Overall Rating</h3>
          <div style="font-size: 24px; margin: 10px 0;">
            ${'⭐'.repeat(Math.floor(rating))}${rating % 1 !== 0 ? '½' : ''}${'☆'.repeat(5 - Math.ceil(rating))}
          </div>
          <p style="font-size: 20px; font-weight: bold; margin: 0;">${rating} out of 5 stars</p>
        </div>

        ${reviewText ? `
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">💬 Client's Review</h3>
            <p style="margin: 0; font-style: italic; line-height: 1.6;">"${reviewText}"</p>
          </div>
        ` : ''}

        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <h3 style="margin-top: 0; color: #0d47a1;">${rating >= 4 ? '🎉 Great Job!' : rating >= 3 ? '💪 Keep Improving!' : '📈 Learning Opportunity'}</h3>
          <p style="margin-bottom: 0;">
            ${rating >= 4
              ? 'Excellent work! Positive reviews like this help you attract more clients and build your reputation on Fixxa.'
              : rating >= 3
              ? 'Good work! Consider the feedback to improve your service and earn even better reviews in the future.'
              : 'Use this feedback as an opportunity to improve your service. Reach out to the client if there are unresolved concerns.'}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/prosite.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View All Your Reviews
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">Your updated rating and reviews are now visible on your public profile.</p>
        <p style="color: #666; font-size: 14px;">Thank you for providing excellent service on Fixxa!</p>
      </div>
    `
  }),

  // Quote received email (sent to client)
  createQuoteReceivedEmail: (clientName, workerName, totalAmount, validUntil) => ({
    subject: `Quote Received from ${workerName} - Fixxa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2196F3;">📋 You've Received a Quote!</h1>
        <p>Hi ${clientName},</p>
        <p><strong>${workerName}</strong> has sent you a quote for your booking request.</p>

        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <h3 style="margin-top: 0; color: #0d47a1;">💰 Quote Amount</h3>
          <p style="font-size: 24px; font-weight: bold; margin: 0; color: #0d47a1;">R ${totalAmount}</p>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>⏰ Valid Until:</strong> ${validUntil}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/clientProfile.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Quote & Respond
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">Review the quote details and accept or reject it in your dashboard.</p>
        <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
      </div>
    `
  }),

  // Quote accepted email (sent to worker)
  createQuoteAcceptedEmail: (workerName, clientName, totalAmount) => ({
    subject: `Quote Accepted by ${clientName} - Fixxa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">✅ Quote Accepted!</h1>
        <p>Hi ${workerName},</p>
        <p>Great news! <strong>${clientName}</strong> has accepted your quote of <strong>R ${totalAmount}</strong>.</p>

        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #155724;">🎉 Job Confirmed</h3>
          <p style="margin: 0;">The booking is now confirmed. Please coordinate with the client to schedule the work.</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Next Steps:</h3>
          <p>1. Contact the client to confirm date/time</p>
          <p>2. Complete the job as quoted</p>
          <p style="margin-bottom: 0;">3. Mark the job as complete in your dashboard</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/prosite.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Booking Details
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
      </div>
    `
  }),

  // Quote rejected email (sent to worker)
  createQuoteRejectedEmail: (workerName, clientName, reason) => ({
    subject: `Quote Not Accepted by ${clientName} - Fixxa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545;">Quote Not Accepted</h1>
        <p>Hi ${workerName},</p>
        <p><strong>${clientName}</strong> has declined your quote.</p>

        <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0; color: #721c24;">Reason:</h3>
          <p style="margin: 0;">${reason}</p>
        </div>

        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3;">
          <h3 style="margin-top: 0; color: #0d47a1;">💡 What's Next?</h3>
          <p style="margin-bottom: 0;">You can send a revised quote if you'd like to negotiate. Contact the client through the messaging system to discuss their needs.</p>
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
  }),

  // Job completion receipt (sent to client)
  createJobCompletionReceiptEmail: (clientName, workerName, receipt) => ({
    subject: `Receipt for Completed Job - ${workerName} - Fixxa`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">📧 Job Completion Receipt</h1>
        <p>Hi ${clientName},</p>
        <p>Your job with <strong>${workerName}</strong> has been completed!</p>

        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="margin-top: 0; color: #155724;">✓ Job Completed</h3>
          <p style="margin: 0;">Receipt Number: <strong>${receipt.receipt_number}</strong></p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Receipt Details</h3>
          ${receipt.line_items.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>${item.description}</span>
              <span><strong>R ${parseFloat(item.amount).toFixed(2)}</strong></span>
            </div>
          `).join('')}
          <hr style="border: none; border-top: 2px solid #ddd; margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
            <span>Total:</span>
            <span>R ${parseFloat(receipt.total_amount).toFixed(2)}</span>
          </div>
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>💳 Payment Status:</strong> ${receipt.payment_status === 'paid' ? 'Paid' : 'Payment handled directly with professional'}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/clientProfile.html"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Leave a Review
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">Thank you for using Fixxa!</p>
      </div>
    `
  })
};

module.exports = emailTemplates;
