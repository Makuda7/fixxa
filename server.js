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
console.log('Loading database configuration...');
const { pool, testConnection } = require('./config/database');
console.log('Loading logger...');
const logger = require('./config/logger');
console.log('Configuration loaded successfully');
console.log('Loading constants...');
const {
  SALT_ROUNDS,
  SESSION_IDLE_TIMEOUT,
  SESSION_ABSOLUTE_TIMEOUT,
  SESSION_ROLLING
} = require('./config/constants');
console.log('Loading helpers...');
const helpers = require('./utils/helpers');
console.log('Loading email utilities...');
const { sendEmail } = require('./utils/email');
console.log('Loading error handler...');
const { errorHandler } = require('./middleware/errorHandler');
console.log('Loading email templates...');
const emailTemplates = require('./templates/emails');
console.log('Loading sanitize middleware...');
const { sanitizeMiddleware } = require('./utils/sanitize');
console.log('Loading rate limiter...');
const { globalLimiter } = require('./middleware/rateLimiter');

console.log('Loading PostgreSQL session store...');
// PostgreSQL session store
const pgSession = require('connect-pg-simple')(session);

const PORT = process.env.PORT || 3000;
console.log('All dependencies loaded successfully');

console.log('Configuring security middleware...');
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
      ],
      connectSrc: [
        "'self'",
        "wss:", // WebSocket Secure (Socket.io in production)
        "ws:", // WebSocket (Socket.io in development)
        "https://res.cloudinary.com", // Cloudinary API calls
        "https://api.cloudinary.com", // Cloudinary upload API
      ],
      mediaSrc: [
        "'self'",
        "https://res.cloudinary.com", // Video/audio from Cloudinary
        "https://*.cloudinary.com",
      ],
      objectSrc: ["'none'"], // Block <object>, <embed>, <applet> (prevents Flash exploits)
      frameSrc: ["'none'"], // Block iframes (prevents clickjacking)
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
console.log('Security middleware configured');

console.log('Configuring CORS...');
// CORS configuration
app.use(cors({
  origin: process.env.BASE_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'http://localhost:3000'),
  credentials: true
}));

console.log('CORS configured');

// Trust proxy for Railway/production environments
app.set('trust proxy', 1);
console.log('Proxy configured');

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log('Body parser configured');

// Rate limiting - Prevent abuse and DDoS attacks
app.use(globalLimiter);
console.log('Rate limiter configured');

// XSS Protection - Sanitize all user input
app.use(sanitizeMiddleware());
console.log('XSS protection configured');

console.log('Configuring session store...');
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
console.log('Session store configured');

console.log('Configuring static files...');
// Static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
console.log('Static files configured');

console.log('Loading Cloudinary configuration...');
// File upload configurations
// Use Cloudinary storage (imported from config/cloudinary.js)
const { cloudinary, profilePicStorage: cloudinaryProfilePicStorage, } = require('./config/cloudinary');
console.log('Cloudinary loaded');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Review photo storage (Cloudinary)
const reviewPhotoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fixxa/review-photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
    public_id: (req, file) => {
      const userId = req.session?.user?.id || 'unknown';
      return `review-${userId}-${Date.now()}`;
    }
  }
});

const profilePicStorage = cloudinaryProfilePicStorage;

const profilePicUpload = multer({
  storage: profilePicStorage,
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

const reviewPhotoUpload = multer({
  storage: reviewPhotoStorage,
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
console.log('File upload middleware configured');

console.log('Setting up health check endpoint...');
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
console.log('Health check endpoint ready');

// Import routes with correct parameters
console.log('Loading routes...');
console.log('Loading auth routes...');
const authRoutes = require('./routes/auth')(pool, logger, sendEmail, emailTemplates, helpers);
console.log('Auth routes loaded');

console.log('Loading bookings routes...');
const bookingsRoutes = require('./routes/bookings')(pool, logger, sendEmail, emailTemplates, io, helpers);
console.log('Bookings routes loaded');

console.log('Loading messages routes...');
const messagesRoutes = require('./routes/messages')(pool, logger, io, helpers);
console.log('Messages routes loaded');

console.log('Loading workers routes...');
const workersRoutes = require('./routes/workers')(pool, logger, helpers);
console.log('Workers routes loaded');

console.log('Loading reviews routes...');
const reviewsRoutes = require('./routes/reviews')(pool, logger, reviewPhotoUpload);
console.log('Reviews routes loaded');

console.log('Loading settings routes...');
const settingsRoutes = require('./routes/settings')(pool, logger, bcrypt, profilePicUpload, SALT_ROUNDS);
console.log('Settings routes loaded');

console.log('Loading admin routes...');
const adminRoutes = require('./routes/admin')(pool, logger, helpers);
console.log('Admin routes loaded');

console.log('Loading completion routes...');
const completionRoutes = require('./routes/completion')(pool, logger, sendEmail, emailTemplates, io);
console.log('Completion routes loaded');

console.log('Loading worker requests routes...');
const workerRequestsRoutes = require('./routes/worker-requests')(pool, logger, sendEmail, emailTemplates, io);
console.log('Worker requests routes loaded');

console.log('Loading search routes...');
const searchRoutes = require('./routes/search')(pool, logger);
console.log('Search routes loaded');

console.log('Loading certifications routes...');
const certificationsRoutes = require('./routes/certifications')(pool, logger);
console.log('Certifications routes loaded');

console.log('Loading contact/feedback routes...');
const contactFeedbackRoutes = require('./routes/contact-feedback')(pool, logger, sendEmail, emailTemplates);
console.log('Contact/feedback routes loaded');

console.log('Loading support routes...');
const supportRoutes = require('./routes/support')(pool, logger, sendEmail);
console.log('Support routes loaded');

console.log('Loading notifications routes...');
const notificationsRoutes = require('./routes/notifications')(pool, logger);
console.log('Notifications routes loaded');

console.log('Loading cookie consent routes...');
const cookieConsentRoutes = require('./routes/cookieConsent')(pool, logger);
console.log('Cookie consent routes loaded');

console.log('All routes loaded successfully');

// Mount routes
console.log('Mounting routes...');
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

// Root route - serve Index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Index.html'));
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