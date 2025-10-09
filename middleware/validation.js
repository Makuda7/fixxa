const { body, param, query, validationResult } = require('express-validator');
const { VALIDATION, USER_TYPES } = require('../config/constants');
const { sanitizeInput } = require('../utils/sanitize');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation rules
const registerValidation = [
  body('type')
    .trim()
    .isIn([USER_TYPES.CLIENT, USER_TYPES.PROFESSIONAL])
    .withMessage('Invalid user type'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens and apostrophes'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: VALIDATION.MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('speciality')
    .if(body('type').equals(USER_TYPES.PROFESSIONAL))
    .trim()
    .notEmpty()
    .withMessage('Speciality is required for professionals')
    .isLength({ max: 100 })
    .withMessage('Speciality must not exceed 100 characters'),

  handleValidationErrors
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  handleValidationErrors
];

const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid token format'),

  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: VALIDATION.MIN_PASSWORD_LENGTH })
    .withMessage(`Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  handleValidationErrors
];

const resendVerificationValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  handleValidationErrors
];

// Booking validation rules
const createBookingValidation = [
  body('workerId')
    .notEmpty()
    .withMessage('Worker ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid worker ID'),

  body('booking_date')
    .notEmpty()
    .withMessage('Booking date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const bookingDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (bookingDate < today) {
        throw new Error('Booking date cannot be in the past');
      }
      return true;
    }),

  body('booking_time')
    .notEmpty()
    .withMessage('Booking time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Invalid time format (use HH:MM)'),

  body('note')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Note must not exceed 500 characters'),

  handleValidationErrors
];

const updateBookingStatusValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid booking ID'),

  body('status')
    .optional()
    .trim()
    .isIn(['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled'])
    .withMessage('Invalid status'),

  body('cancellation_reason')
    .if(body('status').equals('Cancelled'))
    .trim()
    .notEmpty()
    .withMessage('Cancellation reason is required when cancelling')
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must not exceed 500 characters'),

  handleValidationErrors
];

// Message validation rules
const sendMessageValidation = [
  body('workerId')
    .notEmpty()
    .withMessage('Worker ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid worker ID'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: VALIDATION.MAX_MESSAGE_LENGTH })
    .withMessage(`Message must be between 1 and ${VALIDATION.MAX_MESSAGE_LENGTH} characters`),

  handleValidationErrors
];

// Review validation rules
const createReviewValidation = [
  body('booking_id')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid booking ID'),

  body('overall_rating')
    .notEmpty()
    .withMessage('Overall rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('quality_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1 and 5'),

  body('punctuality_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be between 1 and 5'),

  body('communication_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),

  body('value_rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Value rating must be between 1 and 5'),

  body('review_text')
    .optional()
    .trim()
    .isLength({ max: VALIDATION.MAX_REVIEW_LENGTH })
    .withMessage(`Review text must not exceed ${VALIDATION.MAX_REVIEW_LENGTH} characters`),

  handleValidationErrors
];

// Worker profile validation
const updateWorkerProfileValidation = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: VALIDATION.MAX_BIO_LENGTH })
    .withMessage(`Bio must not exceed ${VALIDATION.MAX_BIO_LENGTH} characters`),

  body('experience')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Experience must not exceed 50 characters'),

  body('area')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Area must not exceed 255 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format')
    .isLength({ max: 20 })
    .withMessage('Phone number must not exceed 20 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  body('postal_code')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code must not exceed 20 characters'),

  handleValidationErrors
];

// Search validation
const searchWorkersValidation = [
  query('speciality')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Speciality must not exceed 100 characters'),

  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),

  query('minRating')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('Minimum rating must be between 0 and 5'),

  handleValidationErrors
];

module.exports = {
  // Auth validations
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  resendVerificationValidation,

  // Booking validations
  createBookingValidation,
  updateBookingStatusValidation,

  // Message validations
  sendMessageValidation,

  // Review validations
  createReviewValidation,

  // Profile validations
  updateWorkerProfileValidation,

  // Search validations
  searchWorkersValidation,

  // Error handler
  handleValidationErrors
};
