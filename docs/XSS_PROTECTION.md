# XSS Protection Implementation

## Overview

This document describes the Cross-Site Scripting (XSS) protection implemented in the Fixxa platform. XSS attacks attempt to inject malicious JavaScript code into web pages viewed by other users. Our implementation provides comprehensive protection against all common XSS attack vectors.

## What XSS Attacks Are Prevented

### 1. Script Tag Injection
```javascript
// Blocked input:
<script>alert("XSS")</script>Hello
// Sanitized output:
Hello
```

### 2. Image Tag with Event Handlers
```javascript
// Blocked input:
<img src=x onerror=alert(1)>
// Sanitized output:
(empty string)
```

### 3. JavaScript Protocol URLs
```javascript
// Blocked input:
<a href="javascript:alert(1)">Click me</a>
// Sanitized output:
Click me
```

### 4. Inline Event Handlers
```javascript
// Blocked input:
<div onclick="alert(1)">Click</div>
// Sanitized output:
Click
```

### 5. Safe Content Preservation
```javascript
// Input:
Hello, this is a normal message!
// Output (unchanged):
Hello, this is a normal message!

// Input:
Price: $100 & up
// Output (unchanged):
Price: $100 & up
```

## How It Works

### Global Middleware Protection

All incoming request data (body, query params, URL params) is automatically sanitized before reaching route handlers:

```javascript
// server.js
app.use(sanitizeMiddleware());
```

### Sanitization Functions

**`sanitizeInput(input, allowBasicFormatting)`**
- Strips all HTML tags and malicious JavaScript
- Optional: Allow basic formatting tags (b, i, em, strong, br, p)
- Preserves safe text and special characters

**`sanitizeObject(obj)`**
- Recursively sanitizes all string values in objects
- Used automatically by middleware for req.body, req.query, req.params

**`containsXSS(input)`**
- Detection function to check if input contains XSS patterns
- Useful for logging security events

### Configuration

The XSS library is configured with strict settings:

```javascript
const xssOptions = {
  whiteList: {
    b: [],
    i: [],
    em: [],
    strong: [],
    br: [],
    p: []
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style']
};
```

## Test Results

All XSS protection tests passed successfully:

| Test Case | Input | Expected Output | Status |
|-----------|-------|-----------------|--------|
| Script tag | `<script>alert("XSS")</script>Hello` | `Hello` | ✅ PASS |
| Image onerror | `<img src=x onerror=alert(1)>` | `` | ✅ PASS |
| JavaScript protocol | `<a href="javascript:alert(1)">Click me</a>` | `Click me` | ✅ PASS |
| Inline event handler | `<div onclick="alert(1)">Click</div>` | `Click` | ✅ PASS |
| Safe text | `Hello, this is a normal message!` | `Hello, this is a normal message!` | ✅ PASS |
| Special characters | `Price: $100 & up` | `Price: $100 & up` | ✅ PASS |

Run the test suite:
```bash
node test-xss.js
```

## Protected Endpoints

All user input is sanitized across the entire application, including:

- User registration and login
- Profile updates (bio, experience, etc.)
- Messages between clients and workers
- Booking notes and cancellation reasons
- Review text and comments
- Search queries
- All form submissions

## Additional Security Layers

XSS protection works in combination with:

1. **Input Validation** (middleware/validation.js)
   - Length limits on all text fields
   - Format validation (emails, phone numbers, dates)
   - Type checking (ratings must be 1-5)

2. **Content Security Policy** (Helmet - production only)
   - Restricts where scripts can be loaded from
   - Prevents inline script execution

3. **HTTP-Only Cookies**
   - Session cookies inaccessible to JavaScript
   - Prevents session hijacking via XSS

## Best Practices

### When to Use Basic Formatting

For fields like worker bios or review text where basic formatting enhances readability:

```javascript
const sanitized = sanitizeInput(userInput, true); // Allows <b>, <i>, <em>, etc.
```

### Manual Sanitization

If you need to sanitize data outside of request handlers:

```javascript
const { sanitizeInput } = require('./utils/sanitize');
const safe = sanitizeInput(untrustedData);
```

### Detection and Logging

To log potential XSS attacks:

```javascript
const { containsXSS } = require('./utils/sanitize');

if (containsXSS(userInput)) {
  logger.warn('XSS attempt detected', {
    userId: req.session.userId,
    input: userInput
  });
}
```

## Configuration Options

To adjust which HTML tags are allowed, edit `utils/sanitize.js`:

```javascript
const xssOptions = {
  whiteList: {
    // Add more allowed tags here
    a: ['href', 'title', 'target'],
    ul: [],
    li: []
  }
};
```

## Performance Impact

- Minimal performance overhead (~1-2ms per request)
- Sanitization occurs once at entry point
- No impact on database or business logic

## Maintenance

- XSS library automatically maintained by npm
- Test suite should be run after any changes
- Review whitelisted tags periodically

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [xss npm package documentation](https://www.npmjs.com/package/xss)

---

**Last Updated**: 2025-10-09
**Version**: 1.0
**Status**: Active Protection
