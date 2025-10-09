const crypto = require('crypto');

// Generate random verification token
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate verification URL
function generateVerificationUrl(token) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/verify-email?token=${token}`;
}

// Create verification email content
function createVerificationEmail(userName, verificationUrl) {
  return {
    subject: 'Verify Your Email - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a7c59;">Welcome to Fixxa, ${userName}!</h1>
        <p>Thank you for registering. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `
  };
}

function formatTimeAgo(date) {
  const now = new Date();
  const messageTime = new Date(date);
  const diffMs = now - messageTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function containsContactInfo(text) {
  const patterns = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,}/g,
    whatsapp: /whatsapp|wa\.me|chat with me/gi,
    socialMedia: /facebook\.com|instagram\.com|twitter\.com|linkedin\.com|@\w+/gi,
    url: /(https?:\/\/[^\s]+)/g,
    bypass: /\b(at)\s+(gmail|yahoo|outlook|hotmail)\b|email\s*me|call\s*me|text\s*me|dm\s*me/gi
  };
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(text)) {
      return { blocked: true, reason: type };
    }
  }
  return { blocked: false };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// User lookup helper to prevent SQL injection
async function getUserByEmail(pool, email) {
  let result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length > 0) {
    return { user: result.rows[0], type: 'client', table: 'users' };
  }

  result = await pool.query('SELECT * FROM workers WHERE email = $1', [email]);
  if (result.rows.length > 0) {
    return { user: result.rows[0], type: 'professional', table: 'workers' };
  }

  return { user: null, type: null, table: null };
}

// Get table name safely based on user type
function getTableForUserType(userType) {
  const tableMap = {
    'client': 'users',
    'professional': 'workers'
  };
  return tableMap[userType] || null;
}

// Create password reset email
function createPasswordResetEmail(userName, resetToken) {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password.html?token=${resetToken}`;

  return {
    subject: 'Reset Your Password - Fixxa',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4a7c59;">Password Reset Request</h1>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background: #4a7c59; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `
  };
}

module.exports = {
  generateVerificationToken,
  generateVerificationUrl,
  createVerificationEmail,
  formatTimeAgo,
  containsContactInfo,
  calculateDistance,
  getUserByEmail,
  getTableForUserType,
  createPasswordResetEmail
};