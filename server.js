// server.js - Fixxa Platform Main Server
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const bcrypt = require('bcrypt');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000'),
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  allowEIO3: true, // Allow Engine.IO v3 for compatibility
  pingTimeout: 60000,
  pingInterval: 25000
});

// Configuration and utilities
const { pool, testConnection } = require('./config/database');
const logger = require('./config/logger');
const {
  SALT_ROUNDS,
  SESSION_IDLE_TIMEOUT,
  SESSION_ABSOLUTE_TIMEOUT,
  SESSION_ROLLING
} = require('./config/constants');
const helpers = require('./utils/helpers');
const { sendEmail } = require('./utils/email');
const { errorHandler } = require('./middleware/errorHandler');
const emailTemplates = require('./templates/emails');
const { sanitizeMiddleware } = require('./utils/sanitize');
const { globalLimiter } = require('./middleware/rateLimiter');

// PostgreSQL session store
const pgSession = require('connect-pg-simple')(session);

const PORT = process.env.PORT || 3000;
// Security middleware with comprehensive CSP configuration
// Content Security Policy (CSP) prevents XSS attacks by controlling which resources can load
const cspConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], // Only allow resources from same origin by default
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required: Inline scripts in HTML files (e.g., onclick handlers)
        "'unsafe-eval'", // Required: Socket.io and dynamic eval() usage
        "https://cdn.socket.io", // Socket.io CDN (if used)
        "https://www.googletagmanager.com", // Google Tag Manager (gtag.js)
        "https://www.google-analytics.com", // Google Analytics
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required: Inline styles in HTML and style attributes
        "https://fonts.googleapis.com", // Google Fonts
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com", // Google Fonts static content
        "data:", // Data URLs for fonts
      ],
      imgSrc: [
        "'self'",
        "data:", // Base64 encoded images
        "blob:", // Blob URLs for temporary images
        "https://res.cloudinary.com", // Cloudinary CDN (image storage)
        "https://*.cloudinary.com", // All Cloudinary subdomains
        "https://www.google-analytics.com", // Google Analytics tracking pixels
        "https://www.googletagmanager.com", // Google Tag Manager tracking pixels
      ],
      connectSrc: [
        "'self'",
        "wss:", // WebSocket Secure (Socket.io in production)
        "ws:", // WebSocket (Socket.io in development)
        "https://res.cloudinary.com", // Cloudinary API calls
        "https://api.cloudinary.com", // Cloudinary upload API
        "https://www.google-analytics.com", // Google Analytics data collection
        "https://www.googletagmanager.com", // Google Tag Manager
      ],
      mediaSrc: [
        "'self'",
        "https://res.cloudinary.com", // Video/audio from Cloudinary
        "https://*.cloudinary.com",
      ],
      objectSrc: ["'none'"], // Block <object>, <embed>, <applet> (prevents Flash exploits)
      frameSrc: [
        "'self'",
        "https://www.youtube.com", // Allow YouTube embeds for tutorial videos
        "https://www.youtube-nocookie.com", // Privacy-enhanced YouTube embeds
        "https://mozilla.github.io", // Mozilla PDF.js viewer for certifications
        "https://res.cloudinary.com", // Cloudinary direct PDF embeds
        "https://*.cloudinary.com", // All Cloudinary subdomains
      ],
      baseUri: ["'self'"], // Restrict <base> tag to same origin
      formAction: ["'self'"], // Forms can only submit to same origin
      frameAncestors: ["'none'"], // Prevent being embedded in iframes (clickjacking protection)
      upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS automatically
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled: Required for Cloudinary to work
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources (Cloudinary)
  // Additional Helmet security headers enabled by default:
  // - X-DNS-Prefetch-Control: Controls DNS prefetching
  // - X-Frame-Options: DENY (prevents clickjacking)
  // - X-Content-Type-Options: nosniff (prevents MIME sniffing)
  // - X-Download-Options: noopen (prevents IE from executing downloads)
  // - X-Permitted-Cross-Domain-Policies: none (blocks Adobe Flash/PDF cross-domain)
  // - Referrer-Policy: no-referrer (protects user privacy)
  // - Strict-Transport-Security: max-age=15552000 (forces HTTPS for 6 months)
};

if (process.env.NODE_ENV === 'production') {
  app.use(helmet(cspConfig));
} else {
  // Development mode: Enable CSP but in report-only mode for testing
  app.use(helmet({
    ...cspConfig,
    contentSecurityPolicy: {
      ...cspConfig.contentSecurityPolicy,
      reportOnly: false, // Set to true to test without blocking
    },
  }));
}

