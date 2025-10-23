// Booking Reminder Scheduler
// Sends automated reminders to clients and workers before bookings

const cron = require('node-cron');
const { sendEmail } = require('../utils/email');

class ReminderScheduler {
  constructor(pool, logger) {
    this.pool = pool;
    this.logger = logger;
    this.isRunning = false;
  }

  // Start the reminder scheduler (runs every hour)
  start() {
    if (this.isRunning) {
      this.logger.warn('Reminder scheduler already running');
      return;
    }

    // Run every hour at minute 0
    this.job = cron.schedule('0 * * * *', async () => {
      await this.checkAndSendReminders();
    });

    this.isRunning = true;
    this.logger.info('Reminder scheduler started - running every hour');

    // Run immediately on startup
    this.checkAndSendReminders();
  }

  // Stop the scheduler
  stop() {
    if (this.job) {
      this.job.stop();
      this.isRunning = false;
      this.logger.info('Reminder scheduler stopped');
    }
  }

  // Main function to check and send reminders
  async checkAndSendReminders() {
    try {
      this.logger.info('Checking for bookings requiring reminders...');

      // Get upcoming bookings that need reminders
      const upcomingBookings = await this.getUpcomingBookings();

      for (const booking of upcomingBookings) {
        await this.processBookingReminders(booking);
      }

      this.logger.info(`Processed ${upcomingBookings.length} bookings for reminders`);
    } catch (error) {
      this.logger.error('Error in reminder scheduler', { error: error.message });
    }
  }

