# Android Play Store Submission Checklist

## ✅ Configuration Complete

- [x] **Package Name:** com.fixxa.app
- [x] **App Name:** Fixxa
- [x] **Version:** 1.0.0
- [x] **Version Code:** 1
- [x] **Permissions:** Location, Camera, Storage
- [x] **Adaptive Icon:** Configured
- [x] **EAS Build Config:** eas.json ready

---

## 📋 Next Steps (Do These in Order)

### 1. Create Google Play Console Account (Cost: $25 one-time)
- [ ] Go to: https://play.google.com/console/signup
- [ ] Sign in with Google account
- [ ] Accept Developer Distribution Agreement
- [ ] Pay $25 registration fee (one-time, lifetime)
- [ ] Complete identity verification
- [ ] Wait for approval (usually instant)
- [ ] Note your developer account name

**What you need:**
- Google account
- Credit card for $25 fee
- Developer name: Fixxa
- Developer email: fixxaapp@gmail.com
- Website: https://www.fixxa.co.za

### 2. Create App in Play Console
- [ ] Go to Play Console → All apps → Create app
- [ ] Fill in:
  - App name: **Fixxa**
  - Default language: **English (United States)**
  - App or game: **App**
  - Free or paid: **Free**
- [ ] Accept declarations:
  - [ ] Follows Google Play policies
  - [ ] Complies with US export laws
  - [ ] Developer Program Policies
- [ ] Click "Create app"

### 3. Host Privacy Policy
- [ ] Upload PRIVACY_POLICY.md to your website
- [ ] Make accessible at: https://www.fixxa.co.za/privacy-policy
- [ ] Test URL works and loads correctly
- [ ] Ensure it's HTTPS (secure)

### 4. Complete Store Listing

#### App Details
- [ ] **App name:** Fixxa
- [ ] **Short description (80 chars):**
  ```
  Find verified home service professionals in South Africa quickly and easily
  ```
- [ ] **Full description:** Copy from ANDROID_PLAY_STORE_SETUP.md
- [ ] **App category:** Productivity
- [ ] **Tags:** Home Services, Local Services, Professionals

#### Graphics Assets

**App Icon (Required):**
- [ ] 512 x 512 pixels
- [ ] 32-bit PNG
- [ ] No transparency
- [ ] Verify ./assets/icon.png meets requirements

**Feature Graphic (Required):**
- [ ] Create 1024 x 500 pixel graphic
- [ ] JPEG or PNG
- [ ] Include app logo and tagline
- [ ] No transparency
- [ ] Tools: Canva, Figma, or hire designer

**Phone Screenshots (Minimum 2, Maximum 8):**
- [ ] Screenshot 1: Home screen with listings
- [ ] Screenshot 2: Professional profile
- [ ] Screenshot 3: Booking screen
- [ ] Screenshot 4: Messages
- [ ] Screenshot 5: Reviews
- [ ] Size: 1080 x 1920 (portrait) recommended
- [ ] Format: JPEG or PNG
- [ ] Minimum 2, ideally 5-8 screenshots

**Optional but Recommended:**
- [ ] 7-inch tablet screenshots (1024 x 1600)
- [ ] 10-inch tablet screenshots (1536 x 2048)
- [ ] Promo video (YouTube URL, 30-120 seconds)

### 5. Complete Content Rating
- [ ] Go to Play Console → Content rating
- [ ] Click "Start questionnaire"
- [ ] Answer questions:

**Violence:** No
**Sexual Content:** No
**Profanity:** No
**Drugs/Alcohol:** No
**User Interaction:** Yes (messaging, reviews)
**Location Sharing:** Yes (with permission)
**Unrestricted Web Access:** No
**Purchases:** No (external payments)

- [ ] Submit questionnaire
- [ ] Expected rating: **Everyone** or **PEGI 3**
- [ ] Save rating certificate

### 6. Complete Data Safety Section
- [ ] Go to Play Console → Data safety
- [ ] Declare data collection:

