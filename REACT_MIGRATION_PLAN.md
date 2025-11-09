# Fixxa React Migration Plan

## Overview
Safe, gradual migration from HTML to React while keeping the current site fully operational.

## Architecture

```
Current:
www.fixxa.co.za → HTML files (/public) → Express Backend → PostgreSQL

New (Parallel):
www.fixxa.co.za → HTML files (/public) ← Still works!
app.fixxa.co.za → React app (/client) → Same Express Backend → Same PostgreSQL
```

## Project Structure

```
fixxa/
├── client/                  # NEW: React app
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components (Dashboard, Login, etc.)
│   │   ├── services/       # API calls to backend
│   │   ├── contexts/       # Auth & state management
│   │   ├── hooks/          # Custom React hooks
│   │   └── App.js          # Main app component
│   ├── public/
│   └── package.json
├── public/                  # EXISTING: HTML site (unchanged)
├── routes/                  # EXISTING: Express routes (unchanged)
├── server.js               # EXISTING: Express server (minor updates)
├── package.json            # EXISTING: Root package
└── database/              # EXISTING: PostgreSQL (unchanged)
```

## Phase 1: Setup & Configuration (Current Phase)

### ✅ Completed
- [x] Create React app in /client folder
- [x] Basic React structure created

### 🔄 In Progress
- [ ] Install React dependencies (React Router, Axios, etc.)
- [ ] Configure proxy to backend API
- [ ] Set up environment variables
- [ ] Configure shared authentication

### Dependencies to Install
```bash
cd client
npm install react-router-dom axios
npm install --save-dev @types/react @types/react-dom
```

## Phase 2: Authentication Setup

### Goal
Both HTML and React sites share the same session authentication.

### Implementation
1. **Backend** (server.js):
   - CORS configured for `app.fixxa.co.za`
   - Session cookies work across both domains
   - No changes to existing auth logic

2. **React** (client):
   - API service to check `/auth/check-session`
   - Context provider for auth state
   - Protected routes for logged-in users

## Phase 3: Build Worker Dashboard (Mobile-First)

### Priority 1: Worker Features
1. **Login/Registration** (/login, /register)
   - Mobile-optimized forms
   - Email verification flow
   - Password reset

2. **Dashboard** (/dashboard)
   - Active bookings list
   - Upcoming jobs
   - Earnings overview
   - Quick actions (view profile, upload docs)

3. **Bookings** (/bookings)
   - Booking requests (pending)
   - Active jobs (in-progress)
   - Completed jobs (history)
   - Accept/decline actions

4. **Profile** (/profile)
   - Edit profile information
   - Upload profile picture
   - Update service areas
   - Portfolio photos

5. **Documents** (/documents)
   - Upload certifications
   - View upload status
   - Document approval tracking

### Mobile UX Features
- Bottom navigation bar
- Swipe gestures
- Pull-to-refresh
- Touch-optimized buttons (minimum 44x44px)
- Responsive layout (mobile-first)

## Phase 4: Build Client Features

### Priority 2: Client Features
1. **Home** (/)
   - Service search
   - Location selector
   - Browse workers

2. **Worker Profiles** (/worker/:id)
   - View worker details
   - See reviews & ratings
   - Book service

3. **Bookings** (/my-bookings)
   - Booking history
   - Active bookings
   - Leave reviews

4. **Profile** (/profile)
   - Edit account details
   - Saved addresses

## Phase 5: Admin Panel (Later)

Admin panel can stay HTML for now since it's primarily used on desktop.
Migrate later if needed.

## Deployment Strategy

### Development
```bash
# Terminal 1: Run Express backend
npm run dev

# Terminal 2: Run React dev server
cd client && npm start
```

React dev server proxies API calls to Express backend (localhost:3000).

### Production - Option A: Subdomain (Recommended)
```
Railway Project 1: www.fixxa.co.za
- Serves HTML from /public
- Runs Express server
- API endpoints

Railway Project 2: app.fixxa.co.za
- Serves React build
- Proxies API to www.fixxa.co.za
- Shared session cookies
```

### Production - Option B: Single Domain
```
www.fixxa.co.za/          → HTML site
www.fixxa.co.za/app/*     → React app
www.fixxa.co.za/api/*     → API endpoints
```

## Migration Timeline

### Week 1: Foundation
- ✅ React app created
- ⏳ Configure backend proxy
- ⏳ Setup authentication
- ⏳ Build basic layout & navigation

### Week 2: Worker Dashboard
- ⏳ Login/Registration pages
- ⏳ Dashboard overview
- ⏳ Bookings list
- ⏳ Test on mobile devices

### Week 3: Worker Features
- ⏳ Profile management
- ⏳ Document uploads
- ⏳ Portfolio photos
- ⏳ User testing with workers

### Week 4: Client Features
- ⏳ Home page & search
- ⏳ Worker profiles
- ⏳ Booking flow
- ⏳ Client testing

### Week 5: Polish & Deploy
- ⏳ Bug fixes
- ⏳ Performance optimization
- ⏳ Deploy to app.fixxa.co.za
- ⏳ Monitor & gather feedback

## Safety Features

### Zero Downtime
- HTML site continues running during entire migration
- No database changes required
- Backend API stays unchanged

### Easy Rollback
- Can disable React app anytime
- HTML site is always available as backup
- Users can choose which version to use

### Gradual User Migration
1. Soft launch: Share app.fixxa.co.za with select workers
2. Gather feedback and fix issues
3. Add banner on HTML site: "Try our new mobile app"
4. Monitor usage and iterate
5. Eventually deprecate HTML (months later)

## Technical Decisions

### Why React (not React Native)?
- Works on all devices (mobile & desktop)
- No app store submission needed
- Faster to build and deploy
- Progressive Web App (PWA) capabilities
- Can convert to React Native later if needed

### Why Subdomain (not route-based)?
- Cleaner separation of concerns
- Easier to manage deployments
- Better for SEO
- Simpler rollback if needed
- Can easily A/B test

### Why Keep HTML Site?
- Zero risk migration
- Desktop users comfortable with current site
- Admin panel works well on desktop
- Gradual user education
- Fallback if React has issues

## Next Steps

1. **Configure Backend Proxy** (client/package.json)
2. **Install Dependencies** (react-router-dom, axios)
3. **Create API Service** (client/src/services/api.js)
4. **Setup Auth Context** (client/src/contexts/AuthContext.js)
5. **Build First Page** (Login component)

## Questions?

- **Will my current users be affected?** No, they continue using the HTML site.
- **Do I need to rewrite my backend?** No, React uses the exact same API endpoints.
- **Can I test before going live?** Yes, run locally or deploy to test subdomain.
- **What if React doesn't work?** Easy rollback - just keep using HTML site.
- **When should I deprecate HTML?** Only after React is proven stable (3-6 months).

---

**Status:** Phase 1 - React app created ✅
**Next:** Configure backend proxy and install dependencies
