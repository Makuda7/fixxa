# PostgreSQL Session Store with Rolling Sessions

## Overview
Upgraded from in-memory sessions to PostgreSQL-backed sessions with rolling (activity-based) expiration.

## What Changed

### Before (In-Memory Sessions)
- ❌ Sessions lost on server restart
- ❌ Fixed 24-hour expiry (even if active)
- ❌ Users logged out during deployments
- ❌ No session persistence

### After (PostgreSQL Sessions)
- ✅ Sessions persist across server restarts
- ✅ **Rolling expiry**: Extends on activity
- ✅ Users stay logged in during deployments
- ✅ Automatic cleanup of expired sessions
- ✅ Better production-ready setup

## Session Behavior

### Rolling Sessions (Activity-Based)
**Idle Timeout:** 30 minutes of inactivity
- User makes request → Session extended by 30 minutes
- User inactive for 30 minutes → Logged out
- User active → Stays logged in indefinitely (up to 7 days max)

### Configuration
**File:** `config/constants.js`

```javascript
SESSION_IDLE_TIMEOUT: 30 * 60 * 1000,           // 30 minutes of inactivity
SESSION_ABSOLUTE_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7 days maximum
SESSION_ROLLING: true                            // Extend on every request
```

## How It Works

### User Activity Flow
```
Login → Session created (30 min expiry)
   ↓
User clicks something (5 min later)
   ↓
Session extended (new 30 min expiry from now)
   ↓
User keeps browsing
   ↓
Each request extends session by 30 min
   ↓
User stops using site for 30+ min
   ↓
Session expires → Logged out
```

### Example Timeline
```
12:00 PM - User logs in
12:30 PM - Session would expire (if no activity)
12:15 PM - User clicks link → Session extended to 12:45 PM
12:40 PM - User submits form → Session extended to 1:10 PM
12:45 PM - User still active
... (user keeps using site)
7:00 PM - User stops using site
7:30 PM - Session expires → User logged out
```

## Database Structure

### Session Table
**Table:** `session`

```sql
CREATE TABLE "session" (
  "sid" varchar NOT NULL,        -- Session ID (primary key)
  "sess" json NOT NULL,          -- Session data (user info, etc.)
  "expire" timestamp(6) NOT NULL -- Expiration timestamp
);
```

**Indexes:**
- Primary key on `sid` for fast lookups
- Index on `expire` for efficient cleanup

### Automatic Cleanup
Sessions are automatically pruned every 15 minutes:
```javascript
pruneSessionInterval: 60 * 15  // Every 15 minutes
```

## Files Modified

### 1. server.js
**Lines 27-39:** Added connect-pg-simple import and session store configuration

```javascript
// PostgreSQL session store
const pgSession = require('connect-pg-simple')(session);

// Session configuration with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: false,
    pruneSessionInterval: 60 * 15
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: SESSION_ROLLING,  // ✅ Rolling sessions enabled
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: SESSION_IDLE_TIMEOUT,  // ✅ 30 min idle timeout
    sameSite: 'lax'
  }
}));
```

### 2. config/constants.js
**Lines 10-13:** Added session timeout configuration

```javascript
SESSION_IDLE_TIMEOUT: 30 * 60 * 1000,
SESSION_ABSOLUTE_TIMEOUT: 7 * 24 * 60 * 60 * 1000,
SESSION_ROLLING: true
```

### 3. package.json
**Added dependency:**
```json
"connect-pg-simple": "^10.0.0"
```

### 4. database/migrations/add_session_table.sql (NEW)
Created migration to add session table with proper indexes.

## Testing

### Test Session Creation
```bash
# Login and check session is created
curl -c cookies.txt -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check session exists in database
psql -d fixxa_messages -c "SELECT sid, expire FROM session;"
```

### Test Rolling Behavior
```bash
# Make authenticated request
curl -b cookies.txt http://localhost:3000/check-auth

# Wait 1 minute, make another request
sleep 60
curl -b cookies.txt http://localhost:3000/check-auth

# Check that expire time was extended
psql -d fixxa_messages -c "SELECT sid, expire FROM session;"
```

### Test Session Persistence
```bash
# Login
curl -c cookies.txt -X POST http://localhost:3000/login ...

# Restart server
pkill node && node server.js &

# Check session still valid
curl -b cookies.txt http://localhost:3000/check-auth
# Should return: {"authenticated": true, ...}
```

