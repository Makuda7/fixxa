# Fixxa Mobile App - App Store Submission Guide

## 📱 iOS App Store Setup

### 1. Prerequisites

#### Apple Developer Account
- Sign up at: https://developer.apple.com/programs/
- Cost: $99/year
- Required for app submission

#### Install EAS CLI
```bash
npm install -g eas-cli
```

#### Login to Expo
```bash
eas login
```

### 2. Create EAS Project

From the FixxaMobile directory:

```bash
cd FixxaMobile
eas build:configure
```

This will:
- Create an EAS project
- Generate a project ID
- Update app.json with the project ID

### 3. Configure App Store Connect

#### Create App in App Store Connect
1. Go to: https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in details:
   - **Platform:** iOS
   - **Name:** Fixxa
   - **Primary Language:** English (US)
   - **Bundle ID:** com.fixxa.app (must match app.json)
   - **SKU:** fixxa-mobile-app-001
   - **User Access:** Full Access

#### App Information
- **Name:** Fixxa
- **Subtitle:** Find Trusted Home Service Professionals
- **Category:** Productivity (Primary), Lifestyle (Secondary)
- **Content Rights:** Does not contain third-party content
- **Age Rating:** 4+ (No objectionable content)

### 4. Privacy Policy & Terms

#### Privacy Policy URL
You need to host a privacy policy. Create one at:
- **Recommended:** https://www.privacypolicygenerator.info/
- **URL to use:** https://www.fixxa.co.za/privacy-policy

#### Privacy Practices in App Store Connect
You'll need to declare:
- **Location Data:** Used to find nearby professionals
- **Contact Info:** Email, phone (for account creation)
- **Photos:** Optional (for profile, portfolio, reviews)
- **Usage Data:** Analytics for app improvement

#### Data Collection Declaration:
- ✅ Name, email address, phone number
- ✅ Approximate location
- ✅ Photos or videos (optional)
- ✅ User ID
- ❌ Financial information (no payment processing)
- ❌ Health data
- ❌ Browsing history

### 5. App Store Screenshots

You need screenshots for:
- **iPhone 6.7" Display** (iPhone 14 Pro Max): 1290 x 2796 pixels (3-10 required)
- **iPhone 6.5" Display** (iPhone 11 Pro Max): 1242 x 2688 pixels (3-10 required)
- **iPhone 5.5" Display** (iPhone 8 Plus): 1242 x 2208 pixels (optional)
- **iPad Pro 12.9" Display**: 2048 x 2732 pixels (optional, if supporting iPad)

#### Recommended Screenshots:
1. **Home Screen** - "Find Trusted Professionals Near You"
2. **Professional Profile** - "View Ratings, Reviews & Portfolios"
3. **Booking Screen** - "Book Services in Minutes"
4. **Messages** - "Communicate Directly with Professionals"
5. **Reviews** - "Read Real Customer Reviews"

#### Tools for Screenshots:
- **Simulator:** Use Xcode iOS Simulator
- **Design Tool:** Figma, Canva, or Sketch
- **Screenshot Framer:** https://www.appscreenshots.com/

### 6. App Icon Requirements

- **Size:** 1024 x 1024 pixels
- **Format:** PNG (no transparency)
- **Color Space:** sRGB or P3
- **Already have:** ./assets/icon.png (verify size)

### 7. Build for iOS

#### Create Production Build
```bash
eas build --platform ios --profile production
```

This will:
- Build your app in the cloud
- Sign it with your Apple certificates
- Generate an .ipa file for submission

#### First Build Setup
On first build, EAS will ask:
- Apple ID credentials
- Apple Team ID
- Create distribution certificate
- Create provisioning profile

**Automatic Setup (Recommended):**
```bash
eas build --platform ios --profile production --auto-submit
```

### 8. Submit to App Store

#### Manual Submission
1. Download the .ipa from EAS dashboard
2. Use Transporter app or Application Loader
3. Upload to App Store Connect
4. Fill in app details
5. Submit for review

#### Automatic Submission (Easier)
```bash
eas submit --platform ios
```

This will:
- Upload to App Store Connect
- Prompt for ASC credentials
- Submit for review automatically

### 9. App Store Listing

#### Description (4000 characters max)
```
Fixxa connects you with verified home service professionals in South Africa. Find trusted electricians, plumbers, HVAC technicians, and more - all in one app.

✨ KEY FEATURES:
• Find professionals near you with geolocation
• View ratings, reviews, and portfolios
• Book services in minutes
• Communicate directly via in-app messaging
• Receive quotes and manage bookings
• Track service completion and payment

🔒 VERIFIED PROFESSIONALS:
All professionals on Fixxa are verified with ID and certification checks. Read real reviews from verified customers.

💼 FOR PROFESSIONALS:
Create a professional profile, showcase your work, receive booking requests, and grow your business.

📍 LOCATION-BASED SEARCH:
Automatically find professionals near you or search by area. See distances and availability at a glance.

⭐ RATINGS & REVIEWS:
Make informed decisions with verified customer reviews and ratings. See professional portfolios before booking.

💬 DIRECT MESSAGING:
Communicate directly with professionals. Share photos, discuss requirements, and get quotes.

🇿🇦 PROUDLY SOUTH AFRICAN:
Built for South African homeowners and service professionals. Supporting local businesses.

Download Fixxa today and find your next trusted home service professional!
```

