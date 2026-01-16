# Fixxa Mobile App - Google Play Store Submission Guide

## 📱 Android Play Store Setup

### 1. Prerequisites

#### Google Play Console Account
- Sign up at: https://play.google.com/console/signup
- **Cost: $25 one-time fee** (lifetime access)
- Required for app submission
- Business or Personal account (choose based on your needs)

#### Install EAS CLI (if not done already)
```bash
npm install -g eas-cli
eas login
```

### 2. Already Configured ✅

In `app.json`:
- ✅ **Package Name:** com.fixxa.app
- ✅ **Version Code:** 1
- ✅ **App Name:** Fixxa
- ✅ **Version:** 1.0.0
- ✅ **Permissions:** Location, Camera, Storage
- ✅ **Adaptive Icon:** Configured

### 3. Create Google Play Console Account

#### Step-by-Step:
1. Go to: https://play.google.com/console/signup
2. Sign in with your Google account
3. Accept Developer Agreement
4. Pay $25 registration fee
5. Complete identity verification
6. Wait for approval (usually instant, can take 48 hours)

#### Account Information Needed:
- Developer name: "Fixxa"
- Developer email: fixxaapp@gmail.com
- Developer website: https://www.fixxa.co.za
- Developer address: [Your business address in South Africa]

### 4. Create App in Play Console

1. Go to: https://play.google.com/console
2. Click "Create app"
3. Fill in details:

**App Details:**
- App name: **Fixxa**
- Default language: **English (United States) - en-US**
- App or game: **App**
- Free or paid: **Free**

**Declarations:**
- [ ] Check: This app provides access to sensitive data (user accounts, location)
- [ ] Check: This app follows Play policies
- [ ] Check: This app complies with US export laws

4. Click "Create app"

### 5. Store Listing

#### App Details

**App name:** Fixxa

**Short description (80 characters max):**
```
Find verified home service professionals in South Africa quickly and easily
```

**Full description (4000 characters max):**
```
Fixxa connects you with verified home service professionals across South Africa. Find trusted electricians, plumbers, HVAC technicians, handymen, and more - all in one convenient app.

✨ KEY FEATURES

🔍 FIND PROFESSIONALS NEAR YOU
• Geolocation-based search
• See professionals within your area
• View distances and availability
• Filter by service type and ratings

✅ VERIFIED PROFESSIONALS
• ID verification required
• Certification checks
• Real customer reviews
• Verified portfolio photos

💼 EASY BOOKING SYSTEM
• Book services in minutes
• Get quotes before committing
• Track booking status
• Receive service reminders

💬 DIRECT MESSAGING
• Communicate with professionals
• Share photos and requirements
• Discuss pricing and schedules
• Get instant responses

⭐ RATINGS & REVIEWS
• Read verified customer reviews
• See professional ratings
• View before/after photos
• Make informed decisions

📸 PROFESSIONAL PORTFOLIOS
• Browse completed work
• View professional credentials
• See specializations
• Check availability

🔔 SMART NOTIFICATIONS
• Booking confirmations
• Status updates
• Service reminders
• New message alerts

💰 TRANSPARENT PRICING
• Request detailed quotes
• Compare multiple quotes
• No hidden fees
• Pay professionals directly

FOR HOMEOWNERS:
• Post service requests
• Receive multiple quotes
• Choose your professional
• Rate and review services

FOR PROFESSIONALS:
• Create professional profile
• Showcase your work
• Receive job requests
• Grow your business
• Build your reputation

🇿🇦 PROUDLY SOUTH AFRICAN
Built specifically for South African homes and businesses. Supporting local service professionals and connecting communities.

AVAILABLE SERVICES:
• Electricians
• Plumbers
• HVAC Technicians
• Handymen
• Carpenters
• Painters
• Cleaners
• Garden Services
• And more!

SAFETY & SECURITY:
• All professionals verified
• Secure messaging system
• Protected user data
• POPIA compliant

Download Fixxa today and connect with trusted professionals in your area!

Support: support@fixxa.co.za
Website: www.fixxa.co.za
```

#### Graphics

