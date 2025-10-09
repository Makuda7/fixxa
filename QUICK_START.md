# Fixxa - Quick Start for Beta Testing

## ¡ Super Fast Deployment (15 minutes)

### 1. Deploy to Railway

```bash
cd "/Users/kudadunbetter/Desktop/My website/fixxa"
./deploy.sh
```

This automated script will:
-  Install Railway CLI (if needed)
-  Create your project
-  Add PostgreSQL database
-  Set all environment variables
-  Deploy your app
-  Generate a public URL

### 2. Set Up Database

After deployment completes, run:

```bash
# Run database migration
railway run psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
```

### 3. Create Test Accounts

```bash
# Create 10 clients + 10 workers + 1 admin
railway run node scripts/create-test-accounts.js
```

This will output all test credentials.

### 4. Get Your URL

```bash
railway domain
```

Your app will be at: `https://fixxa-beta-production.up.railway.app` (or similar)

### 5. Test It

Visit: `https://YOUR_URL/index.html`

Try logging in:
- **Admin:** admin@fixxa.com / Test123!
- **Client:** client1@test.com / Test123!
- **Worker:** worker1@test.com / Test123!

### 6. Share With Beta Testers

Update `BETA_TESTER_GUIDE.md` with your production URL and send to testers.

---

## =' Useful Commands

```bash
# Check deployment status
railway status

# View live logs
railway logs

# Connect to database
railway run psql

# Restart service
railway up --detach

# Open in browser
railway open

# Check environment variables
railway variables
```

---

## =ñ Test Accounts Quick Reference

**Password for ALL test accounts:** `Test123!`

**Clients (10):**
- client1@test.com
- client2@test.com
- ... through client10@test.com

**Workers (10):**
- worker1@test.com (Plumber)
- worker2@test.com (Electrician)
- worker3@test.com (Carpenter)
- ... through worker10@test.com

**Admin:**
- admin@fixxa.com

---

## = Troubleshooting

**App not loading?**
```bash
railway logs
```

**Database connection error?**
Check that migration ran successfully:
```bash
railway run psql $DATABASE_URL -c "\dt"
```

**Need to reset database?**
```bash
railway run psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
railway run node scripts/create-test-accounts.js
```

**Environment variable missing?**
```bash
railway variables set VARIABLE_NAME=value
```

---

## =Ê What Your Testers Will Test

1. **Client Flow:**
   - Sign up / Login
   - Search for professionals
   - Book a service
   - Send messages
   - Leave reviews

2. **Worker Flow:**
   - Sign up / Login
   - Complete profile
   - Manage bookings
   - Reply to messages
   - Mark jobs complete

3. **Admin Flow:**
   - Manage users
   - View all bookings
   - Handle deletion requests
   - Platform settings

---

## <¯ Success Metrics

After beta test:
-  20+ bookings created
-  50+ messages exchanged
-  10+ reviews submitted
-  All critical bugs identified
-  User feedback collected

---

## =Þ Support

Issues during deployment?
- Check `DEPLOYMENT_GUIDE.md` for detailed steps
- View logs: `railway logs`
- Railway docs: https://docs.railway.app

---

**Total Time to Beta:** ~15 minutes =€
