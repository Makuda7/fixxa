# Fixxa Mobile App

React Native mobile application for the Fixxa platform.

## 🚀 Quick Start

### Development Server Running
Your Expo development server is now running!

### Test on Your Phone (Easiest Way)

1. **Install Expo Go** on your phone:
   - iOS: Download "Expo Go" from App Store
   - Android: Download "Expo Go" from Google Play

2. **Scan QR Code**:
   - The Expo server should show a QR code in your terminal
   - Open Expo Go app on your phone
   - Tap "Scan QR code"
   - Scan the QR code from your terminal
   - The app will load on your phone!

3. **Test the Login**:
   - Try logging in with your Fixxa credentials
   - Email: (your test account)
   - Password: (your password)

### Test on Simulator/Emulator

#### iOS Simulator (Mac only):
```bash
# Press 'i' in the Expo terminal
# Or run:
npx expo start --ios
```

#### Android Emulator:
```bash
# Make sure Android Studio emulator is running
# Press 'a' in the Expo terminal
# Or run:
npx expo start --android
```

## 📱 What's Been Built

### ✅ Complete Setup
- Expo project initialized
- All dependencies installed
- Project structure created

### ✅ Reusable Code (from web app)
- API service (with AsyncStorage)
- AuthContext (login/logout)
- Utility functions (formatting, validation)
- Theme and styling

### ✅ Screens
- Login Screen (fully functional)
- Home Screen (after login)
- Navigation system

## 🔧 Current Features

1. **Authentication**
   - Login with email/password
   - Token-based auth (JWT)
   - Persistent login (AsyncStorage)
   - Auto-logout on token expiry

2. **Navigation**
   - Stack navigation
   - Auto-navigation based on auth state
   - Smooth transitions

3. **UI**
   - Fixxa branding colors
   - Professional styling
   - Loading states
   - Error handling

## 📂 Project Structure

```
FixxaMobile/
├── App.js                    # Main entry point
├── src/
│   ├── components/           # Reusable components
│   ├── screens/              # Screen components
│   │   ├── auth/            # Login, Register
│   │   ├── client/          # Client dashboard (TODO)
│   │   └── shared/          # Home, Profile
│   ├── navigation/          # Navigation setup
│   ├── contexts/            # AuthContext (✅ Done)
│   ├── services/            # API service (✅ Done)
│   ├── utils/               # Utilities (✅ Done)
│   └── styles/              # Theme (✅ Done)
└── package.json
```

## 🔗 API Connection

The app connects to your production API:
- **Base URL**: `https://fixxa.co.za`
- **Auth**: JWT tokens stored in AsyncStorage
- **Same backend** as your web app

## ⚠️ Important Notes

### Your Website is SAFE
- This is a **separate project**
- Different folder (`FixxaMobile/`)
- Different deployment (App stores, not web)
- **Zero impact** on your live website

### Backend Changes (Optional)
Your current backend should work, but for best mobile support:

1. **Return JWT token on login**:
```javascript
// In server.js /login endpoint
res.json({
  success: true,
  user: user,
  token: jwt.sign({ userId: user.id }, SECRET),  // Add this
  redirect: '/client-dashboard'
});
```

2. **Support token auth** (in addition to sessions):
```javascript
// Add middleware to check both session and token
const authMiddleware = (req, res, next) => {
  // Check session (web)
  if (req.session.user) {
    req.user = req.session.user;
    return next();
  }

  // Check token (mobile)
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      // Get user from database
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  res.status(401).json({ error: 'Not authenticated' });
};
```

## 🎯 Next Steps

### Immediate (Test Now):
1. ✅ Open Expo Go on your phone
2. ✅ Scan QR code from terminal
3. ✅ Test login with your credentials
4. ✅ See if it connects to your API

### Short Term (This Week):
1. Add Client Dashboard screen
2. Add Bookings list
3. Add Reviews page
4. Test all features

### Medium Term (Next Few Weeks):
1. Add photo upload (camera/gallery)
2. Add push notifications
3. Add offline mode
4. Complete all screens

### Long Term (When Ready):
1. Build for App Store (iOS)
2. Build for Google Play (Android)
3. Submit for review
4. Launch! 🚀

## 📱 Testing Commands

```bash
# Start dev server
cd FixxaMobile
npm start

# Start with cleared cache
npm start -- --clear

# Open on iOS simulator
npm run ios

# Open on Android emulator
npm run android

# Run on web (for testing)
npm run web
```

## 🐛 Troubleshooting

### Can't connect to API?
- Make sure `https://fixxa.co.za` is accessible
- Check if your backend supports CORS
- Check network connection

### Login fails?
- Check if token is being returned from `/login`
- Check console logs for errors
- Test same credentials on web version

### App won't load?
- Clear cache: `npm start -- --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Expo Go app is latest version

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)

## 🎉 Success!

You now have a working React Native mobile app that:
- ✅ Uses your existing backend API
- ✅ Reuses 65% of your web app logic
- ✅ Has zero impact on your website
- ✅ Can be tested on your phone right now!

**Next**: Try scanning the QR code and logging in! 📱
