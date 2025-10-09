const xss = require('xss');

// Custom XSS filter options
const xssOptions = {
  whiteList: {
    // Allow only safe tags
    b: [],
    i: [],
    em: [],
    strong: [],
    br: [],
    p: [],
    span: [],
  },
  stripIgnoreTag: true,      // Remove all tags not in whitelist
  stripIgnoreTagBody: ['script'], // Remove script tags and their content
};

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @param {boolean} allowBasicFormatting - Allow basic HTML formatting (b, i, em, strong)
 * @returns {string} Sanitized string
 */
function sanitizeInput(input, allowBasicFormatting = false) {
  if (!input || typeof input !== 'string') {
    return input;
  }

  if (allowBasicFormatting) {
    // Allow basic formatting tags
    return xss(input, xssOptions);
  }

  // Strip all HTML tags for strict sanitization
  return xss(input, {
    whiteList: {},          // No tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
}

/**
 * Sanitize an object's string properties
 * @param {Object} obj - Object to sanitize
 * @param {Array} fields - Array of field names to sanitize
 * @param {boolean} allowBasicFormatting - Allow basic HTML formatting
 * @returns {Object} Object with sanitized fields
 */
function sanitizeObject(obj, fields, allowBasicFormatting = false) {
  const sanitized = { ...obj };

  fields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeInput(sanitized[field], allowBasicFormatting);
    }
  });

  return sanitized;
}

/**
 * Express middleware to sanitize request body
 * @param {Array} fields - Optional array of specific fields to sanitize
 * @param {boolean} allowBasicFormatting - Allow basic HTML formatting
 */
function sanitizeMiddleware(fields = null, allowBasicFormatting = false) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      if (fields && Array.isArray(fields)) {
        // Sanitize specific fields
        req.body = sanitizeObject(req.body, fields, allowBasicFormatting);
      } else {
        // Sanitize all string fields
        const allFields = Object.keys(req.body).filter(
          key => typeof req.body[key] === 'string'
        );
        req.body = sanitizeObject(req.body, allFields, allowBasicFormatting);
      }
    }
    next();
  };
}

/**
 * Check if string contains potential XSS
 * @param {string} input - String to check
 * @returns {boolean} True if XSS detected
 */
function containsXSS(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onload, etc.
    /<embed[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

module.exports = {
  sanitizeInput,
  sanitizeObject,
  sanitizeMiddleware,
  containsXSS
};
