# Email Troubleshooting Guide

## Current Issue

**Status:** ❌ Email transporter verification failed: Connection timeout

**Error:** Gmail service is not responding from Railway's servers.

---

## Possible Causes

### 1. Gmail App Password Issues
- App password may have been revoked
- App password may have expired
- 2-Factor Authentication settings changed

### 2. Gmail Security Blocking
- Railway's IP addresses might be blocked by Gmail
- Gmail may require additional verification for server connections
- "Less secure apps" setting (if applicable)

### 3. Network/Firewall Issues
- Railway's outbound SMTP connections blocked
- Port 587 or 465 not accessible
- DNS resolution issues

---

## Solutions

### Option 1: Regenerate Gmail App Password (Recommended First Step)

1. **Go to Google Account Settings:**
   - Visit: https://myaccount.google.com/security
   - Ensure 2-Factor Authentication is enabled

2. **Create New App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select app: "Mail"
   - Select device: "Other (Custom name)" → "Fixxa Server"
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **Update Railway Environment Variable:**
   ```bash
   railway variables --set EMAIL_PASSWORD=<your-new-16-char-password>
   ```

4. **Redeploy:**
   ```bash
   railway up
   ```

---

### Option 2: Switch to SendGrid (Highly Recommended for Production)

SendGrid is more reliable for server-to-server email and offers:
- ✅ Better deliverability
- ✅ No timeout issues
- ✅ Free tier: 100 emails/day
- ✅ Email tracking and analytics
- ✅ Designed for transactional emails

#### Setup Steps:

1. **Create SendGrid Account:**
   - Visit: https://signup.sendgrid.com/
   - Free tier: 100 emails/day (enough for testing)

2. **Create API Key:**
   - Dashboard → Settings → API Keys → Create API Key
   - Name: "Fixxa Production"
   - Permissions: "Full Access" or "Mail Send"
   - Copy the API key (shown only once!)

3. **Verify Sender Email:**
   - Settings → Sender Authentication → Verify a Single Sender
   - Use: fixxaapp@gmail.com
   - Complete verification via email

4. **Update Code:**

   Edit `utils/email.js`:
   ```javascript
   const nodemailer = require('nodemailer');
   const { retryEmailSend } = require('./retry');

   const transporter = nodemailer.createTransport({
     host: 'smtp.sendgrid.net',
     port: 587,
     secure: false, // true for 465, false for other ports
     auth: {
       user: 'apikey', // This is literal 'apikey'
       pass: process.env.SENDGRID_API_KEY
     },
     connectionTimeout: 30000,
     greetingTimeout: 10000,
     socketTimeout: 30000,
     pool: true,
     maxConnections: 5,
     maxMessages: 100
   });
   ```

5. **Set Railway Environment Variables:**
   ```bash
   railway variables --set SENDGRID_API_KEY=<your-api-key>
   railway variables --set EMAIL_SERVICE=sendgrid
   ```

6. **Deploy:**
   ```bash
   git add utils/email.js
   git commit -m "Switch to SendGrid for email delivery"
   git push origin main
   railway up
   ```

---

### Option 3: Use Mailgun

Mailgun offers similar benefits to SendGrid:
- Free tier: 5,000 emails/month for 3 months
- Good deliverability
- Simple API

#### Setup:

1. **Create Account:** https://signup.mailgun.com/
2. **Get SMTP Credentials:**
   - Sending → Domain Settings → SMTP Credentials
3. **Update Railway:**
   ```bash
   railway variables --set EMAIL_SERVICE=Mailgun
   railway variables --set EMAIL_HOST=smtp.mailgun.org
   railway variables --set EMAIL_PORT=587
   railway variables --set EMAIL_USER=postmaster@<your-domain>.mailgun.org
   railway variables --set EMAIL_PASSWORD=<your-smtp-password>
   ```

---

### Option 4: Use AWS SES (Most Scalable)

AWS Simple Email Service:
- Very cheap: $0.10 per 1,000 emails
- Highly scalable
- Excellent deliverability

#### Setup:

1. **Create AWS Account:** https://aws.amazon.com/
2. **Set up SES:** https://console.aws.amazon.com/ses/
3. **Verify Email Address**
4. **Request Production Access** (initially in sandbox mode)
5. **Get SMTP Credentials**
6. **Configure Railway:**
   ```bash
   railway variables --set EMAIL_SERVICE=SES
   railway variables --set EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
   railway variables --set EMAIL_PORT=587
   railway variables --set EMAIL_USER=<your-smtp-user>
   railway variables --set EMAIL_PASSWORD=<your-smtp-password>
   ```

