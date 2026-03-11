const rateLimit = require('express-rate-limit');

// Global rate limiter - applies to all requests
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks and static files
  skip: (req) => {
    // Skip health check endpoint
    if (req.path === '/health') return true;

    // Skip static files (images, CSS, JS, fonts, etc.)
    const staticExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
                              '.css', '.js', '.woff', '.woff2', '.ttf', '.eot',
                              '.map', '.json', '.txt', '.html'];
    const hasStaticExtension = staticExtensions.some(ext => req.path.toLowerCase().endsWith(ext));
    if (hasStaticExtension) return true;

    // Skip requests to static directories
    const staticPaths = ['/images/', '/static/', '/uploads/', '/assets/', '/favicon.ico'];
    const isStaticPath = staticPaths.some(path => req.path.startsWith(path));
    if (isStaticPath) return true;

    return false;
  }
});

// Auth rate limiter - stricter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth attempts per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, not just failed ones
  skipFailedRequests: false
});

// Login rate limiter - very strict for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Only count failed login attempts
});

// Registration rate limiter - prevent fake account spam
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 registrations per hour
  message: {
    success: false,
    error: 'Too many registration attempts. Please try again in 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Password reset rate limiter - prevent abuse
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too many password reset requests. Please try again in 1 hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API rate limiter - for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: {
    success: false,
    error: 'Too many API requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Booking rate limiter - prevent booking spam
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 bookings per hour
  message: {
    success: false,
    error: 'Too many booking requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Message rate limiter - prevent spam messages
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 messages per minute
  message: {
    success: false,
    error: 'Too many messages sent, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per 15 minutes
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Review rate limiter - prevent review spam
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 reviews per hour
  message: {
    success: false,
    error: 'Too many reviews submitted, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  globalLimiter,
  authLimiter,
  loginLimiter,
  registrationLimiter,
  passwordResetLimiter,
  apiLimiter,
  bookingLimiter,
  messageLimiter,
  uploadLimiter,
  reviewLimiter
};
