# Fixxa — Find Verified Professionals in South Africa

**Fixxa** is a full-stack marketplace platform that connects South African homeowners and businesses with verified local service professionals (plumbers, electricians, painters, and more).

Built and maintained by **Waddington Bushe** as founder and lead developer.

**Live site:** [www.fixxa.co.za](https://www.fixxa.co.za)

---

## Features

### For Clients
- Search and browse verified professionals by service type and location
- View professional profiles with ratings, reviews, and verified documents
- Request quotes and book services directly through the platform
- Real-time messaging with service professionals
- Leave reviews after job completion

### For Professionals
- Create a profile and get discovered by clients in your area
- Receive booking and quote requests
- Real-time notifications and messaging
- Keep 100% of earnings — no commission fees

### For Admins
- Full admin dashboard to review and approve professional registrations
- Document verification (ID, proof of residence)
- Platform analytics and user management

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express 5 |
| Frontend | React (SPA) + HTML/CSS |
| Database | PostgreSQL |
| Auth | Express Session + bcrypt |
| File Storage | Cloudinary |
| Email | SendGrid |
| Real-time | Socket.io |
| Deployment | Railway |
| Security | Helmet, CSRF, rate limiting, XSS protection, virus scanning |

---

## Architecture

```
fixxa/
├── server.js           # Express server entry point
├── routes/             # API route handlers (auth, workers, bookings, etc.)
├── middleware/         # Auth, admin, rate limiting
├── services/           # Email, notifications, business logic
├── utils/              # Helpers and utilities
├── client/             # React frontend (SPA)
│   └── src/
│       ├── pages/      # Page components
│       └── components/ # Shared components
├── public/             # Static HTML pages
├── database/           # Schema, seeds, migrations
└── FixxaMobile/        # React Native mobile app (in development)
```

---

## Local Development

### Prerequisites
- Node.js >= 18
- PostgreSQL database
- Cloudinary account
- SendGrid account

### Setup

```bash
# Clone the repo
git clone https://github.com/Makuda7/fixxa-beta.git
cd fixxa-beta

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Fill in your values in .env

# Start development server
npm run dev
```

The server runs on `http://localhost:3000` and serves both the API and React frontend.

### Build frontend

```bash
npm run build
```

---

## Environment Variables

See [.env.example](.env.example) for all required environment variables including database, email, Cloudinary, and session configuration.

---

## Deployment

Deployed on **Railway** with automatic PostgreSQL provisioning. The app runs startup migrations on boot to ensure the database schema is always up to date.

```bash
railway up
```

---

## Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register client or professional |
| POST | `/auth/login` | Login |
| GET | `/workers/search` | Search professionals |
| GET | `/worker-detail/:id` | Get professional profile |
| POST | `/bookings` | Create booking |
| GET | `/admin/pending-workers` | Admin: pending approvals |
| POST | `/upload/profile-picture` | Upload profile photo |

---

## Security

- CSRF protection on all state-changing requests
- Rate limiting on auth and upload endpoints
- Helmet.js for HTTP security headers
- XSS sanitisation on user input
- Virus scanning on file uploads via Cloudmersive
- Bcrypt password hashing
- Session-based authentication with PostgreSQL session store

---

## Mobile App

A React Native mobile app is in active development in the `FixxaMobile/` directory, targeting iOS and Android.

---

## License

Private — All rights reserved. © 2025 Fixxa
