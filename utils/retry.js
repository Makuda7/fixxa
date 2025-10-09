/**
 * Retry utility with exponential backoff
 * Handles transient failures gracefully
 */

/**
 * Check if error is retryable (transient)
 * @param {Error} error - The error to check
 * @returns {boolean} - True if error should trigger retry
 */
function isRetryableError(error) {
  // Database connection errors
  if (error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'EPIPE') {
    return true;
  }

  // PostgreSQL specific errors
  if (error.code === '08000' || // connection exception
      error.code === '08003' || // connection does not exist
      error.code === '08006' || // connection failure
      error.code === '57P03' || // cannot connect now
      error.code === '53300') {  // too many connections
    return true;
  }

  // Network errors
  if (error.message && (
      error.message.includes('ENOTFOUND') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNABORTED')
  )) {
    return true;
  }

  return false;
}

/**
 * Execute function with retry logic and exponential backoff
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry configuration
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.onRetry - Callback on retry (receives attempt number and error)
 * @returns {Promise} - Result of successful execution
 * @throws {Error} - Last error if all retries fail
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.3 * exponentialDelay; // Add up to 30% jitter
      const delay = exponentialDelay + jitter;

      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Retry database operation
 * @param {Function} fn - Database operation to retry
 * @param {Object} logger - Logger instance
 * @param {string} operation - Operation name for logging
 * @returns {Promise} - Result of operation
 */
async function retryDatabaseOperation(fn, logger, operation) {
  return withRetry(fn, {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    onRetry: (attempt, error, delay) => {
      logger.warn('Retrying database operation', {
        operation,
        attempt,
        error: error.message,
        code: error.code,
        delayMs: Math.round(delay)
      });
    }
  });
}

/**
 * Retry email sending with longer delays
 * @param {Function} fn - Email sending function to retry
 * @param {Object} logger - Logger instance
 * @param {string} recipient - Email recipient for logging
 * @returns {Promise} - Result of operation
 */
async function retryEmailSend(fn, logger, recipient) {
  return withRetry(fn, {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    onRetry: (attempt, error, delay) => {
      logger.warn('Retrying email send', {
        recipient,
        attempt,
        error: error.message,
        delayMs: Math.round(delay)
      });
    }
  });
}

/**
 * Execute with timeout
 * @param {Function} fn - Function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name for error message
 * @returns {Promise} - Result or timeout error
 */
async function withTimeout(fn, timeoutMs, operationName = 'Operation') {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Execute with circuit breaker pattern
 * Prevents cascade failures by stopping requests after threshold
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }

    try {
      const result = await fn();

      // Success - reset on half-open, or continue closed
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }
}

module.exports = {
  withRetry,
  retryDatabaseOperation,
  retryEmailSend,
  withTimeout,
  isRetryableError,
  CircuitBreaker
};
