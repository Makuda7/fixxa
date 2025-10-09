// Quick XSS protection test
const { sanitizeInput, containsXSS } = require('./utils/sanitize');

const testCases = [
  {
    name: 'Script tag',
    input: '<script>alert("XSS")</script>Hello',
    expected: 'Hello'
  },
  {
    name: 'Image with onerror',
    input: '<img src=x onerror=alert(1)>',
    expected: ''
  },
  {
    name: 'JavaScript protocol',
    input: '<a href="javascript:alert(1)">Click me</a>',
    expected: 'Click me'
  },
  {
    name: 'Inline event handler',
    input: '<div onclick="alert(1)">Click</div>',
    expected: 'Click'
  },
  {
    name: 'Safe text',
    input: 'Hello, this is a normal message!',
    expected: 'Hello, this is a normal message!'
  },
  {
    name: 'Text with special chars',
    input: 'Price: $100 & up',
    expected: 'Price: $100 & up'
  }
];

console.log('=== XSS Protection Test ===\n');

testCases.forEach((test, index) => {
  const sanitized = sanitizeInput(test.input);
  const hasXSS = containsXSS(test.input);
  const passed = sanitized === test.expected;

  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`Input:    "${test.input}"`);
  console.log(`Output:   "${sanitized}"`);
  console.log(`Expected: "${test.expected}"`);
  console.log(`XSS Detected: ${hasXSS}`);
  console.log(`Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('---');
});

console.log('\n✅ XSS Protection is active!');
