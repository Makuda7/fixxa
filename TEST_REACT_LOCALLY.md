# Test React with Production Database - Local Setup

## Prerequisites
✅ Your production database on Railway has real workers, clients, and data
✅ You want to test React locally before deploying

---

## Step 1: Get Your Railway Database URL

```bash
# In your project directory
cd /Users/kudadunbetter/Desktop/My\ website/fixxa

# Get the database URL from Railway
railway variables

# Look for: DATABASE_URL=postgresql://...
# Copy this URL - you'll need it
```

---

## Step 2: Create Local Environment File

Create a `.env.local` file in the project root:

```bash
# Create the file
cat > .env.local << 'EOF'
# Database - PRODUCTION (read-only testing)
DATABASE_URL=postgresql://your-production-database-url-here

# Session
SESSION_SECRET=your-session-secret-here

# Cloudinary (from Railway)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (from Railway)
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Local development
NODE_ENV=development
PORT=3000
EOF
```

**IMPORTANT**: Replace the placeholder values with your actual Railway environment variables.

---

## Step 3: Start Backend Server (Port 3000)

```bash
# Install dependencies if needed
npm install

# Start the backend server
npm start

# You should see:
# ✅ Database connected successfully
# ✅ Server running on http://localhost:3000
```

---

## Step 4: Start React Development Server (Port 3001)

Open a **NEW terminal window**:

```bash
# Navigate to client folder
cd /Users/kudadunbetter/Desktop/My\ website/fixxa/client

# Install dependencies if needed
npm install

# Start React dev server on port 3001
PORT=3001 npm start

# Browser should open automatically to http://localhost:3001
```

---

## Step 5: Test with Real Data

### Test 1: View Existing Workers
1. Open browser to `http://localhost:3001/service`
2. You should see **all your existing verified workers** from production
3. Try searching by location, service type
4. Click on a worker to view their profile

### Test 2: Login with Existing Account
1. Go to `http://localhost:3001/login`
2. **Use your existing production credentials**
3. Login should work with real user account
4. You'll be redirected to your dashboard

### Test 3: View Dashboard Data
1. After login, check your dashboard
2. Should see **real bookings, messages, stats**
3. All data comes from production database

### Test 4: Test Read-Only Operations
- ✅ Browse workers
- ✅ View profiles
- ✅ See reviews and ratings
- ✅ View portfolio photos
- ✅ Check certifications

### Test 5: Test Write Operations (CAREFUL!)
**⚠️ WARNING**: These operations will modify production data!

- Create a test booking (can cancel later)
- Send a test message
- Update your profile

**Recommendation**: Only test read operations, or use a test account.

---

## Step 6: Verify Session Continuity

### Test Cross-Session Functionality:
1. **Login on React** (`http://localhost:3001/login`)
2. **Open another tab** to backend HTML routes (if any exist)
3. Verify you're logged in on both
4. Session cookie should be shared

### Check Session in Browser DevTools:
```javascript
// Open browser console (F12)
// Check cookies
document.cookie

// Should see: connect.sid=...

// Verify session
fetch('http://localhost:3000/auth/status', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('User:', data.user));
```

---

## What You Should See

### ✅ Expected Results:
- **Home Page**: Hero section, featured professionals
- **Service Page**: All verified workers from production
- **Worker Profiles**: Complete profiles with photos, reviews, certifications
- **Login**: Works with existing credentials
- **Dashboard**: Shows real bookings and data
- **Messages**: Real conversations (if any)
- **Settings**: Can view/edit profile
- **Cookie Consent**: Banner appears on first visit

### ❌ Potential Issues & Fixes:

#### Issue 1: "Cannot connect to database"
```bash
# Check DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM workers;"
```

#### Issue 2: "CORS error" in browser console
```javascript
// In server.js, verify CORS allows localhost:3001
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001' // ✅ This should be there
];
```

#### Issue 3: "Session not persisting"
```javascript
// In server.js, verify credentials: true
app.use(cors({
  origin: allowedOrigins,
  credentials: true // ✅ Must be true
}));
```

#### Issue 4: "No workers showing"
```sql
-- Check database has workers
psql $DATABASE_URL -c "SELECT id, name, speciality, approval_status FROM workers LIMIT 5;"

-- Should show approved workers
```