// CORS configuration
app.use(cors({
  origin: process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000'),
  credentials: true
}));

// Trust proxy for Railway/production environments
app.set('trust proxy', 1);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - Prevent abuse and DDoS attacks
app.use(globalLimiter);

// XSS Protection - Sanitize all user input
app.use(sanitizeMiddleware());
// Session configuration with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,                    // Use existing database connection pool
    tableName: 'session',          // Table name for sessions
    createTableIfMissing: false,   // We already created it
    pruneSessionInterval: 60 * 15  // Clean up expired sessions every 15 minutes
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,                   // Don't save session if unmodified
  saveUninitialized: false,        // Don't create session until something stored
  rolling: SESSION_ROLLING,        // Reset expiry on every request (rolling session)
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: SESSION_IDLE_TIMEOUT,  // 30 minutes of inactivity
    sameSite: 'lax'
  }
}));

// Simple redirect routes for easy sharing
app.get('/register', (req, res) => res.redirect('/register.html'));
app.get('/signup', (req, res) => res.redirect('/register.html'));
app.get('/join', (req, res) => res.redirect('/join.html'));
app.get('/login', (req, res) => res.redirect('/login.html'));
app.get('/signin', (req, res) => res.redirect('/login.html'));

// Static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload configurations
// Use MEMORY storage for virus scanning, then upload to Cloudinary if clean
const { cloudinary } = require('./config/cloudinary');

// Profile picture upload - memory storage for virus scanning
const profilePicUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// Review photo upload - memory storage for virus scanning
const reviewPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

// Health check endpoint with graceful degradation
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      email: 'unknown'
    }
  };

  // Check database (non-blocking)
  try {
    await pool.query('SELECT 1');
    health.services.database = 'connected';
  } catch (error) {
    health.services.database = 'disconnected';
    health.status = 'degraded';
    logger.error('Health check - database failed', { error: error.message });
  }

  // Email service is considered available if configured
  health.services.email = process.env.EMAIL_USER ? 'configured' : 'not_configured';

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Import routes with correct parameters
const authRoutes = require('./routes/auth')(pool, logger, sendEmail, emailTemplates, helpers);
const bookingsRoutes = require('./routes/bookings')(pool, logger, sendEmail, emailTemplates, io, helpers);
const messagesRoutes = require('./routes/messages')(pool, logger, io, helpers);
const workersRoutes = require('./routes/workers')(pool, logger, helpers);
const reviewsRoutes = require('./routes/reviews')(pool, logger, reviewPhotoUpload);
const settingsRoutes = require('./routes/settings')(pool, logger, bcrypt, profilePicUpload, SALT_ROUNDS);
const adminRoutes = require('./routes/admin')(pool, logger, helpers);
const completionRoutes = require('./routes/completion')(pool, logger, sendEmail, emailTemplates, io);
const workerRequestsRoutes = require('./routes/worker-requests')(pool, logger, sendEmail, emailTemplates, io);
const searchRoutes = require('./routes/search')(pool, logger);
const certificationsRoutes = require('./routes/certifications')(pool, logger);
const contactFeedbackRoutes = require('./routes/contact-feedback')(pool, logger, sendEmail, emailTemplates);
const supportRoutes = require('./routes/support')(pool, logger, sendEmail);
const notificationsRoutes = require('./routes/notifications')(pool, logger);
const cookieConsentRoutes = require('./routes/cookieConsent')(pool, logger);
const suburbsRoutes = require('./routes/suburbs');
const quotesRoutes = require('./routes/quotes')(pool, logger, sendEmail, emailTemplates);