  // Get bookings that are upcoming and confirmed
  async getUpcomingBookings() {
    const query = `
      SELECT
        b.*,
        u.name as client_name,
        u.email as client_email,
        w.name as worker_name,
        w.email as worker_email,
        w.speciality as worker_service
      FROM bookings b
      JOIN users u ON b.client_id = u.id
      JOIN workers w ON b.worker_id = w.id
      WHERE b.status = 'Confirmed'
        AND b.booking_date >= CURRENT_DATE
        AND b.booking_date <= CURRENT_DATE + INTERVAL '2 days'
      ORDER BY b.booking_date, b.booking_time
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  // Process reminders for a specific booking
  async processBookingReminders(booking) {
    const now = new Date();
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

    // 24-hour reminder
    if (hoursUntilBooking <= 24 && hoursUntilBooking > 23) {
      await this.sendReminder(booking, '24_hour');
    }

    // 2-hour reminder
    if (hoursUntilBooking <= 2 && hoursUntilBooking > 1.5) {
      await this.sendReminder(booking, '2_hour');
    }
  }

  // Send reminder to both client and worker
  async sendReminder(booking, reminderType) {
    try {
      // Check if reminder already sent
      const alreadySent = await this.checkReminderSent(booking.id, reminderType);
      if (alreadySent) {
        return;
      }

      const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const bookingTime = booking.booking_time;

      // Send to client
      await this.sendClientReminder(booking, reminderType, bookingDate, bookingTime);

      // Send to worker
      await this.sendWorkerReminder(booking, reminderType, bookingDate, bookingTime);

      // Log the reminder
      await this.logReminder(booking.id, reminderType);

      this.logger.info(`Sent ${reminderType} reminder for booking #${booking.id}`);
    } catch (error) {
      this.logger.error('Error sending reminder', {
        bookingId: booking.id,
        reminderType,
        error: error.message
      });
    }
  }

  // Send reminder to client
  async sendClientReminder(booking, reminderType, bookingDate, bookingTime) {
    const timeframe = reminderType === '24_hour' ? '24 hours' : '2 hours';

    // Create in-app notification
    await this.createNotification({
      user_id: booking.client_id,
      booking_id: booking.id,
      type: 'booking_reminder',
      title: `Booking Reminder - ${timeframe} away`,
      message: `Your booking with ${booking.worker_name} (${booking.worker_service}) is coming up on ${bookingDate} at ${bookingTime}`,
      link: '/clientProfile.html#bookings'
    });

    // Send email (will only work when email is enabled)
    const emailSubject = `Reminder: Your Fixxa booking is in ${timeframe}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #228b22, #32cd32); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">⏰ Booking Reminder</h2>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi ${booking.client_name},</p>

          <p style="font-size: 16px; color: #333;">
            This is a friendly reminder that your booking is coming up in <strong>${timeframe}</strong>!
          </p>

          <div style="background: white; border-left: 4px solid #228b22; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 15px 0; color: #228b22;">📅 Booking Details</h3>
            <p style="margin: 5px 0;"><strong>Professional:</strong> ${booking.worker_name}</p>
            <p style="margin: 5px 0;"><strong>Service:</strong> ${booking.worker_service}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${bookingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${bookingTime}</p>
          </div>

          ${reminderType === '24_hour' ? `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #856404;">
                <strong>💡 Tip:</strong> Make sure to have any materials or access ready for the professional's arrival.
              </p>
            </div>
          ` : ''}

          <p style="font-size: 16px; color: #333;">
            If you need to reschedule or cancel, please do so as soon as possible through your Fixxa account.
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.BASE_URL || 'https://fixxa-app-production.up.railway.app'}/clientProfile.html"
               style="background: #228b22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Booking
            </a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            Thank you for using Fixxa!
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail(booking.client_email, emailSubject, emailBody);
    } catch (error) {
      this.logger.warn('Failed to send client reminder email', {
        bookingId: booking.id,
        error: error.message
      });
    }
  }

  // Send reminder to worker
  async sendWorkerReminder(booking, reminderType, bookingDate, bookingTime) {
    const timeframe = reminderType === '24_hour' ? '24 hours' : '2 hours';

    // Create in-app notification
    await this.createNotification({
      worker_id: booking.worker_id,
      user_id: booking.client_id, // For linking purposes
      booking_id: booking.id,
      type: 'booking_reminder',
      title: `Booking Reminder - ${timeframe} away`,
      message: `You have a booking with ${booking.client_name} coming up on ${bookingDate} at ${bookingTime}`,
      link: '/prosite.html#bookings'
    });

    // Send email
    const emailSubject = `Reminder: Your Fixxa booking is in ${timeframe}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #228b22, #32cd32); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">⏰ Booking Reminder</h2>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi ${booking.worker_name},</p>

          <p style="font-size: 16px; color: #333;">
            This is a friendly reminder that you have a booking coming up in <strong>${timeframe}</strong>!
          </p>

          <div style="background: white; border-left: 4px solid #228b22; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 15px 0; color: #228b22;">📅 Booking Details</h3>
            <p style="margin: 5px 0;"><strong>Client:</strong> ${booking.client_name}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${bookingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${bookingTime}</p>
            ${booking.note ? `<p style="margin: 5px 0;"><strong>Note:</strong> ${booking.note}</p>` : ''}
          </div>

          ${reminderType === '24_hour' ? `
            <div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #0c5460;">
                <strong>💡 Tip:</strong> Prepare your tools and materials, and review any messages from the client.
              </p>
            </div>
          ` : `
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #856404;">
                <strong>⚠️ Important:</strong> Make sure you're on your way! The booking is in 2 hours.
              </p>
            </div>
          `}

          <p style="font-size: 16px; color: #333;">
            Please arrive on time and maintain professional standards. Good luck with your booking!
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.BASE_URL || 'https://fixxa-app-production.up.railway.app'}/prosite.html"
               style="background: #228b22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
              View Booking
            </a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
            Thank you for being a Fixxa professional!
          </p>
        </div>
      </div>
    `;

    try {
      await sendEmail(booking.worker_email, emailSubject, emailBody);
    } catch (error) {
      this.logger.warn('Failed to send worker reminder email', {
        bookingId: booking.id,
        error: error.message
      });
    }
  }

  // Create in-app notification
  async createNotification(data) {
    try {
      const query = `
        INSERT INTO notifications (user_id, worker_id, booking_id, type, title, message, link)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      await this.pool.query(query, [
        data.user_id,
        data.worker_id || null,
        data.booking_id || null,
        data.type,
        data.title,
        data.message,
        data.link || null
      ]);
    } catch (error) {
      this.logger.error('Error creating notification', { error: error.message });
    }
  }

  // Check if reminder was already sent
  async checkReminderSent(bookingId, reminderType) {
    const query = `
      SELECT id FROM reminder_logs
      WHERE booking_id = $1 AND reminder_type = $2
    `;
    const result = await this.pool.query(query, [bookingId, reminderType]);
    return result.rows.length > 0;
  }

  // Log that reminder was sent
  async logReminder(bookingId, reminderType) {
    const query = `
      INSERT INTO reminder_logs (booking_id, reminder_type, sent_to, email_sent, notification_sent)
      VALUES ($1, $2, 'both', true, true)
      ON CONFLICT (booking_id, reminder_type, sent_to) DO NOTHING
    `;
    await this.pool.query(query, [bookingId, reminderType]);
  }
}

module.exports = ReminderScheduler;