#### Keywords (100 characters)
```
plumber,electrician,handyman,home services,repairs,maintenance,south africa,local,professionals
```

#### What's New in This Version
```
Initial release of Fixxa mobile app.

Features:
• Find and book local professionals
• Real-time messaging
• Geolocation-based search
• Reviews and ratings
• Secure booking system
```

### 10. App Review Information

#### Contact Information
- **First Name:** [Your First Name]
- **Last Name:** [Your Last Name]
- **Phone Number:** [Your Phone]
- **Email:** fixxaapp@gmail.com

#### Demo Account
Provide test credentials for app reviewers:
- **Username:** reviewer@fixxa.co.za
- **Password:** FixxaReview2024!
- **Notes:** "This account has sample data for review purposes."

#### Review Notes
```
Fixxa is a platform connecting homeowners with verified service professionals in South Africa.

TEST ACCOUNT DETAILS:
- Email: reviewer@fixxa.co.za
- Password: FixxaReview2024!

TESTING INSTRUCTIONS:
1. Login with test account
2. Use location permission to find professionals
3. View professional profiles and reviews
4. Test booking flow (no actual payment required)
5. Test messaging system

LOCATION SERVICES:
- App requires location permission to show nearby professionals
- Can be tested anywhere, but best results in South African locations

IMPORTANT NOTES:
- No payment processing in app (quotes and payments handled externally)
- All professionals are verified with ID and certification checks
- Real-time messaging requires internet connection
```

### 11. Build Commands Reference

#### Development Build (for testing on device)
```bash
eas build --platform ios --profile development
```

#### Preview Build (internal testing)
```bash
eas build --platform ios --profile preview
```

#### Production Build (App Store submission)
```bash
eas build --platform ios --profile production
```

#### Check Build Status
```bash
eas build:list
```

#### Submit to App Store
```bash
eas submit --platform ios --latest
```

### 12. TestFlight Beta Testing

Before full release, test with TestFlight:

1. Build with production profile
2. Submit to TestFlight (not App Store review)
3. Add internal testers (up to 100)
4. Add external testers (up to 10,000)
5. Collect feedback
6. Fix bugs
7. Submit for App Store review

#### Add TestFlight Testers
```bash
eas submit --platform ios --profile production
```

Then in App Store Connect → TestFlight:
- Add testers by email
- They receive invite via email
- Install from TestFlight app

### 13. App Store Review Timeline

- **Initial Review:** 1-7 days (average 24-48 hours)
- **Re-submissions:** Usually faster (1-3 days)
- **Expedited Review:** Available for critical bugs (1 per year)

### 14. Common Rejection Reasons (and how to avoid)

❌ **Incomplete Information**
✅ Provide complete app description, screenshots, and demo account

❌ **Broken Links**
✅ Ensure privacy policy URL works

❌ **Demo Account Issues**
✅ Test demo account thoroughly before submission

❌ **Location Permission Issues**
✅ Clearly explain why location is needed in permission description

❌ **Crashes or Bugs**
✅ Test thoroughly with TestFlight first

❌ **Missing Age Rating**
✅ Complete age rating questionnaire

### 15. Post-Approval Checklist

After approval:
- ✅ Set release date (manual or automatic)
- ✅ Monitor crash reports in App Store Connect
- ✅ Respond to user reviews
- ✅ Track downloads and metrics
- ✅ Plan version updates

### 16. Updating the App

For future versions:

1. Update version in app.json:
```json
{
  "version": "1.1.0",
  "ios": {
    "buildNumber": "2"
  }
}
```

2. Build new version:
```bash
eas build --platform ios --profile production
```

3. Submit update:
```bash
eas submit --platform ios --latest
```

4. Add "What's New" text in App Store Connect

---

## 🤖 Android Google Play Store (Parallel Setup)

Similar steps for Android:

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

### Android-Specific Requirements:
- Google Play Console account ($25 one-time fee)
- Content rating questionnaire
- Target API level 31+
- Data safety form
- Store listing with screenshots

---

## 📞 Support

If you encounter issues:
- Expo Documentation: https://docs.expo.dev
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Apple Developer Forums: https://developer.apple.com/forums/
- Expo Discord: https://chat.expo.dev

---

## ✅ Quick Start Checklist

- [ ] Sign up for Apple Developer Program ($99/year)
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to Expo: `eas login`
- [ ] Configure EAS: `eas build:configure`
- [ ] Create app in App Store Connect
- [ ] Prepare 5-10 screenshots
- [ ] Host privacy policy at fixxa.co.za/privacy-policy
- [ ] Create demo account for reviewers
- [ ] Build production version: `eas build --platform ios --profile production`
- [ ] Submit to TestFlight for beta testing
- [ ] Collect feedback and fix bugs
- [ ] Submit for App Store review
- [ ] Monitor review status in App Store Connect
- [ ] Celebrate launch! 🎉