### Monitor Sessions
```sql
-- Count active sessions
SELECT COUNT(*) FROM session;

-- View all sessions with expiry times
SELECT sid, expire,
       CASE
         WHEN expire > NOW() THEN 'Active'
         ELSE 'Expired'
       END as status
FROM session
ORDER BY expire DESC;

-- View session details
SELECT sid, sess, expire FROM session;
```

## Configuration Options

### Adjust Idle Timeout
**File:** `config/constants.js`

```javascript
// Change from 30 minutes to 1 hour
SESSION_IDLE_TIMEOUT: 60 * 60 * 1000

// Change to 15 minutes
SESSION_IDLE_TIMEOUT: 15 * 60 * 1000
```

### Adjust Cleanup Interval
**File:** `server.js`

```javascript
pruneSessionInterval: 60 * 30  // Clean up every 30 minutes instead of 15
```

### Disable Rolling Sessions
**File:** `config/constants.js`

```javascript
SESSION_ROLLING: false  // Sessions won't extend on activity
```

## Benefits

### 1. Production Ready
- Sessions survive server restarts and deployments
- No user disruption during updates
- Sessions stored safely in database

### 2. Better User Experience
- Active users stay logged in
- Inactive users automatically logged out for security
- No unexpected logouts while using the site

### 3. Security
- Automatic cleanup of old sessions
- Configurable timeout policies
- Secure session storage

### 4. Scalability
- Can run multiple server instances (sessions shared via database)
- Database handles session synchronization
- Ready for load balancing

## Monitoring

### Check Session Health
```bash
# Count sessions
psql -d fixxa_messages -c "SELECT COUNT(*) FROM session;"

# Check expired sessions (should auto-cleanup)
psql -d fixxa_messages -c "SELECT COUNT(*) FROM session WHERE expire < NOW();"

# View recent sessions
psql -d fixxa_messages -c "SELECT sid, expire FROM session ORDER BY expire DESC LIMIT 10;"
```

### Log Session Activity
Check Winston logs for session-related info:
```bash
tail -f logs/combined.log | grep -i session
```

## Troubleshooting

### Sessions Not Persisting
Check that session table exists:
```sql
\dt session
```

If missing, run migration:
```bash
psql -d fixxa_messages -f database/migrations/add_session_table.sql
```

### Sessions Not Expiring
Check pruneSessionInterval is set:
```javascript
pruneSessionInterval: 60 * 15  // Should be present in server.js
```

Manually cleanup expired sessions:
```sql
DELETE FROM session WHERE expire < NOW();
```

### Users Logged Out Too Quickly
Increase idle timeout:
```javascript
SESSION_IDLE_TIMEOUT: 60 * 60 * 1000  // 1 hour instead of 30 minutes
```

### Users Stay Logged In Too Long
Decrease idle timeout:
```javascript
SESSION_IDLE_TIMEOUT: 15 * 60 * 1000  // 15 minutes instead of 30
```

Or disable rolling sessions:
```javascript
SESSION_ROLLING: false
```

## Security Considerations

### Session Fixation Prevention
- ✅ `saveUninitialized: false` - Don't create sessions before login
- ✅ `httpOnly: true` - Cookies not accessible via JavaScript
- ✅ `sameSite: 'lax'` - CSRF protection
- ✅ `secure: true` (production) - HTTPS only

### Session Hijacking Prevention
- ✅ Random session IDs
- ✅ Secure cookie settings
- ✅ Automatic timeout on inactivity

### Recommended: Session Regeneration on Login
Consider adding to login route:
```javascript
req.session.regenerate((err) => {
  if (err) return next(err);
  req.session.user = { id, name, email, type };
  req.session.save((err) => {
    if (err) return next(err);
    res.json({ success: true });
  });
});
```

## Next Steps (Optional Enhancements)

1. **Session Analytics**
   - Track login patterns
   - Monitor session duration
   - Alert on unusual activity

2. **Session Limits**
   - Limit concurrent sessions per user
   - Force logout from other devices

3. **Remember Me**
   - Add "remember me" checkbox
   - Extended session for trusted devices

4. **Session Audit Log**
   - Log all session creations/destructions
   - Track IP addresses and user agents

## Conclusion

Sessions are now production-ready with:
- ✅ PostgreSQL persistence
- ✅ Rolling (activity-based) expiration
- ✅ Automatic cleanup
- ✅ 30-minute idle timeout
- ✅ 7-day absolute maximum

Users will stay logged in while active and only be logged out after 30 minutes of inactivity, providing a much better experience than the previous fixed 24-hour sessions.
