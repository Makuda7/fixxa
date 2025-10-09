// Retry Logic Test Suite
const { withRetry, isRetryableError, CircuitBreaker } = require('./utils/retry');

console.log('===========================================');
console.log('Retry Logic Test Suite');
console.log('===========================================\n');

// Test 1: Successful operation (no retry needed)
async function test1() {
  console.log('Test 1: Successful operation');
  let attempts = 0;
  try {
    const result = await withRetry(async () => {
      attempts++;
      return 'success';
    }, { maxRetries: 3 });
    console.log(`  Result: ${result}`);
    console.log(`  Attempts: ${attempts}`);
    console.log(`  Status: ${attempts === 1 ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}\n`);
  }
}

// Test 2: Transient failure with successful retry
async function test2() {
  console.log('Test 2: Transient failure with retry');
  let attempts = 0;
  try {
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) {
        const error = new Error('Connection timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'success after retry';
    }, { maxRetries: 3, baseDelay: 100 });
    console.log(`  Result: ${result}`);
    console.log(`  Attempts: ${attempts}`);
    console.log(`  Status: ${attempts === 3 ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}\n`);
  }
}

// Test 3: Permanent failure (no retry)
async function test3() {
  console.log('Test 3: Permanent failure (non-retryable error)');
  let attempts = 0;
  try {
    await withRetry(async () => {
      attempts++;
      const error = new Error('Validation failed');
      error.code = '23505'; // Unique constraint violation
      throw error;
    }, { maxRetries: 3, baseDelay: 100 });
    console.log(`  ❌ FAIL: Should have thrown error\n`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    console.log(`  Attempts: ${attempts}`);
    console.log(`  Status: ${attempts === 1 ? '✅ PASS (no retry on non-retryable)' : '❌ FAIL'}\n`);
  }
}

// Test 4: Max retries exceeded
async function test4() {
  console.log('Test 4: Max retries exceeded');
  let attempts = 0;
  try {
    await withRetry(async () => {
      attempts++;
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      throw error;
    }, { maxRetries: 3, baseDelay: 100 });
    console.log(`  ❌ FAIL: Should have thrown error\n`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    console.log(`  Attempts: ${attempts}`);
    console.log(`  Status: ${attempts === 4 ? '✅ PASS (1 initial + 3 retries)' : '❌ FAIL'}\n`);
  }
}

// Test 5: Error detection
async function test5() {
  console.log('Test 5: Retryable error detection');

  const testCases = [
    { code: 'ECONNREFUSED', expected: true, name: 'Connection refused' },
    { code: 'ETIMEDOUT', expected: true, name: 'Timeout' },
    { code: '08006', expected: true, name: 'PostgreSQL connection failure' },
    { code: '23505', expected: false, name: 'Unique constraint violation' },
    { code: '42P01', expected: false, name: 'Table does not exist' }
  ];

  let passed = 0;
  let failed = 0;

  testCases.forEach(test => {
    const error = new Error(test.name);
    error.code = test.code;
    const result = isRetryableError(error);
    const status = result === test.expected ? '✅' : '❌';
    if (result === test.expected) passed++;
    else failed++;
    console.log(`  ${status} ${test.name} (${test.code}): ${result ? 'retryable' : 'not retryable'}`);
  });

  console.log(`  Status: ${failed === 0 ? '✅ PASS' : `❌ FAIL (${failed} errors)`}\n`);
}

// Test 6: Circuit breaker
async function test6() {
  console.log('Test 6: Circuit breaker pattern');

  const breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 1000 });
  let attempts = 0;

  // Cause 3 failures to open circuit
  for (let i = 0; i < 3; i++) {
    try {
      await breaker.execute(async () => {
        attempts++;
        throw new Error('Service unavailable');
      });
    } catch (error) {
      // Expected
    }
  }

  console.log(`  Failures before circuit opened: ${attempts}`);
  console.log(`  Circuit state: ${breaker.state}`);

  // Try when circuit is open
  try {
    await breaker.execute(async () => {
      attempts++;
      return 'should not execute';
    });
    console.log(`  ❌ FAIL: Circuit should be open\n`);
  } catch (error) {
    console.log(`  Circuit blocked request: ${error.message}`);
    console.log(`  Total attempts: ${attempts}`);
    console.log(`  Status: ${breaker.state === 'OPEN' && attempts === 3 ? '✅ PASS' : '❌ FAIL'}\n`);
  }
}

// Test 7: Exponential backoff delays
async function test7() {
  console.log('Test 7: Exponential backoff timing');

  const delays = [];
  let attempts = 0;

  try {
    await withRetry(async () => {
      attempts++;
      if (attempts < 4) {
        const error = new Error('Network error');
        error.code = 'ECONNRESET';
        throw error;
      }
      return 'success';
    }, {
      maxRetries: 3,
      baseDelay: 100,
      onRetry: (attempt, error, delay) => {
        delays.push(Math.round(delay));
      }
    });

    console.log(`  Delays: ${delays.join('ms, ')}ms`);
    console.log(`  Pattern: Base delay doubles each retry`);
    const increasing = delays[0] < delays[1] && delays[1] < delays[2];
    console.log(`  Status: ${increasing ? '✅ PASS (delays increase)' : '❌ FAIL'}\n`);
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}\n`);
  }
}

// Run all tests
async function runTests() {
  await test1();
  await test2();
  await test3();
  await test4();
  await test5();
  await test6();
  await test7();

  console.log('===========================================');
  console.log('✅ Retry Logic Tests Complete');
  console.log('===========================================');
}

runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
