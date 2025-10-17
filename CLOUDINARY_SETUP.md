# Cloudinary Setup Guide for Fixxa

## What is Cloudinary?

Cloudinary is a cloud-based service for storing and delivering images and documents. We're using it to solve Railway's ephemeral storage issue (files get deleted on redeploy).

## Why Cloudinary?

✅ **Free Tier**: 25GB storage + 25GB bandwidth/month (perfect for beta!)
✅ **Automatic CDN**: Fast delivery worldwide
✅ **Image Optimization**: Automatic resizing and compression
✅ **No Server Storage**: Files persist through deployments
✅ **Supports Images + PDFs**: Perfect for certifications

---

## Step 1: Create Cloudinary Account

1. Go to: https://cloudinary.com/users/register/free
2. Sign up with your email
3. Verify your email address
4. Complete the onboarding survey

---

## Step 2: Get Your Credentials

After signing up, you'll see your **Dashboard**:

1. Click on "Dashboard" in the top menu
2. You'll see three important values:

   ```
   Cloud name: your-cloud-name
   API Key: 123456789012345
   API Secret: ABCdefGHI123jklMNO456pqrSTU
   ```

3. **Keep these secret!** Never commit them to Git

---

## Step 3: Add Credentials to Railway

### Using Railway CLI:

```bash
railway variables --set CLOUDINARY_CLOUD_NAME=your-cloud-name
railway variables --set CLOUDINARY_API_KEY=123456789012345
railway variables --set CLOUDINARY_API_SECRET=ABCdefGHI123jklMNO456pqrSTU
```

### Using Railway Dashboard:

1. Go to: https://railway.com/project/your-project-id
2. Click on your service (fixxa-app)
3. Go to "Variables" tab
4. Click "+ New Variable"
5. Add these three variables:
   - `CLOUDINARY_CLOUD_NAME` = your-cloud-name
   - `CLOUDINARY_API_KEY` = 123456789012345
   - `CLOUDINARY_API_SECRET` = ABCdefGHI123jklMNO456pqrSTU
6. Click "Deploy" to restart with new variables

---

## Step 4: Add to Local .env File

Create or update your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=ABCdefGHI123jklMNO456pqrSTU
```

---

## What Files Are Stored on Cloudinary?

1. **Profile Pictures** (`/fixxa/profile-pictures/`)
   - Worker profile photos
   - Auto-resized to 400x400px

2. **Portfolio Photos** (`/fixxa/portfolio/`)
   - Worker's previous work photos
   - Auto-resized to max 1200x900px

3. **Certifications** (`/fixxa/certifications/`)
   - ID documents (certified copies)
   - Professional certifications
   - Licenses and permits
   - Supports: JPG, PNG, PDF, DOC, DOCX

---

## Folder Structure on Cloudinary

```
fixxa/
├── profile-pictures/
│   ├── worker-1-1234567890.jpg
│   ├── worker-2-1234567891.jpg
│   └── ...
├── portfolio/
│   ├── portfolio-1-1234567892.jpg
│   ├── portfolio-1-1234567893.jpg
│   └── ...
└── certifications/
    ├── cert-1-1234567894.pdf
    ├── cert-2-1234567895.jpg
    └── ...
```

---

## Testing the Integration

### Test 1: Upload Portfolio Photo

1. Login as a worker
2. Go to "Portfolio" section
3. Upload a photo
4. Check Cloudinary dashboard → Media Library → fixxa/portfolio folder
5. Photo should appear there!

### Test 2: Upload Certification

1. Login as a worker
2. Go to "Certifications" section
3. Upload a PDF or image
4. Check Cloudinary dashboard → Media Library → fixxa/certifications folder
5. Document should appear there!

### Test 3: Delete and Verify

1. Delete a portfolio photo or certification
2. Check Cloudinary dashboard
3. File should be gone from Cloudinary too!

---

## Monitoring Usage

### Check Your Usage:

1. Go to Cloudinary Dashboard
2. Click "Usage" in the top menu
3. Monitor:
   - **Storage**: How much space you're using (25GB limit)
   - **Bandwidth**: How much data transferred (25GB/month limit)
   - **Transformations**: Image resizing operations (25,000/month limit)

### For 20 Beta Users:

- **Estimated storage**: 100-500 MB (plenty of room!)
- **Estimated bandwidth**: 1-3 GB/month (well under limit)

---

## Troubleshooting

### Error: "Invalid credentials"

**Problem**: Cloudinary credentials are wrong or not set
**Solution**:
1. Check your Cloudinary dashboard for correct values
2. Make sure Railway variables are set correctly
3. Redeploy after setting variables

### Error: "Resource not found"

**Problem**: Trying to delete a file that doesn't exist
**Solution**: This is normal for old uploads before Cloudinary migration. Error is caught and logged.

### Error: "File upload failed"

**Problem**: File too large or wrong format
**Solution**:
- Portfolio photos: Max 5MB (JPG, PNG, WEBP)
- Certifications: Max 10MB (JPG, PNG, PDF, DOC, DOCX)

---

## Migration from Local Storage

**Important**: Old files uploaded before Cloudinary integration will still be stored locally and may disappear on redeploy. This is expected!

**What happens to old files?**
- They will still work until next Railway redeploy
- After redeploy, they'll be gone
- New uploads will go to Cloudinary and persist forever

**For beta launch**: Since you're starting fresh, all files will go straight to Cloudinary! ✅

---

## Cost Estimation

### Free Tier (Current):
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month
- **Cost: $0/month** ✅

### When You Outgrow Free Tier:

**Plus Plan ($99/month)**:
- 120 GB storage
- 120 GB bandwidth/month
- 200,000 transformations/month

**This happens when you have ~500-1000 active users**

For your 20-user beta → **FREE TIER IS PERFECT!** 🎉

---

## Security Notes

✅ **API Secret is secure**: Stored in Railway environment variables, never exposed to frontend
✅ **Files are private by default**: Only accessible via direct URL
✅ **Automatic backups**: Cloudinary keeps your files safe
✅ **CDN delivery**: Fast and secure file delivery

---

## Need Help?

- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Cloudinary Support**: support@cloudinary.com
- **Railway Docs**: https://docs.railway.com

---

## Quick Setup Checklist

- [ ] Create Cloudinary account
- [ ] Get Cloud Name, API Key, API Secret
- [ ] Add variables to Railway
- [ ] Add variables to local .env
- [ ] Deploy to Railway
- [ ] Test portfolio photo upload
- [ ] Test certification upload
- [ ] Test file deletion
- [ ] Monitor usage in Cloudinary dashboard

**Once complete, your files will persist forever!** 🚀
