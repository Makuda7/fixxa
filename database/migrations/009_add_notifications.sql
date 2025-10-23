-- Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('booking_reminder', 'booking_confirmed', 'booking_cancelled', 'booking_rescheduled', 'message_received', 'payment_received', 'review_reminder', 'system')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_worker ON notifications(worker_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Create reminder_logs table to track sent reminders and prevent duplicates
CREATE TABLE IF NOT EXISTS reminder_logs (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('24_hour', '2_hour', '1_day_before', 'day_of')),
  sent_to VARCHAR(20) NOT NULL CHECK (sent_to IN ('client', 'worker', 'both')),
  email_sent BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(booking_id, reminder_type, sent_to)
);

CREATE INDEX IF NOT EXISTS idx_reminder_logs_booking ON reminder_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at);
