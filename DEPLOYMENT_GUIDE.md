# Fixxa - Production Deployment Guide

## Quick Deploy to Railway (Recommended - 15 minutes)

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser. Sign up with GitHub (it's free, no credit card needed).

### Step 3: Initialize Railway Project

```bash
cd "/Users/kudadunbetter/Desktop/My website/fixxa"
railway init
```

When prompted:
- Project name: **fixxa-beta**
- Select: **Create new project**

### Step 4: Add PostgreSQL Database

```bash
railway add --database postgresql
```

### Step 5: Set Environment Variables

```bash
# Set all required environment variables
railway variables set NODE_ENV=production
railway variables set SESSION_SECRET=b1fe8301983c145a59614ddb8d2c3a7de904f175f822a095d595ee2e183b4c63
railway variables set EMAIL_SERVICE=gmail
railway variables set EMAIL_USER=fixxaapp@gmail.com
railway variables set EMAIL_PASSWORD=svtnmpqmfmbllfxh
railway variables set EMAIL_FROM="Fixxa App <fixxaapp@gmail.com>"
railway variables set ADMIN_EMAILS=fixxaapp@gmail.com
railway variables set MAX_FILE_SIZE=5242880
railway variables set MAX_PHOTOS_PER_UPLOAD=5
railway variables set RATE_LIMIT_WINDOW_MS=900000
railway variables set RATE_LIMIT_MAX_REQUESTS=100
```

**Note:** Railway automatically provides DATABASE_URL for PostgreSQL. Your app will use it.

### Step 6: Deploy Application

```bash
railway up
```

This will:
- Upload your code
- Install dependencies
- Start your server
- Provide you with a public URL

### Step 7: Get Your Production URL

```bash
railway domain
```

This will show your app URL (e.g., `fixxa-beta-production.up.railway.app`)

### Step 8: Run Database Migrations

```bash
# Connect to Railway shell
railway run bash

# Once inside, run migrations
psql $DATABASE_URL -f db/migrations/001_initial_schema.sql

# Exit shell
exit
```

### Step 9: Create Admin Account

```bash
# Run this to create admin account directly in production database
railway run node -e "
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  await pool.query(
    'INSERT INTO admins (email, password, name) VALUES (\$1, \$2, \$3) ON CONFLICT (email) DO NOTHING',
    ['admin@fixxa.com', hashedPassword, 'Admin User']
  );
  console.log('Admin created: admin@fixxa.com / Admin123!');
  await pool.end();
})();
"
```

## Alternative: Render.com Deployment

If Railway doesn't work, use Render.com (also free):

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repo (or upload code)
4. Settings:
   - Name: fixxa-beta
   - Environment: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add PostgreSQL database from dashboard
6. Set environment variables in dashboard
7. Deploy!

## Testing Your Deployment

Once deployed, test these URLs (replace YOUR_URL):

```
https://YOUR_URL/index.html          (Homepage)
https://YOUR_URL/signup.html         (Client signup)
https://YOUR_URL/worker-signup.html  (Worker signup)
https://YOUR_URL/login.html          (Login)
https://YOUR_URL/admin.html          (Admin - admin@fixxa.com / Admin123!)
```

## Create Test Accounts Script

After deployment, run this to create test accounts:

```bash
railway run node scripts/create-test-accounts.js
```

This will create:
- 10 test clients (client1@test.com - client10@test.com)
- 10 test workers (worker1@test.com - worker10@test.com)
- All passwords: Test123!

## Share With Beta Testers

Send them:
1. Production URL: https://YOUR_APP_URL
2. Test credentials (or let them sign up)
3. Quick start guide

---

## Troubleshooting

**Database not connecting?**
```bash
railway logs
```

**Need to check environment variables?**
```bash
railway variables
```

**Need to restart?**
```bash
railway up --detach
```

**Check service status:**
```bash
railway status
```
