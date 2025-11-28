# Duplicate Pages - HTML vs React

This document lists all pages that exist in both HTML (public/) and React (client/src/pages/) versions.

**IMPORTANT**: When making changes, always check if the page exists in both versions and update BOTH.

## Active Duplicates

| Feature | HTML Version | React Version | Status | Notes |
|---------|-------------|---------------|--------|-------|
| **Admin Dashboard** | `public/admin.html` | `client/src/pages/AdminDashboard.js` | ✅ Synced | Worker detail modal added to both |
| Login | `public/login.html` | `client/src/pages/Login.js` | ⚠️ Unknown | Check if both are active |
| Register | `public/register.html` | `client/src/pages/Register.js` | ⚠️ Unknown | Check if both are active |
| Profile | `public/profile.html` | `client/src/pages/Profile.js` | ⚠️ Unknown | Check if both are active |
| Settings | `public/settings.html` | `client/src/pages/Settings.js` | ⚠️ Unknown | Check if both are active |
| Messages | `public/messages.html` | `client/src/pages/Messages.js` | ⚠️ Unknown | Check if both are active |
| About Us | `public/aboutus.html` | `client/src/pages/About.js` | ⚠️ Unknown | Check if both are active |
| Contact | `public/contact.html` | `client/src/pages/Contact.js` | ⚠️ Unknown | Check if both are active |
| Service | `public/service.html` | `client/src/pages/Service.js` | ⚠️ Unknown | Check if both are active |
| Support | `public/support.html` | `client/src/pages/Support.js` | ⚠️ Unknown | Check if both are active |
| Safety | `public/safety.html` | `client/src/pages/Safety.js` | ⚠️ Unknown | Check if both are active |
| Privacy | `public/privacy.html` | `client/src/pages/Privacy.js` | ⚠️ Unknown | Check if both are active |
| Terms | `public/terms.html` | `client/src/pages/Terms.js` | ⚠️ Unknown | Check if both are active |
| FAQ | `public/faq.html` | `client/src/pages/FAQ.js` | ⚠️ Unknown | Check if both are active |
| Forgot Password | `public/forgot-password.html` | `client/src/pages/ForgotPassword.js` | ⚠️ Unknown | Check if both are active |
| Reset Password | `public/reset-password.html` | `client/src/pages/ResetPassword.js` | ⚠️ Unknown | Check if both are active |
| Resend Verification | `public/resend-verification.html` | `client/src/pages/ResendVerification.js` | ⚠️ Unknown | Check if both are active |
| Complete Registration | `public/complete-registration.html` | `client/src/pages/CompleteRegistration.js` | ⚠️ Unknown | Check if both are active |
| Join | `public/join.html` | `client/src/pages/Join.js` | ⚠️ Unknown | Check if both are active |
| Reviews | `public/reviews.html` | `client/src/pages/Reviews.js` | ⚠️ Unknown | Check if both are active |

## HTML-Only Pages

These pages only exist as HTML files:

- `public/404.html`
- `public/Index.html`
- `public/admin-fix-worker.html`
- `public/clientProfile.html`
- `public/complete.html`
- `public/cookie-consent.html`
- `public/proLogin.html`
- `public/prosite.html`

## React-Only Pages

These pages only exist as React components:

- `client/src/pages/ClientDashboard.js`
- `client/src/pages/Dashboard.js`
- `client/src/pages/Home.js`
- `client/src/pages/NotFound.js`
- `client/src/pages/WorkerDashboard.js`

## Recommendation

**Option 1: Deprecate HTML versions (Recommended)**
- Remove all HTML duplicates
- Use React Router for all routing
- Keep only React versions
- Update all links to point to React routes

**Option 2: Maintain Both**
- Create a checklist process for changes
- Document which version is "primary"
- Set up automated tests to ensure feature parity

## Recent Issues

1. **2025-01-XX**: Admin worker detail modal only existed in HTML version, not React
   - Fixed by adding modal to React AdminDashboard
   - Lesson: Always check both versions before implementing features

## How to Check Which Version is Being Used

1. Check `client/src/App.js` for React routes
2. Check `server.js` for static file serving
3. Test the URL in browser to see which version loads
4. Check browser console for "main.*.js" (React) vs plain HTML

## Migration Status

- [ ] Audit all duplicate pages to determine which are active
- [ ] Choose primary version for each feature
- [ ] Create migration plan to consolidate
- [ ] Update documentation
- [ ] Update team workflow