#### Issue 5: Images not loading
```bash
# Cloudinary credentials might be missing
# Check .env.local has:
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## Testing Checklist

### Navigation & Routing
- [ ] Home page loads
- [ ] Navigate to /service
- [ ] Navigate to /about
- [ ] Navigate to /contact
- [ ] Navigate to /faq
- [ ] Navigate to /support (new)
- [ ] Navigate to /terms
- [ ] Navigate to /privacy
- [ ] Navigate to /safety
- [ ] Navigate to /join

### Authentication
- [ ] Register new account (use test email)
- [ ] Login with existing account
- [ ] Logout
- [ ] Forgot password flow
- [ ] Resend verification email
- [ ] Session persists on refresh

### Worker Features (if logged in as worker)
- [ ] View worker dashboard
- [ ] See bookings
- [ ] Update profile
- [ ] Upload portfolio photos
- [ ] Upload certifications
- [ ] View reviews
- [ ] Update availability
- [ ] Send/receive messages

### Client Features (if logged in as client)
- [ ] View client dashboard
- [ ] Search for workers
- [ ] View worker profiles
- [ ] Create booking (test account only!)
- [ ] View booking history
- [ ] Send messages
- [ ] Leave reviews (after completed booking)

### Admin Features (if logged in as admin)
- [ ] View admin dashboard
- [ ] See all workers
- [ ] See all clients
- [ ] Approve/reject workers
- [ ] Approve certifications
- [ ] View statistics

### New Features
- [ ] Cookie consent banner appears
- [ ] Cookie preferences modal works
- [ ] Support page loads with FAQs
- [ ] Worker sharing button works
- [ ] Distance sorting (if location allowed)
- [ ] Dynamic specialties loading
- [ ] Coming soon overlay for pending workers
- [ ] Review photos display
- [ ] Password strength meter
- [ ] Data export button (in Settings)
- [ ] Account deletion flow (DON'T COMPLETE!)

---

## Performance Testing

### Check Load Times:
```javascript
// In browser console (F12)
performance.timing.loadEventEnd - performance.timing.navigationStart
// Should be < 3000ms (3 seconds)
```

### Check Bundle Size:
```bash
# In client folder
npm run build

# Look at output:
# File sizes after gzip:
#   170.92 kB  build/static/js/main.*.js
#   28.55 kB   build/static/css/main.*.css
```

### Check API Response Times:
```javascript
// In browser console
console.time('workers');
fetch('/search/workers?speciality=Plumber', { credentials: 'include' })
  .then(r => r.json())
  .then(data => {
    console.timeEnd('workers');
    console.log('Found:', data.workers.length);
  });
// Should be < 500ms
```

---

## Mobile Testing (Chrome DevTools)

1. **Open DevTools** (F12)
2. **Click device toolbar** (Ctrl+Shift+M)
3. **Select device**: iPhone 12 Pro, iPad, etc.
4. **Test all pages** - should be responsive
5. **Check touch interactions** - buttons, menus, modals

---

## Database Safety Tips

### READ-ONLY Testing (Recommended):
```sql
-- To make testing safer, create a read-only user
-- Run this on Railway database:
CREATE USER readonly_test WITH PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE your_database TO readonly_test;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_test;

-- Use this in .env.local:
DATABASE_URL=postgresql://readonly_test:secure-password@...
```

### Backup Before Testing:
```bash
# Backup production database first
railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# If something goes wrong, restore:
railway run psql $DATABASE_URL < backup_20250121.sql
```

---

## Stopping the Test

### Stop Servers:
```bash
# In terminal running backend (Port 3000)
Ctrl + C

# In terminal running React (Port 3001)
Ctrl + C
```

### Clean Up:
```bash
# Remove local env file (contains production credentials)
rm .env.local

# Clear browser cookies/cache for localhost
# Chrome: DevTools > Application > Clear storage
```

---

## Next Steps After Successful Testing

If everything works locally:

1. **Deploy to Railway Subdomain**: Deploy React to `app.fixxa.co.za`
2. **Beta Test**: Invite 5-10 users to test
3. **Monitor**: Check logs for errors
4. **Collect Feedback**: Get user input
5. **Full Cutover**: Switch `fixxa.co.za` to React

If issues found:
1. **Fix locally first**
2. **Re-test thoroughly**
3. **Document issues in GitHub**
4. **Deploy fixes incrementally**

---

## Support & Troubleshooting

### View Backend Logs:
```bash
# In backend terminal
# All errors and requests logged in real-time
```

### View React Logs:
```bash
# In React terminal
# Compilation errors, warnings shown here
```

### View Browser Console:
```javascript
// F12 > Console tab
// Check for:
// - API errors (red)
// - CORS errors
// - 404s
// - Authentication issues
```

### Check Database Directly:
```bash
# Connect to database
psql $DATABASE_URL

# Run queries
SELECT COUNT(*) FROM workers WHERE approval_status = 'approved';
SELECT COUNT(*) FROM clients;
SELECT COUNT(*) FROM bookings;
```

---

## Emergency Rollback

If you accidentally modify production data:

```bash
# Restore from backup
railway run psql $DATABASE_URL < backup_20250121.sql

# Or rollback specific table:
railway run psql $DATABASE_URL -c "
  DELETE FROM bookings WHERE created_at > '2025-01-21 10:00:00';
"
```

---

## Success Criteria

You're ready to deploy if:
- ✅ All pages load without errors
- ✅ Can login with existing account
- ✅ See real workers and data
- ✅ Images load from Cloudinary
- ✅ Messages work (Socket.io connected)
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Fast load times (< 3s)
- ✅ Session persists
- ✅ Cookie consent works

---

Ready to test? Run the commands above! 🚀
