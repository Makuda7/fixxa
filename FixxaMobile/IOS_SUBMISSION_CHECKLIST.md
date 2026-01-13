# iOS App Store Submission Checklist

## ✅ Configuration Complete

- [x] **Bundle Identifier:** com.fixxa.app
- [x] **App Name:** Fixxa
- [x] **Version:** 1.0.0
- [x] **Build Number:** 1
- [x] **EAS Build Config:** eas.json created
- [x] **Privacy Policy:** Created
- [x] **Permission Descriptions:** Added (Location, Camera, Photos)

---

## 📋 Next Steps (Do These in Order)

### 1. Apple Developer Account (Cost: $99/year)
- [ ] Go to: https://developer.apple.com/programs/
- [ ] Sign up with Apple ID
- [ ] Pay $99 annual fee
- [ ] Wait for approval (usually instant)
- [ ] Note your **Team ID** (needed later)

### 2. Install Build Tools
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
```
- [ ] EAS CLI installed
- [ ] Logged in to Expo account

### 3. Initialize EAS Project
```bash
cd FixxaMobile
eas build:configure
```
This will:
- [ ] Create EAS project
- [ ] Generate project ID
- [ ] Update app.json automatically

### 4. Create App in App Store Connect
- [ ] Go to: https://appstoreconnect.apple.com
- [ ] Click "My Apps" → "+" → "New App"
- [ ] Fill in:
  - Platform: iOS
  - Name: Fixxa
  - Primary Language: English (US)
  - Bundle ID: com.fixxa.app
  - SKU: fixxa-app-001
- [ ] Save app

### 5. Host Privacy Policy
- [ ] Upload PRIVACY_POLICY.md to your website
- [ ] Make it accessible at: https://www.fixxa.co.za/privacy-policy
- [ ] Test the URL works
- [ ] Add URL to App Store Connect → App Information

### 6. Prepare Screenshots
You need screenshots for these sizes:
- [ ] iPhone 6.7" (1290 x 2796) - 3 to 10 screenshots
  - Home screen with professional listings
  - Professional profile with reviews
  - Booking screen
  - Messages screen
  - Your profile/settings

- [ ] iPhone 6.5" (1242 x 2688) - 3 to 10 screenshots
  - Same screens as above

**How to create:**
- Use iOS Simulator in Xcode
- Or use online tools like: https://www.appscreenshots.com/
- Or hire on Fiverr ($20-50)

### 7. Prepare App Icon
- [ ] Verify ./assets/icon.png is 1024x1024 pixels
- [ ] No transparency
- [ ] High quality PNG
- [ ] Upload to App Store Connect

### 8. Create Demo Account
- [ ] Create test account in your system:
  - Email: reviewer@fixxa.co.za
  - Password: FixxaReview2024!
  - Add sample booking data
  - Verify it works
- [ ] Document credentials for App Store reviewers

### 9. Fill Out App Information in App Store Connect

#### App Information
- [ ] Name: Fixxa
- [ ] Subtitle: Find Trusted Home Service Professionals
- [ ] Privacy Policy URL: https://www.fixxa.co.za/privacy-policy

#### Category
- [ ] Primary: Productivity
- [ ] Secondary: Lifestyle

#### Age Rating
- [ ] Complete questionnaire (should be 4+)

#### App Privacy
- [ ] Data Types Collected:
  - Name, Email, Phone
  - Location (approximate)
  - Photos (optional)
  - User ID
- [ ] Purpose: App functionality, analytics
- [ ] Not linked to user (select appropriately)

### 10. Build Production Version

```bash
cd FixxaMobile
eas build --platform ios --profile production
```

This will:
- [ ] Ask for Apple ID credentials
- [ ] Generate certificates
- [ ] Build app in cloud
- [ ] Take 15-30 minutes
- [ ] Email you when complete

### 11. Test with TestFlight (Recommended)

```bash
eas submit --platform ios
```

Then in App Store Connect:
- [ ] Go to TestFlight tab
- [ ] Add internal testers (yourself, team)
- [ ] Add external testers (beta users)
- [ ] Install from TestFlight app
- [ ] Test thoroughly for 1-2 weeks
- [ ] Fix any bugs
- [ ] Rebuild if needed

### 12. Prepare App Description

Copy from APP_STORE_SETUP.md:
- [ ] App Description (4000 chars)
- [ ] Keywords (100 chars)
- [ ] What's New text
- [ ] Support URL: https://www.fixxa.co.za
- [ ] Marketing URL: https://www.fixxa.co.za

### 13. Submit for Review

In App Store Connect:
- [ ] Upload all screenshots
- [ ] Fill in all app information
- [ ] Add demo account in "App Review Information"
- [ ] Add review notes
- [ ] Select manual release (recommended for first version)
- [ ] Click "Submit for Review"

### 14. Monitor Review Status

- [ ] Check App Store Connect daily
- [ ] Respond to any questions within 24 hours
- [ ] Average review time: 24-48 hours
- [ ] Be patient!

### 15. After Approval

- [ ] Set release date
- [ ] Prepare marketing materials
- [ ] Share download link
- [ ] Monitor reviews
- [ ] Respond to user feedback
- [ ] Plan updates

---

## 🚨 Common Mistakes to Avoid

- ❌ **Don't** submit without testing thoroughly
- ❌ **Don't** forget to provide demo account
- ❌ **Don't** use broken privacy policy link
- ❌ **Don't** forget to test demo account
- ❌ **Don't** submit placeholder screenshots
- ❌ **Don't** rush - take time to do it right

---

## 💰 Costs Summary

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Program | $99 | Annual |
| EAS Build (Expo) | Free tier OK | Monthly |
| App Icon Design | $0-50 | One-time |
| Screenshot Design | $0-50 | One-time |
| **TOTAL FIRST YEAR** | **~$99-199** | - |

---

## ⏱️ Timeline Estimate

| Phase | Time |
|-------|------|
| Apple Developer signup | 1 hour |
| EAS setup & configuration | 2-3 hours |
| Screenshot creation | 3-5 hours |
| App Store Connect setup | 2-3 hours |
| First production build | 30 mins |
| TestFlight testing | 1-2 weeks |
| App Store submission | 1 hour |
| Apple review | 1-7 days |
| **TOTAL** | **2-3 weeks** |

---

## 📞 Need Help?

- **Expo Documentation:** https://docs.expo.dev
- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **App Store Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Expo Discord:** https://chat.expo.dev
- **Apple Developer Support:** https://developer.apple.com/contact/

---

## 🎯 Success Criteria

Your app is ready for submission when:
- ✅ All checklist items above are complete
- ✅ App tested thoroughly on real device
- ✅ No crashes or major bugs
- ✅ Privacy policy hosted and accessible
- ✅ Demo account works perfectly
- ✅ Screenshots look professional
- ✅ All app information filled in App Store Connect

---

**Good luck with your submission! 🚀**

Remember: Most apps get approved on first try if you follow all guidelines carefully. If rejected, read the feedback, fix the issues, and resubmit. Don't give up!
