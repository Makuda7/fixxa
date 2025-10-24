# Virus Scanning Monitoring Guide

## Overview

Fixxa uses **Cloudmersive Virus Scanning API** to protect the platform from malicious file uploads. All file uploads are scanned for viruses and malware before being stored in Cloudinary.

---

## What's Protected

✅ **Certification Uploads** (ID, passport, licenses, certificates)
✅ **Profile Pictures** (workers & clients)
✅ **Review Photos** (client reviews with images)
✅ **Message Images** (images shared in messaging)

---

## How It Works

### Upload Flow:
```
1. User uploads file
   ↓
2. File stored in MEMORY (not cloud yet)
   ↓
3. Cloudmersive scans file for viruses
   ↓
4. IF CLEAN → Upload to Cloudinary → Save to database
   ↓
5. IF INFECTED → Block upload → Show error to user → Log incident
```

### Graceful Degradation:
- If Cloudmersive API is down or fails, **files are ALLOWED** through
- A warning is logged for manual review
- Platform continues to work (doesn't break)

---

## Monitoring Virus Scans

### 1. **View All Scan Activity (Railway Logs)**

```bash
# View recent scans
railway logs --tail 100 | grep "virus\|scan\|VIRUS"

# View scan results
railway logs --tail 100 | grep "passed virus scan\|SCAN"

# View blocked uploads
railway logs --tail 100 | grep "VIRUS DETECTED"
```

### 2. **Common Log Messages**

#### ✅ **Clean File (Allowed)**
```
Scanning certification for viruses { workerId: 123, fileName: 'license.pdf' }
Certification passed virus scan { workerId: 123, fileName: 'license.pdf', scanResult: 'CLEAN' }
```

#### ⚠️ **Virus Detected (Blocked)**
```
VIRUS DETECTED in certification upload {
  workerId: 123,
  fileName: 'malware.exe',
  viruses: ['Trojan.Generic.12345']
}
```

#### ⚠️ **Scan Failed (Allowed with Warning)**
```
Virus scan failed - allowing upload with warning {
  fileName: 'photo.jpg',
  warning: 'Virus scan service unavailable - file allowed'
}
```

---

## Railway Dashboard Monitoring

### Check Logs in Real-Time:

1. Go to https://railway.com/project/460fbe99-17a8-4aae-8fa8-5c773d6291b5
2. Click on **fixxa-app** service
3. Click **Logs** tab
4. Search for: `virus`, `scan`, `VIRUS DETECTED`

### Filter by Upload Type:

```bash
# Certification scans
railway logs | grep "Scanning certification"

# Profile picture scans
railway logs | grep "Scanning profile picture"

# Review photo scans
railway logs | grep "Scanning review photo"

# Message image scans
railway logs | grep "Scanning message image"
```

---

## Database Tracking (Future Enhancement)

Currently, virus scan results are **logged only**. For better tracking, you can add a database table:

```sql
CREATE TABLE virus_scan_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_type VARCHAR(20),
  file_name VARCHAR(255),
  file_type VARCHAR(50), -- 'certification', 'profile_pic', 'review_photo', 'message_image'
  scan_result VARCHAR(20), -- 'CLEAN', 'INFECTED', 'SCAN_FAILED_ALLOWED'
  viruses_found JSONB, -- Array of virus names
  action_taken VARCHAR(20), -- 'allowed', 'blocked'
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups
CREATE INDEX idx_virus_scans_user ON virus_scan_logs(user_id, user_type);
CREATE INDEX idx_virus_scans_result ON virus_scan_logs(scan_result);
CREATE INDEX idx_virus_scans_date ON virus_scan_logs(scanned_at);
```

---

## Cloudmersive Account Monitoring

### Check API Usage:

1. Go to https://cloudmersive.com
2. Login with your account
3. Click **Dashboard** → **API Usage**
4. Monitor:
   - **Requests Used** (max 800/month on free tier)
   - **Requests Remaining**
   - **Usage Graph**

### Free Tier Limits:
- **800 API calls/month**
- **Resets:** First day of each month
- **Upgrade:** If you exceed 800 scans/month

### What Happens if Limit Exceeded:
- API returns error
- Files are **ALLOWED** through (graceful degradation)
- Warning logged: "Virus scan service unavailable"
- **Action:** Upgrade to paid plan or wait for reset

---

## Alert Setup (Recommended)

### 1. Email Alerts for Virus Detections

Add this to your logging system (integrate with email):

```javascript
// In utils/virusScanner.js, after line 60:
if (!isClean) {
  // Send email alert to admin
  await sendEmail(
    'admin@fixxa.com',
    'SECURITY ALERT: Virus Detected',
    `
    <h2>🚨 Virus Detected on Fixxa</h2>
    <p><strong>User ID:</strong> ${userId}</p>
    <p><strong>File:</strong> ${fileName}</p>
    <p><strong>Viruses:</strong> ${foundViruses.join(', ')}</p>
    <p><strong>Action:</strong> Upload blocked</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    `
  );
}
```

### 2. Slack Notifications (Optional)

Use Railway webhooks to send virus detection alerts to Slack:

1. Create Slack Incoming Webhook
2. Add webhook URL to Railway environment variables
3. Update virus scanner to POST to webhook on detection

---

## Testing the System

### Test with EICAR Test File:

**EICAR** is a harmless test file that all antivirus systems detect as malware.

```bash
# Create EICAR test file (standard antivirus test)
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt
```

**Steps:**
1. Try to upload `eicar.txt` as a certification
2. Should be **BLOCKED** with error: "File failed security scan"
3. Check logs for: `VIRUS DETECTED` message
4. Verify user sees: "File failed security scan - malware detected"

**Expected Result:**
- ❌ Upload blocked
- ✅ User sees error message
- ✅ Logs show virus detection
- ✅ File NOT saved to Cloudinary

---

## Troubleshooting

### Issue: "All scans showing SCAN_FAILED_ALLOWED"

**Cause:** Cloudmersive API key invalid or quota exceeded

**Solution:**
1. Check API key in Railway:
   ```bash
   railway variables | grep CLOUDMERSIVE
   ```
2. Verify key is correct: `694c1c1f-9dd2-4307-8acb-b514a413c236`
3. Check Cloudmersive dashboard for quota limits

### Issue: "Files uploading without scan logs"

**Cause:** Virus scanner not being called

**Solution:**
1. Check routes are using new memory storage
2. Verify `scanFile()` is called before Cloudinary upload
3. Check for errors in server logs

### Issue: "Uploads taking too long"

**Cause:** Virus scanning adds ~1-3 seconds per upload

**Solution:**
- This is expected behavior for security
- Inform users: "Scanning file for security..."
- Consider adding loading indicator on frontend

---

## Security Best Practices

1. **Monitor Daily:** Check logs for virus detections daily
2. **Review Allowed Scans:** Check warnings for "SCAN_FAILED_ALLOWED"
3. **Keep API Key Secret:** Never commit to Git or share publicly
4. **Rotate Keys:** Change API key if exposed
5. **Backup Plan:** Have manual review process for flagged files
6. **User Education:** Tell users files are scanned for their safety

---

## Cost Monitoring

### Current Setup:
- **Free Tier:** 800 scans/month
- **Cost if Exceeded:** $0

### Estimated Usage:
- **Certifications:** ~50/month
- **Profile Pics:** ~100/month
- **Review Photos:** ~200/month
- **Message Images:** ~300/month
- **Total:** ~650/month ✅ Within free tier

### When to Upgrade:
- If traffic grows beyond 800 uploads/month
- Paid tiers: https://cloudmersive.com/pricing
- **Startup Plan:** $19/month (5,000 scans)
- **Business Plan:** $49/month (25,000 scans)

---

## Support & Help

- **Cloudmersive Docs:** https://cloudmersive.com/virus-api
- **API Status:** https://status.cloudmersive.com
- **Support:** support@cloudmersive.com
- **Fixxa Logs:** `railway logs --tail 100 | grep virus`

---

## Summary

✅ All file uploads are scanned for viruses
✅ Infected files are automatically blocked
✅ System degrades gracefully if scanning fails
✅ Full logging for audit trail
✅ Free tier covers expected usage
✅ Platform security significantly improved

**Next Steps:**
1. Monitor logs weekly for virus detections
2. Set up email alerts for security incidents
3. Test with EICAR file to verify blocking works
4. Review Cloudmersive usage monthly
