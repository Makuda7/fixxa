# Archived HTML Files (DEPRECATED)

**⚠️ DO NOT USE THESE FILES ⚠️**

This directory contains old HTML versions of pages that have been migrated to React.

## Migrated Pages

The following pages are now served by the React application and should **NOT** be edited or referenced:

- `index.html` → React: `/` (client/src/pages/Home.js)
- `login.html` → React: `/login` (client/src/pages/Login.js)
- `register.html` → React: `/register` (client/src/pages/Register.js)
- `service.html` → React: `/service` (client/src/pages/Service.js)
- `aboutus.html` → React: `/about` (client/src/pages/About.js)
- `profile.html` → React: `/profile` (client/src/pages/Profile.js)
- `prosite.html` → React: `/worker-dashboard` (client/src/pages/WorkerDashboard.js)

## Migration Dates
- Login, Register, Service, About: January 1, 2026
- Homepage, Profile, Worker Dashboard: January 2, 2026

## Why These Files Are Archived

These HTML files were part of a hybrid setup where some pages were served as static HTML and others through React. To maintain consistency and avoid confusion, we migrated all user-facing pages to React.

**All future updates should be made to the React components in `client/src/pages/`**

## Can These Files Be Deleted?

These files are kept as reference only. They can be safely deleted if you're certain you don't need the historical code for reference.