**Location:**
- [x] Approximate location
- Purpose: Find nearby professionals
- Optional: No (required feature)

**Personal Info:**
- [x] Name, email, phone
- Purpose: Account creation
- Optional: No

**Photos:**
- [x] Photos/Videos
- Purpose: Profiles, portfolios
- Optional: Yes

**Messages:**
- [x] In-app messages
- Purpose: Communication
- Optional: No

**Analytics:**
- [x] App interactions
- Purpose: App improvement
- Optional: No

**Data Security:**
- [x] Data encrypted in transit
- [x] Users can request deletion
- [x] Follows Google Play Families Policy

- [ ] Save data safety info

### 7. Set Up Pricing & Distribution
- [ ] Go to Play Console → Pricing & distribution
- [ ] Countries:
  - [x] South Africa (primary)
  - [ ] Optional: Add more countries
  - [ ] Or select "Available in all countries"
- [ ] Pricing: **Free**
- [ ] Content rating: Use generated rating
- [ ] Ads: **No** (declare if app contains ads)
- [ ] Save

### 8. Build Production AAB

```bash
# Make sure you're in FixxaMobile directory
cd FixxaMobile

# Build for production
eas build --platform android --profile production
```

This will:
- [ ] Ask for Android package name (already set: com.fixxa.app)
- [ ] Generate or use existing keystore
- [ ] Build Android App Bundle (.aab)
- [ ] Sign with production keystore
- [ ] Take ~15-20 minutes
- [ ] Email you when complete

**After build completes:**
- [ ] Check email for build notification
- [ ] Download .aab file from EAS dashboard
- [ ] Or note the build ID for direct upload

### 9. Set Up Internal Testing (Recommended)

Before releasing to public:

- [ ] Go to Play Console → Testing → Internal testing
- [ ] Click "Create new release"
- [ ] Upload your .aab file
- [ ] Add release notes:
  ```
  Initial release - testing version

  Features to test:
  • User registration and login
  • Location-based professional search
  • Booking flow
  • Messaging system
  • Reviews and ratings
  ```
- [ ] Add testers by email (yourself, team members)
- [ ] Save and publish to internal testing
- [ ] Install from Play Console internal testing link
- [ ] Test thoroughly for 1-2 weeks
- [ ] Fix any bugs found
- [ ] Build new version if needed

### 10. Prepare for Production Release

After internal testing:

- [ ] Fix all critical bugs
- [ ] Verify all features work
- [ ] Check app doesn't crash
- [ ] Test on multiple devices/Android versions
- [ ] Ensure privacy policy is live
- [ ] Ensure all store listing info is complete

### 11. Create Production Release

- [ ] Go to Play Console → Production
- [ ] Click "Create new release"
- [ ] Upload production AAB (same or new build)
- [ ] Add release notes:
  ```
  Welcome to Fixxa!

  Find verified home service professionals in South Africa:
  ✓ Search by location and service type
  ✓ View ratings, reviews, and portfolios
  ✓ Book services and communicate directly
  ✓ Get quotes and manage bookings
  ✓ Track service completion

  This is our initial release. We're constantly improving!
  ```