---

## Testing Email Configuration

### Test Locally First

1. **Create test script** `test-email.js`:
   ```javascript
   require('dotenv').config();
   const { sendEmail } = require('./utils/email');
   const logger = require('./config/logger');

   async function test() {
     console.log('Testing email configuration...');
     console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
     console.log('EMAIL_USER:', process.env.EMAIL_USER);

     try {
       await sendEmail(
         'your-email@example.com',
         'Test Email from Fixxa',
         '<h1>Test Email</h1><p>If you receive this, email is working!</p>',
         logger
       );
       console.log('✅ Test email sent successfully!');
     } catch (error) {
       console.error('❌ Test email failed:', error);
     }
   }

   test();
   ```

2. **Run test:**
   ```bash
   node test-email.js
   ```

3. **Check your inbox** for the test email

---

## Current Configuration

```bash
EMAIL_SERVICE=gmail
EMAIL_USER=fixxaapp@gmail.com
EMAIL_PASSWORD=svtnmpqmfmbllfxh (App password)
EMAIL_FROM=Fixxa App <fixxaapp@gmail.com>
```

---

## Recommended Action Plan

### Immediate (Choose one):

**Option A: Quick Fix (Try First)**
1. Regenerate Gmail app password
2. Update Railway variable
3. Redeploy
4. Test booking/cancellation

**Option B: Better Solution (Recommended for Production)**
1. Sign up for SendGrid free tier
2. Get API key
3. Update code to use SendGrid
4. Deploy
5. Test thoroughly

### Why SendGrid/Mailgun > Gmail for Production?

| Feature | Gmail | SendGrid/Mailgun |
|---------|-------|------------------|
| Reliability | ⚠️ Timeout issues | ✅ 99.9% uptime |
| Deliverability | ⚠️ May be flagged as spam | ✅ Optimized for transactional emails |
| Rate Limits | ⚠️ Strict & unclear | ✅ Clear limits (100-5000/day free) |
| Analytics | ❌ None | ✅ Open rates, clicks, bounces |
| Support | ❌ No support | ✅ Email support |
| Scaling | ❌ Not designed for it | ✅ Built for scale |
| Cost | ✅ Free | ✅ Free tier available |

---

## Testing Checklist

After fixing, test these scenarios:

- [ ] Create new booking → Both client and pro receive emails
- [ ] Cancel booking → Both receive cancellation emails
- [ ] Complete job → Client receives completion email
- [ ] Worker approves booking → Client notified
- [ ] Password reset → User receives reset link
- [ ] Certificate submission → Admin receives notification
- [ ] Registration → Welcome email sent

---

## Monitoring Email Health

### Check Logs for Email Status

```bash
# Railway logs
railway logs --tail 100 | grep -i email

# Look for:
✅ Email transporter is ready to send emails  # Good!
❌ Email transporter verification failed      # Bad!
✅ Email sent to user@example.com            # Success!
❌ Email error (user@example.com)            # Failed!
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| ETIMEDOUT | Connection timeout | Check network, increase timeout, or switch provider |
| EAUTH | Authentication failed | Verify EMAIL_USER and EMAIL_PASSWORD |
| ESOCKET | Socket error | Network issue, check firewall |
| 550 | Recipient rejected | Invalid email address |
| 554 | Message rejected | Spam filters or blacklist |

---

## Support

If issues persist:

1. **Check Railway logs:** `railway logs --tail 100`
2. **Verify environment variables:** `railway variables | grep EMAIL`
3. **Test locally first:** Run `node test-email.js`
4. **Check Gmail account:** Verify 2FA and app passwords are set up
5. **Consider switching to SendGrid** for reliability

---

## Quick Commands Reference

```bash
# View current email config
railway variables | grep EMAIL

# Update Gmail app password
railway variables --set EMAIL_PASSWORD=<new-password>

# Switch to SendGrid
railway variables --set SENDGRID_API_KEY=<api-key>

# View logs
railway logs --tail 50 | grep -i email

# Redeploy
railway up

# Check email delivery in Railway
railway logs --follow
# Then trigger a booking/cancellation in the app
```

---

**Last Updated:** October 26, 2025
**Status:** Email connection timeout issue identified
**Recommended Solution:** Switch to SendGrid or regenerate Gmail app password
