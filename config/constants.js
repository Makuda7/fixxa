// Configuration constants
module.exports = {
  // Security
  SALT_ROUNDS: 10,

  // Token expiry times (in milliseconds)
  VERIFICATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_TOKEN_EXPIRY: 60 * 60 * 1000,    // 1 hour

  // Session configuration (rolling sessions)
  SESSION_IDLE_TIMEOUT: 30 * 60 * 1000,           // 30 minutes of inactivity
  SESSION_ABSOLUTE_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days maximum
  SESSION_ROLLING: true,                           // Extend session on activity

  // File upload limits
  MAX_FILE_SIZE: 5 * 1024 * 1024,                 // 5MB
  MAX_PHOTOS_PER_REVIEW: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  // Rate limiting
  AUTH_RATE_LIMIT: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 requests per window
    message: { success: false, error: 'Too many failed attempts. Please try again in 15 minutes.' }
  },

  // User types
  USER_TYPES: {
    CLIENT: 'client',
    PROFESSIONAL: 'professional'
  },

  // Booking statuses
  BOOKING_STATUS: {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    RESCHEDULED: 'Rescheduled'
  },

  // Validation rules
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_MESSAGE_LENGTH: 5000,
    MAX_REVIEW_LENGTH: 1000,
    MAX_BIO_LENGTH: 500
  }
};