- [ ] Review release details
- [ ] Save (don't publish yet)

### 12. Final Review

Before publishing, verify:
- [ ] Store listing complete (title, description, screenshots)
- [ ] App icon uploaded
- [ ] Feature graphic uploaded
- [ ] Minimum 2 screenshots uploaded
- [ ] Content rating completed
- [ ] Data safety completed
- [ ] Privacy policy URL added and working
- [ ] Pricing & distribution set
- [ ] Target API level 33+ (handled by EAS)
- [ ] App tested on real device
- [ ] No crashes or critical bugs

### 13. Submit for Review

- [ ] Review all sections in Play Console
- [ ] Check for any warnings or errors
- [ ] Click "Send X changes for review" or "Start rollout to Production"
- [ ] Confirm submission
- [ ] Wait for review (1-7 days, usually 24-48 hours)

### 14. Monitor Review Status

- [ ] Check Play Console daily for status updates
- [ ] Respond to any Google queries within 24 hours
- [ ] Check email for review updates
- [ ] Be patient - average review time is 1-3 days

### 15. After Approval

When approved:
- [ ] App automatically goes live (or on scheduled date)
- [ ] Share Play Store link:
  ```
  https://play.google.com/store/apps/details?id=com.fixxa.app
  ```
- [ ] Monitor crash reports in Play Console
- [ ] Respond to user reviews
- [ ] Track downloads and ratings
- [ ] Plan version updates

---

## 🚨 Common Mistakes to Avoid

- ❌ **Don't** skip internal testing
- ❌ **Don't** use placeholder screenshots
- ❌ **Don't** forget privacy policy URL
- ❌ **Don't** leave data safety incomplete
- ❌ **Don't** submit without testing on real device
- ❌ **Don't** ignore content rating questionnaire
- ❌ **Don't** use low-quality screenshots
- ❌ **Don't** forget to test with different Android versions

---

## 💰 Cost Breakdown

| Item | Cost | Required? |
|------|------|-----------|
| Google Play Console | $25 | ✅ Yes (one-time) |
| Feature Graphic Design | $0-30 | ❌ Optional (can DIY) |
| Screenshot Design | $0-50 | ❌ Optional (can DIY) |
| Promo Video | $0-200 | ❌ Optional |
| **MINIMUM TOTAL** | **$25** | - |
| **WITH DESIGN HELP** | **$75-305** | - |

---

## ⏱️ Timeline

| Phase | Time Estimate |
|-------|---------------|
| Play Console setup | 1-2 hours |
| Store listing completion | 2-3 hours |
| Screenshot creation | 3-5 hours |
| Content rating & data safety | 1 hour |
| Build production AAB | 30 minutes |
| Internal testing | 1-2 weeks |
| Production submission | 30 minutes |
| Google Play review | 1-7 days |
| **TOTAL** | **2-3 weeks** |

---

## 📱 Screenshot Specifications

Create these 5 core screenshots (1080 x 1920 pixels):

1. **Home/Search Screen**
   - Professional listings
   - Location indicator
   - Caption: "Find Professionals Near You"

2. **Professional Profile**
   - Ratings and reviews
   - Portfolio photos
   - Caption: "Verified Professionals"

3. **Booking Screen**
   - Booking form
   - Quote details
   - Caption: "Easy Booking"

4. **Messages**
   - Chat interface
   - Direct communication
   - Caption: "Communicate Directly"

5. **Reviews**
   - Review list
   - Star ratings
   - Caption: "Real Customer Reviews"

---

## 🔧 Build Commands Reference

```bash
# Development build
eas build --platform android --profile development

# Preview build (internal APK)
eas build --platform android --profile preview

# Production build (Play Store AAB)
eas build --platform android --profile production

# Check build status
eas build:list

# Auto-submit to Play Store (after setup)
eas submit --platform android --latest
```

---

## 📞 Help & Resources

**Need Help?**
- Play Console Help: https://support.google.com/googleplay/android-developer
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Android Developer Guide: https://developer.android.com/

**Stuck?**
- Check Play Console dashboard for specific errors
- Review ANDROID_PLAY_STORE_SETUP.md for detailed guidance
- Join Expo Discord: https://chat.expo.dev

---

## ✅ Ready to Submit?

Your app is ready when ALL are complete:
- ✅ Play Console account created
- ✅ App created in Play Console
- ✅ Store listing complete with all assets
- ✅ Content rating obtained
- ✅ Data safety filled out
- ✅ Privacy policy hosted and linked
- ✅ Production AAB built
- ✅ Internal testing completed
- ✅ All bugs fixed
- ✅ App tested on real device

---

**You've got this! The Android submission process is straightforward when you follow the checklist. Good luck! 🚀**
