# Error Recovery & Retry Logic

## Overview

This document describes the error recovery and retry logic implemented in the Fixxa platform. The system gracefully handles transient failures (network issues, temporary database unavailability, email service disruptions) with intelligent retry strategies.

## Core Principles

1. **Distinguish transient from permanent errors**: Only retry errors that might succeed on retry
2. **Exponential backoff**: Increase delays between retries to avoid overwhelming failing services
3. **Jitter**: Add randomness to prevent thundering herd problems
4. **Fail fast on permanent errors**: Don't waste time retrying validation errors or business logic failures
5. **Graceful degradation**: Continue core operations even when non-critical services fail

## Retry Utility (`utils/retry.js`)

### Retryable Errors

The system automatically retries these error types:

**Network Errors:**
- `ECONNREFUSED` - Connection refused
- `ECONNRESET` - Connection reset by peer
- `ETIMEDOUT` - Operation timed out
- `EPIPE` - Broken pipe
- `ENOTFOUND` - DNS lookup failed
- `ECONNABORTED` - Connection aborted

**PostgreSQL Errors:**
- `08000` - Connection exception
- `08003` - Connection does not exist
- `08006` - Connection failure
- `57P03` - Cannot connect now
- `53300` - Too many connections

### Non-Retryable Errors

These errors fail immediately without retry:
- `23505` - Unique constraint violation
- `23503` - Foreign key violation
- `42P01` - Table/relation does not exist
- `22P02` - Invalid text representation
- Validation errors
- Authorization errors
- Business logic errors

### Exponential Backoff Formula

```
delay = min(baseDelay * 2^attempt, maxDelay) + jitter
```

Example with baseDelay=1000ms, maxDelay=10000ms:
- Attempt 1: ~1000ms + jitter (0-300ms)
- Attempt 2: ~2000ms + jitter (0-600ms)
- Attempt 3: ~4000ms + jitter (0-1200ms)
- Attempt 4: ~8000ms + jitter (0-2400ms)

Jitter is 0-30% of the exponential delay to prevent synchronized retries.

## Implementation Locations

### 1. Database Connection (`config/database.js`)

**Initial connection with retry:**
```javascript
await retryDatabaseOperation(
  () => pool.query('SELECT NOW()'),
  logger,
  'initial_connection_test'
);
```

**Configuration:**
- Max retries: 3
- Base delay: 500ms
- Max delay: 5000ms

**Pool settings:**
- Max clients: 20
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds

The database pool has error handling that logs unexpected errors but doesn't crash the process, letting retry logic handle recovery.

### 2. Email Sending (`utils/email.js`)

**Email with retry:**
```javascript
await retryEmailSend(
  async () => {
    await transporter.sendMail({ from, to, subject, html });
  },
  logger,
  to
);
```

**Configuration:**
- Max retries: 2
- Base delay: 2000ms
- Max delay: 8000ms

**Graceful degradation**: Email failures are logged but don't throw errors, so user-facing operations continue even if email fails.

**Timeouts:**
- Connection timeout: 10 seconds
- Greeting timeout: 5 seconds
- Socket timeout: 15 seconds

### 3. Health Check Endpoint (`server.js`)

Enhanced health check with graceful degradation:

```javascript
GET /health
```

**Response format:**
```json
{
  "status": "healthy|degraded",
  "timestamp": "2025-10-09T...",
  "uptime": 12345.67,
  "services": {
    "database": "connected|disconnected",
    "email": "configured|not_configured"
  }
}
```

**Status codes:**
- `200` - All services healthy
- `503` - One or more services degraded

The health check doesn't crash on database failure - it reports degraded status instead.

## Circuit Breaker Pattern

Prevents cascade failures by temporarily blocking requests to failing services.

```javascript
const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000 // 1 minute
});

await breaker.execute(async () => {
  // Service call
});
```

**States:**
- **CLOSED** (normal): All requests pass through
- **OPEN** (failing): Requests blocked immediately, throws error
- **HALF_OPEN** (testing): After reset timeout, allow one request to test recovery

**Example use case:** External API calls, third-party integrations

## Usage Examples

### Database Operation with Retry

```javascript
const { retryDatabaseOperation } = require('./utils/retry');

async function getUser(userId) {
  return retryDatabaseOperation(
    () => pool.query('SELECT * FROM users WHERE id = $1', [userId]),
    logger,
    'get_user'
  );
}
```

### Custom Retry Configuration

```javascript
const { withRetry } = require('./utils/retry');

const result = await withRetry(
  async () => {
    // Your operation
  },
  {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`);
    }
  }
);
```

### Timeout Protection

```javascript
const { withTimeout } = require('./utils/retry');

const result = await withTimeout(
  async () => {
    // Long-running operation
  },
  5000, // 5 second timeout
  'fetch_external_data'
);
```

## Test Results

All retry logic tests pass:

| Test | Result |
|------|--------|
| Successful operation (no retry) | ✅ PASS |
| Transient failure with retry | ✅ PASS |
| Permanent failure (no retry) | ✅ PASS |
| Max retries exceeded | ✅ PASS |
| Error detection (retryable vs non-retryable) | ✅ PASS |
| Circuit breaker pattern | ✅ PASS |
| Exponential backoff timing | ✅ PASS |

Run tests: `node test-retry.js`

## Logging

Retry attempts are logged at WARN level:

```javascript
logger.warn('Retrying database operation', {
  operation: 'create_booking',
  attempt: 2,
  error: 'Connection timeout',
  code: 'ETIMEDOUT',
  delayMs: 1000
});
```

Final failures are logged at ERROR level:

```javascript
logger.error('Operation failed after retries', {
  operation: 'send_email',
  recipient: 'user@example.com',
  error: 'SMTP timeout',
  attempts: 3
});
```

## Benefits

1. **Improved reliability**: Transient network issues don't break user flows
2. **Better user experience**: Operations succeed even with temporary glitches
3. **Reduced support burden**: Self-healing reduces manual intervention
4. **Service protection**: Exponential backoff prevents overwhelming failing services
5. **Visibility**: Comprehensive logging helps diagnose persistent issues

## Best Practices

### When to Use Retry

✅ Network operations (HTTP requests, database queries, email sending)
✅ External service calls
✅ File I/O operations
✅ Any operation that might fail transiently

### When NOT to Use Retry

❌ Validation errors (bad input)
❌ Authorization errors (permission denied)
❌ Business logic errors (insufficient funds, duplicate booking)
❌ Non-idempotent operations without safeguards (payments, notifications)

### Idempotency Considerations

For operations that must not be duplicated:
1. Use idempotency keys
2. Check for duplicates before insert
3. Use database constraints
4. Implement request deduplication

## Monitoring

Watch for these patterns in logs:

**Warning signs:**
- Many retry attempts for the same operation
- Circuit breakers frequently opening
- Consistent timeout errors

**Action items:**
- Increase timeout values if operations legitimately take longer
- Scale database connection pool if seeing connection errors
- Investigate network issues if seeing consistent ECONNREFUSED
- Check email service status if seeing email failures

## Future Enhancements

1. **Distributed tracing**: Track retries across microservices
2. **Metrics dashboard**: Visualize retry rates and success rates
3. **Dynamic backoff**: Adjust delays based on system load
4. **Dead letter queue**: Store permanently failed operations for manual review
5. **Alerting**: Notify on high retry rates or circuit breaker trips

---

**Last Updated**: 2025-10-09
**Version**: 1.0
**Status**: Active Protection