// Mount routes
app.use('/', authRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/messages', messagesRoutes);
app.use('/workers', workersRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/', settingsRoutes);
app.use('/admin', adminRoutes);
app.use('/', completionRoutes);
app.use('/', workerRequestsRoutes);
app.use('/', searchRoutes);
app.use('/certifications', certificationsRoutes);
app.use('/', contactFeedbackRoutes);
app.use('/', supportRoutes);
app.use('/notifications', notificationsRoutes);
app.use('/api', cookieConsentRoutes);
app.use('/suburbs', suburbsRoutes);
app.use('/quotes', quotesRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Register client
  socket.on('registerClient', ({ clientId }) => {
    socket.join(`client-${clientId}`);
    console.log(`Client ${clientId} registered`);
  });

  // Register worker
  socket.on('registerWorker', ({ workerId }) => {
    socket.join(`worker-${workerId}`);
    console.log(`Worker ${workerId} registered`);
  });

  // Handle messages
  socket.on('sendMessage', (data) => {
    io.emit('receiveMessage', data);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });
});

// Serve React app for specific routes or subdomain
// Check if request is for app subdomain or /app/* path
const isReactRoute = (req) => {
  const host = req.get('host') || '';
  const isAppSubdomain = host.startsWith('app.') || host.includes('app.fixxa');
  const isAppPath = req.path.startsWith('/app');
  const isReactAPIRoute = req.path.match(/^\/(login|register|dashboard|home|service|profile)/);
  return isAppSubdomain || isAppPath || isReactAPIRoute;
};

// Serve React static files for /app path
app.use('/app', express.static(path.join(__dirname, 'client/build')));

// Serve React static assets (CSS, JS, images) directly for subdomain access
app.use('/static', (req, res, next) => {
  const host = req.get('host') || '';
  const isAppSubdomain = host.startsWith('app.') || host.includes('app.fixxa');

  if (isAppSubdomain) {
    express.static(path.join(__dirname, 'client/build/static'))(req, res, next);
  } else {
    next();
  }
});

// Serve React images for subdomain access
app.use('/images', (req, res, next) => {
  const host = req.get('host') || '';
  const isAppSubdomain = host.startsWith('app.') || host.includes('app.fixxa');

  if (isAppSubdomain) {
    express.static(path.join(__dirname, 'client/build/images'))(req, res, next);
  } else {
    next();
  }
});

// Serve React app for app subdomain or /app/* paths
app.use((req, res, next) => {
  if (isReactRoute(req)) {
    // If it's an API call, let it pass through to the API routes
    if (req.path.startsWith('/api/') ||
        req.path.startsWith('/auth/') ||
        req.path.startsWith('/workers/') ||
        req.path.startsWith('/bookings/') ||
        req.path.startsWith('/reviews/') ||
        req.path.startsWith('/certifications/') ||
        req.path.startsWith('/messages/') ||
        req.path.startsWith('/notifications/') ||
        req.path.startsWith('/uploads/') ||
        req.path.startsWith('/static/') ||
        req.path.match(/\.(json|xml|txt|js|css|png|jpg|jpeg|gif|svg|webp|ico)$/)) {
      return next();
    }

    // Serve React index.html for React routes
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  } else {
    next();
  }
});

// Root route - serve Index.html for main site
app.get('/', (req, res) => {
  if (isReactRoute(req)) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'Index.html'));
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Auto-run migration for notifications
async function runNotificationsMigration() {
  try {
    console.log('🔄 Running notifications migration...');

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL CHECK (type IN ('booking_reminder', 'booking_confirmed', 'booking_cancelled', 'booking_rescheduled', 'message_received', 'payment_received', 'review_reminder', 'system')),
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_worker ON notifications(worker_id, is_read)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_booking ON notifications(booking_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)`);

    // Create reminder_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminder_logs (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('24_hour', '2_hour', '1_day_before', 'day_of')),
        sent_to VARCHAR(20) NOT NULL CHECK (sent_to IN ('client', 'worker', 'both')),
        email_sent BOOLEAN DEFAULT false,
        notification_sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(booking_id, reminder_type, sent_to)
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reminder_logs_booking ON reminder_logs(booking_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON reminder_logs(sent_at)`);

    console.log('✅ Notifications migration completed');
  } catch (error) {
    console.log('⚠️  Notifications migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for phone numbers
async function runPhoneNumbersMigration() {
  try {
    console.log('🔄 Running phone numbers migration...');

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone) WHERE phone IS NOT NULL`);

    console.log('✅ Phone numbers migration completed');
  } catch (error) {
    console.log('⚠️  Phone numbers migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for ID/Passport identification fields
async function runIdentificationMigration() {
  try {
    console.log('🔄 Running identification fields migration...');

    // Add identification columns to workers table
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS id_type VARCHAR(20)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS id_number VARCHAR(50)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS id_submitted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT false`);

    // Create ID change logs table for audit trail
    await pool.query(`
      CREATE TABLE IF NOT EXISTS id_change_logs (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        old_id_type VARCHAR(20),
        old_id_number VARCHAR(50),
        new_id_type VARCHAR(20),
        new_id_number VARCHAR(50),
        change_reason TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        admin_reviewed BOOLEAN DEFAULT false,
        admin_approved BOOLEAN DEFAULT false,
        admin_notes TEXT,
        reviewed_at TIMESTAMP
      )
    `);

    // Add indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workers_id_number ON workers(id_number) WHERE id_number IS NOT NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_id_change_logs_worker ON id_change_logs(worker_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_id_change_logs_pending ON id_change_logs(admin_reviewed) WHERE admin_reviewed = false`);

    console.log('✅ Identification fields migration completed');
  } catch (error) {
    console.log('⚠️  Identification migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for emergency contacts
async function runEmergencyContactsMigration() {
  try {
    console.log('🔄 Running emergency contacts migration...');

    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_name_1 VARCHAR(100)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_relationship_1 VARCHAR(50)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_phone_1 VARCHAR(20)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_email_1 VARCHAR(255)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_name_2 VARCHAR(100)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_relationship_2 VARCHAR(50)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_phone_2 VARCHAR(20)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS emergency_email_2 VARCHAR(255)`);

    console.log('✅ Emergency contacts migration completed');
  } catch (error) {
    console.log('⚠️  Emergency contacts migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for profile picture
async function runProfilePictureMigration() {
  try {
    console.log('🔄 Running profile picture migration...');

    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_picture_cloudinary_id VARCHAR(255)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS profile_picture_uploaded_at TIMESTAMP`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workers_with_picture ON workers(profile_picture) WHERE profile_picture IS NOT NULL`);

    console.log('✅ Profile picture migration completed');
  } catch (error) {
    console.log('⚠️  Profile picture migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for terms acceptance
async function runTermsAcceptanceMigration() {
  try {
    console.log('🔄 Running terms acceptance migration...');

    // Add terms acceptance columns to users table
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10) DEFAULT '1.0'`);

    // Add terms acceptance columns to workers table
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS terms_version VARCHAR(10) DEFAULT '1.0'`);

    console.log('✅ Terms acceptance migration completed');
  } catch (error) {
    console.log('⚠️  Terms acceptance migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for message images
async function runMessageImagesMigration() {
  try {
    console.log('🔄 Running message images migration...');

    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_with_images ON messages(image_url) WHERE image_url IS NOT NULL`);
    await pool.query(`ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_check`);
    await pool.query(`
      ALTER TABLE messages ADD CONSTRAINT messages_content_or_image_check
      CHECK (
        (content IS NOT NULL AND char_length(content) > 0 AND char_length(content) <= 5000)
        OR
        (image_url IS NOT NULL)
      )
    `);

    console.log('✅ Message images migration completed');
  } catch (error) {
    // If migration fails, just log it - don't crash the server
    console.log('⚠️  Message images migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for virus scan logs
async function runVirusScanLogsMigration() {
  try {
    console.log('🔄 Running virus scan logs migration...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS virus_scan_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_type VARCHAR(20),
        file_name VARCHAR(255),
        file_type VARCHAR(50),
        file_size INTEGER,
        scan_result VARCHAR(30),
        viruses_found JSONB,
        action_taken VARCHAR(20),
        cloudinary_url TEXT,
        cloudinary_id VARCHAR(255),
        scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_virus_scans_user ON virus_scan_logs(user_id, user_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_virus_scans_result ON virus_scan_logs(scan_result)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_virus_scans_action ON virus_scan_logs(action_taken)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_virus_scans_date ON virus_scan_logs(scanned_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_virus_scans_type ON virus_scan_logs(file_type)`);

    console.log('✅ Virus scan logs migration completed');
  } catch (error) {
    console.log('⚠️  Virus scan logs migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for payment fields
async function runPaymentFieldsMigration() {
  try {
    console.log('🔄 Running payment fields migration...');

    // Add payment-related fields to bookings table
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'eft', 'online') OR payment_method IS NULL)`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'disputed', 'refunded'))`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_proof_url TEXT`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_proof_id VARCHAR(255)`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`);
    await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_notes TEXT`);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_payment_method ON bookings(payment_method)`);

    // Create payment disputes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_disputes (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        raised_by VARCHAR(20) NOT NULL CHECK (raised_by IN ('client', 'worker', 'admin')),
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
        resolution TEXT,
        resolved_by INTEGER REFERENCES workers(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_disputes_booking ON payment_disputes(booking_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON payment_disputes(status)`);

    console.log('✅ Payment fields migration complete');
  } catch (error) {
    console.log('⚠️  Payment fields migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for referral source
async function runReferralSourceMigration() {
  try {
    console.log('🔄 Running referral source migration...');

    // Add referral_source column to users table
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_referral_source ON users(referral_source)`);

    // Add referral_source column to workers table
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workers_referral_source ON workers(referral_source)`);

    console.log('✅ Referral source migration completed');
  } catch (error) {
    console.log('⚠️  Referral source migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for quotes system
async function runQuotesMigration() {
  try {
    console.log('🔄 Running quotes system migration...');
    const fs = require('fs');
    const path = require('path');

    const migrationPath = path.join(__dirname, 'database', 'migrations', '010_add_quotes_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('✅ Quotes system migration completed');
  } catch (error) {
    console.log('⚠️  Quotes migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for booking address
async function runBookingAddressMigration() {
  try {
    console.log('🔄 Running booking address migration...');
    const fs = require('fs');
    const path = require('path');

    const migrationPath = path.join(__dirname, 'database', 'migrations', '018_add_booking_address.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('✅ Booking address migration completed');
  } catch (error) {
    console.log('⚠️  Booking address migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for worker profile updates log
async function runWorkerProfileUpdatesMigration() {
  try {
    console.log('🔄 Running worker profile updates log migration...');
    const fs = require('fs');
    const path = require('path');

    const migrationPath = path.join(__dirname, 'database', 'migrations', '019_worker_profile_updates_log.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(migrationSQL);
    console.log('✅ Worker profile updates log migration completed');
  } catch (error) {
    console.log('⚠️  Worker profile updates log migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for certifications table columns
async function runCertificationColumnsMigration() {
  try {
    console.log('🔄 Running certifications columns migration...');

    // Add cloudinary_id column
    await pool.query('ALTER TABLE certifications ADD COLUMN IF NOT EXISTS cloudinary_id VARCHAR(255);');
    console.log('  ✓ Added cloudinary_id column');

    // Add file_type column
    await pool.query("ALTER TABLE certifications ADD COLUMN IF NOT EXISTS file_type VARCHAR(20) DEFAULT 'document';");
    console.log('  ✓ Added file_type column');

    // Add reviewed_at column
    await pool.query('ALTER TABLE certifications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;');
    console.log('  ✓ Added reviewed_at column');

    // Add reviewed_by_email column
    await pool.query('ALTER TABLE certifications ADD COLUMN IF NOT EXISTS reviewed_by_email VARCHAR(255);');
    console.log('  ✓ Added reviewed_by_email column');

    console.log('✅ Certifications columns migration completed');
  } catch (error) {
    console.log('⚠️  Certifications columns migration skipped (may already be applied):', error.message);
  }
}

// Auto-run migration for worker approval system
async function runWorkerApprovalMigration() {
  try {
    console.log('🔄 Running worker approval system migration...');

    // Add approval_status column
    await pool.query("ALTER TABLE workers ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';");
    console.log('  ✓ Added approval_status column');

    // Add approval_date column
    await pool.query('ALTER TABLE workers ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP;');
    console.log('  ✓ Added approval_date column');

    // Add approved_by column
    await pool.query('ALTER TABLE workers ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255);');
    console.log('  ✓ Added approved_by column');

    // Add rejection_reason column
    await pool.query('ALTER TABLE workers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;');
    console.log('  ✓ Added rejection_reason column');

    // Set existing workers to 'approved' status (for backwards compatibility)
    await pool.query("UPDATE workers SET approval_status = 'approved' WHERE approval_status IS NULL;");
    console.log('  ✓ Updated existing workers to approved status');

    // Create index on approval_status for faster queries
    await pool.query('CREATE INDEX IF NOT EXISTS idx_workers_approval_status ON workers(approval_status);');
    console.log('  ✓ Created index on approval_status');

    console.log('✅ Worker approval system migration completed');
  } catch (error) {
    console.log('⚠️  Worker approval system migration skipped (may already be applied):', error.message);
  }
}

// Activate pending workers so they show in "Coming Soon" listings
async function activatePendingWorkers() {
  try {
    console.log('🔄 Activating pending workers for Coming Soon display...');

    const result = await pool.query(`
      UPDATE workers
      SET is_active = true
      WHERE approval_status = 'pending' AND is_active = false
      RETURNING id, name, speciality
    `);

    if (result.rows.length > 0) {
      console.log(`  ✓ Activated ${result.rows.length} pending worker(s):`);
      result.rows.forEach(w => {
        console.log(`    - ${w.name} (${w.speciality})`);
      });
    } else {
      console.log('  ✓ No pending workers needed activation');
    }

    console.log('✅ Pending workers activation complete');
  } catch (error) {
    console.log('⚠️  Pending workers activation skipped:', error.message);
  }
}

// Auto-run migration for suburbs system
async function runSuburbsMigration() {
  try {
    console.log('🔄 Running suburbs system migration...');

    // Create suburbs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suburbs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        province VARCHAR(100) NOT NULL,
        worker_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(name, province)
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_suburbs_province ON suburbs(province)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_suburbs_active ON suburbs(is_active) WHERE is_active = true`);

    // Add new fields to workers table
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS primary_suburb VARCHAR(100)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS province VARCHAR(100)`);
    await pool.query(`ALTER TABLE workers ADD COLUMN IF NOT EXISTS secondary_areas TEXT[]`);

    // Migrate existing data: move 'area' to 'primary_suburb'
    await pool.query(`
      UPDATE workers
      SET primary_suburb = area
      WHERE primary_suburb IS NULL AND area IS NOT NULL AND area != ''
    `);

    // Add indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workers_primary_suburb ON workers(primary_suburb)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_workers_province ON workers(province)`);

    // Initial population: add suburbs from existing approved workers
    await pool.query(`
      INSERT INTO suburbs (name, province, worker_count)
      SELECT
        INITCAP(TRIM(primary_suburb)) as name,
        INITCAP(TRIM(COALESCE(province, 'Gauteng'))) as province,
        COUNT(*) as worker_count
      FROM workers
      WHERE primary_suburb IS NOT NULL
        AND primary_suburb != ''
        AND is_active = true
        AND approval_status = 'approved'
      GROUP BY INITCAP(TRIM(primary_suburb)), INITCAP(TRIM(COALESCE(province, 'Gauteng')))
      ON CONFLICT (name, province) DO NOTHING
    `);

    console.log('✅ Suburbs system migration completed');
  } catch (error) {
    console.log('⚠️  Suburbs migration skipped (may already be applied):', error.message);
  }
}

// Initialize reminder scheduler
const ReminderScheduler = require('./services/reminderScheduler');
let reminderScheduler = null;

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Fixxa server...');

    // Test database connection
    await testConnection(logger);
    console.log('✅ Database connection verified');

    // Run migrations
    console.log('📦 Running migrations...');
    await runNotificationsMigration();
    await runPhoneNumbersMigration();
    await runIdentificationMigration();
    await runEmergencyContactsMigration();
    await runProfilePictureMigration();
    await runTermsAcceptanceMigration();
    await runMessageImagesMigration();
    await runVirusScanLogsMigration();
    await runReferralSourceMigration();
    await runPaymentFieldsMigration();
    await runSuburbsMigration();
    await runQuotesMigration();
    await runBookingAddressMigration();
    await runWorkerProfileUpdatesMigration();
    await runCertificationColumnsMigration();
    await runWorkerApprovalMigration();
    await activatePendingWorkers();

    // Worker specialties migration
    const { runWorkerSpecialtiesMigration } = require('./migrations/worker_specialties');
    await runWorkerSpecialtiesMigration(pool, logger);

    // Add completion email timestamp column
    const { addCompletionEmailTimestamp } = require('./migrations/add_completion_email_timestamp');
    await addCompletionEmailTimestamp(pool, logger);

    // Add verification checkbox columns
    const { addVerificationCheckboxes } = require('./migrations/add_verification_checkboxes');
    await addVerificationCheckboxes(pool, logger);

    // Fix verification_status for existing verified workers
    const { fixVerificationStatus } = require('./migrations/fix_verification_status');
    await fixVerificationStatus(pool, logger);

    console.log('✅ All migrations complete');

    // Start reminder scheduler
    console.log('⏰ Initializing reminder scheduler...');
    reminderScheduler = new ReminderScheduler(pool, logger);
    reminderScheduler.start();
    console.log('✅ Reminder scheduler started');

    // Start server
    server.listen(PORT, () => {
      const serverUrl = process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`);
      console.log('===========================================');
      console.log(`Fixxa Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: ${process.env.DB_NAME}`);
      console.log(`URL: ${serverUrl}`);
      console.log('===========================================');

      logger.info('Server started successfully', { port: PORT, url: serverUrl });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Server startup failed', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (reminderScheduler) reminderScheduler.stop();
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  if (reminderScheduler) reminderScheduler.stop();
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

// Start the server
startServer();

module.exports = { app, server, io };