**App icon:**
- Size: 512 x 512 pixels
- Format: 32-bit PNG
- No transparency
- Location: Check `./assets/icon.png` (verify it's 512x512 or larger)

**Feature graphic (Required):**
- Size: 1024 x 500 pixels
- Format: JPEG or PNG
- No transparency
- Create with app logo and tagline: "Find Trusted Professionals"

**Phone screenshots (Required):**
- Minimum 2, maximum 8 screenshots
- JPEG or 24-bit PNG (no alpha)
- Minimum dimension: 320px
- Maximum dimension: 3840px
- Recommended: 1080 x 1920 (portrait) or 1920 x 1080 (landscape)

**Recommended screenshots:**
1. Home screen with professional listings
2. Professional profile with reviews and ratings
3. Booking screen with quote details
4. Messages screen showing communication
5. Your profile/account settings
6. Search/filter screen
7. Reviews and ratings page
8. Portfolio/gallery view

**7-inch tablet screenshots (Optional but recommended):**
- 1024 x 1600 or 1200 x 1920

**10-inch tablet screenshots (Optional):**
- 1536 x 2048 or 1600 x 2560

**Promo video (Optional but recommended):**
- YouTube URL to 30-120 second video
- Shows app features
- Can increase downloads by 20-30%

#### Categorization

**App category:**
- **Primary:** Productivity
- **Secondary:** Business (if available)

**Tags (up to 5):**
- Home Services
- Local Services
- Professionals
- Home Repair
- South Africa

**Content rating:**
- Complete questionnaire
- Expected rating: **Everyone** or **PEGI 3**

### 6. Content Rating

Complete the content rating questionnaire:

**Key Questions:**
- Contains violence? **No**
- Contains sexual content? **No**
- Contains profanity? **No**
- Contains drugs/alcohol? **No**
- User-generated content? **Yes** (reviews, messages)
- Share user location? **Yes** (with permission)
- Unrestricted web access? **No**

**Result:** Should be rated **Everyone** (all ages)

### 7. Privacy Policy

**Privacy Policy URL (Required):**
```
https://www.fixxa.co.za/privacy-policy
```

**Important:**
- Must be hosted before submission
- Must be accessible via HTTPS
- Use PRIVACY_POLICY.md content
- Upload to your website

### 8. Data Safety

Declare what data you collect:

#### Location
- [ ] **Approximate location** - Yes
- Purpose: App functionality (find nearby professionals)
- Optional: No (required for core features)
- User control: Can deny permission

#### Personal Info
- [ ] **Name** - Yes
- [ ] **Email address** - Yes
- [ ] **Phone number** - Yes
- Purpose: Account creation and communication
- Optional: No
- Encrypted in transit: Yes

#### Photos and Videos
- [ ] **Photos** - Yes
- Purpose: Profile pictures, portfolios, service documentation
- Optional: Yes (can use app without)
- User control: Can delete

#### Messages
- [ ] **Text messages** - Yes (in-app messaging)
- Purpose: Communication with professionals
- Optional: No (for booking communication)

#### App Activity
- [ ] **App interactions** - Yes
- Purpose: Analytics, app improvement
- Optional: No

**Data sharing:**
- Shared with service providers: Yes (booking information)
- Shared with third parties: No (no data selling)
- Shared for analytics: Yes (anonymous usage data)

**Data security:**
- [ ] Data encrypted in transit (HTTPS/SSL)
- [ ] Users can request data deletion
- [ ] Committed to Google Play Families Policy

### 9. Generate Signing Keystore

For production builds, you need a signing key:

#### Option 1: Let EAS Manage (Recommended)
EAS will automatically create and manage your keystore:
```bash
eas build --platform android --profile production
```

EAS will:
- Generate keystore automatically
- Store it securely in cloud
- Use it for all future builds
- Handle key management

#### Option 2: Create Your Own Keystore
If you prefer to manage it yourself:

```bash
# Generate keystore (one-time)
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore fixxa-release-key.keystore \
  -alias fixxa-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Important:** Save this keystore file safely!
- Keep multiple backups
- Store password securely
- If lost, you can never update your app

**Keystore credentials (example):**
- Keystore password: [Create strong password]
- Key alias: fixxa-key-alias
- Key password: [Same or different password]

### 10. Build Production APK/AAB

#### Build App Bundle (AAB) - Recommended for Play Store
```bash
cd FixxaMobile
eas build --platform android --profile production
```

This will:
- Build Android App Bundle (.aab)
- Sign with your keystore
- Optimize for all device types
- Upload to EAS servers

Build time: ~15-20 minutes

#### Download AAB
After build completes:
1. Check email for build notification
2. Or visit: https://expo.dev/accounts/[your-account]/projects/fixxa/builds
3. Download the .aab file

### 11. Create Internal Testing Track (Recommended)

Before releasing to production:

1. In Play Console → Testing → Internal testing
2. Click "Create new release"
3. Upload your AAB file
4. Add release notes:
```
Initial release of Fixxa mobile app.

New in this version:
• Find and book local professionals
• Geolocation-based search
• Real-time messaging
• Reviews and ratings
• Professional profiles and portfolios
• Secure booking system
```

5. Add testers by email (up to 100)
6. Save and publish to internal testing

**Test for 1-2 weeks:**
- Install from internal testing
- Test all features
- Fix bugs
- Release new version if needed

### 12. Set Up App Releases

#### Production Release (After Testing)

1. Go to Play Console → Production
2. Click "Create new release"
3. Upload your signed AAB
4. Fill in release details:

**Release name:** 1.0.0 (matches app version)

**Release notes:**
```
Welcome to Fixxa!

Find verified home service professionals in South Africa:
✓ Search by location and service type
✓ View ratings, reviews, and portfolios
✓ Book services and communicate directly
✓ Get quotes and manage bookings
✓ Track service completion

This is our initial release. We're constantly improving based on your feedback!
```

5. Save (don't publish yet)

### 13. Complete All Checklists

Before you can publish:

**Required:**
- [ ] Store listing complete (title, description, screenshots)
- [ ] Content rating completed
- [ ] Privacy policy URL added
- [ ] Data safety form completed
- [ ] App category selected
- [ ] Target audience declared

**App content:**
- [ ] Ads declaration (No ads? Declare it)
- [ ] In-app purchases (None for now)
- [ ] Content guidelines compliance
- [ ] Target API level 33+ (handled by EAS)

**Pricing & distribution:**
- [ ] Countries: South Africa (at minimum)
- [ ] Can expand to: Worldwide
- [ ] Pricing: Free
- [ ] Distribution: Google Play

### 14. Submit for Review

1. Review all information
2. Click "Send for review" or "Publish"
3. Wait for review results

**Review timeline:**
- Usually 1-7 days
- Often within 24-48 hours
- Can expedite if needed

### 15. After Approval

**Your app is live!**
- [ ] Share Play Store link
- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback
- [ ] Check crash reports in Play Console
- [ ] Plan updates

**Play Store URL will be:**
```
https://play.google.com/store/apps/details?id=com.fixxa.app
```

### 16. Updating Your App

For future versions:

**1. Update version in app.json:**
```json
{
  "version": "1.1.0",
  "android": {
    "versionCode": 2
  }
}
```

**2. Build new version:**
```bash
eas build --platform android --profile production
```

**3. Create new release:**
- Upload new AAB to Play Console
- Add "What's new" text
- Choose release type:
  - Internal testing (test first)
  - Closed testing (beta users)
  - Open testing (public beta)
  - Production (full release)

**4. Staged rollout (recommended):**
- Start with 10% of users
- Monitor for crashes
- Increase to 25%, 50%, 100%
- Can halt rollout if issues found

### 17. Build Commands Reference

```bash
# Development build (for testing on device)
eas build --platform android --profile development

# Preview build (internal testing APK)
eas build --platform android --profile preview

# Production build (Play Store AAB)
eas build --platform android --profile production

# Check build status
eas build:list

# Submit to Play Store
eas submit --platform android --latest
```

### 18. Content Rating Questionnaire Answers

**Category 1: Violence**
- Does app depict violence? **No**
- Does app contain blood? **No**

**Category 2: Sexual Content**
- Does app contain sexual content? **No**
- Does app contain nudity? **No**

**Category 3: Profanity**
- Does app contain profanity? **No**

**Category 4: Drugs**
- Does app reference drugs/alcohol? **No**

**Category 5: User Interaction**
- Users can interact? **Yes** (messaging, reviews)
- Users can share location? **Yes** (optional)
- Unrestricted web access? **No**
- Users can make purchases? **No** (booking only, payment external)

**Category 6: User-Generated Content**
- Contains user-generated content? **Yes** (reviews, messages)
- Moderation implemented? **Yes** (profanity filter, reporting)

### 19. Screenshots Template

Create these 5 core screenshots:

**Screenshot 1: Home/Search**
- Show professional listings
- Highlight geolocation feature
- Caption: "Find Professionals Near You"

**Screenshot 2: Professional Profile**
- Display ratings and reviews
- Show portfolio photos
- Caption: "View Verified Reviews & Portfolios"

**Screenshot 3: Booking**
- Show booking form
- Display quote details
- Caption: "Book Services in Minutes"

**Screenshot 4: Messaging**
- Show chat interface
- Highlight direct communication
- Caption: "Communicate Directly"

**Screenshot 5: Reviews**
- Show review list
- Display ratings
- Caption: "Real Customer Reviews"

**Tools for Screenshots:**
- Android Studio Emulator
- Physical Android device
- Online tools: https://screenshots.pro/
- Figma/Canva for designs
- Fiverr designers ($20-50)

### 20. Play Store Listing Optimization

**Keywords to include naturally:**
- Home services
- Plumber
- Electrician
- Handyman
- South Africa
- Local professionals
- Service booking
- Home repair
- Verified professionals
- Reviews and ratings

**Title (50 characters max):**
```
Fixxa - Find Home Service Professionals
```

**Short description (80 characters max):**
```
Find verified plumbers, electricians & home service pros in South Africa
```

### 21. Common Rejection Reasons

❌ **Incomplete content rating**
✅ Complete all questionnaire sections

❌ **Missing privacy policy**
✅ Host privacy policy and add URL

❌ **Unclear app functionality**
✅ Provide clear screenshots and description

❌ **Insufficient screenshots**
✅ Provide at least 2, ideally 5-8

❌ **Missing data safety info**
✅ Complete data safety section thoroughly

❌ **Target API level too low**
✅ EAS handles this automatically (targets latest)

❌ **App crashes**
✅ Test thoroughly before submission

### 22. Service Account for Automated Submissions

For `eas submit` automation:

1. In Play Console → Setup → API access
2. Create service account
3. Grant permissions
4. Download JSON key
5. Save as `google-play-service-account.json`
6. Add to eas.json (already configured)

**Then auto-submit:**
```bash
eas submit --platform android
```

### 23. Costs Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Google Play Console | $25 | One-time |
| Screenshot Design | $0-50 | One-time |
| Feature Graphic | $0-30 | One-time |
| Promo Video (optional) | $0-200 | One-time |
| **TOTAL** | **$25-305** | - |

**Minimum to start:** Just $25 (can create all assets yourself)

### 24. Timeline Estimate

| Phase | Time |
|-------|------|
| Play Console signup | 1 hour |
| App creation & setup | 2 hours |
| Screenshot creation | 3-5 hours |
| Content rating | 30 mins |
| Data safety form | 30 mins |
| Store listing | 2 hours |
| Build AAB | 20 mins |
| Internal testing | 1-2 weeks |
| Review process | 1-7 days |
| **TOTAL** | **2-3 weeks** |

---

## 📞 Support Resources

- **Play Console Help:** https://support.google.com/googleplay/android-developer
- **Expo EAS Docs:** https://docs.expo.dev/build/introduction/
- **Android Developer Docs:** https://developer.android.com/
- **Play Policy Center:** https://play.google.com/about/developer-content-policy/

---

## ✅ Quick Launch Checklist

- [ ] Create Play Console account ($25)
- [ ] Create app in Play Console
- [ ] Complete store listing
- [ ] Create 5-8 screenshots
- [ ] Host privacy policy
- [ ] Complete content rating
- [ ] Complete data safety form
- [ ] Build production AAB
- [ ] Test with internal testing
- [ ] Submit for review
- [ ] Monitor and respond to reviews
- [ ] Celebrate launch! 🎉

---

**Good luck with your Android launch! 🚀**
