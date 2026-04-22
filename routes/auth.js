const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const router = express.Router();
const { SALT_ROUNDS, VERIFICATION_TOKEN_EXPIRY, PASSWORD_RESET_TOKEN_EXPIRY, USER_TYPES } = require('../config/constants');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  resendVerificationValidation
} = require('../middleware/validation');
const { authLimiter, loginLimiter, registrationLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { cloudinary, profilePicStorage } = require('../config/cloudinary');
const profilePicUpload = multer({ storage: profilePicStorage, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = (pool, logger, sendEmail, emailTemplates, helpers) => {
  const {
    generateVerificationToken,
    generateVerificationUrl,
    createVerificationEmail,
    getUserByEmail,
    getTableForUserType,
    createPasswordResetEmail
  } = helpers; 
  
  // Log failed registration attempts
  const logRegistrationFailure = (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode >= 400 && !data.success) {
        logger.warn('Registration attempt failed', {
          email: req.body?.email || 'unknown',
          type: req.body?.type || 'unknown',
          status: res.statusCode,
          reason: data.error || 'Validation failed',
          details: data.details?.map(d => `${d.field}: ${d.message}`) || [],
          ip: req.ip
        });
      }
      return originalJson(data);
    };
    next();
  };

  // Register
  router.post('/register', registrationLimiter, logRegistrationFailure, profilePicUpload.single('profilePhoto'), registerValidation, async (req, res) => {

    const { type, name, email, phone, city, suburb, password, speciality, experience, acceptTerms, referralSource } = req.body;

    try {

      // Validate T&C acceptance
      if (!acceptTerms || acceptTerms !== 'true' && acceptTerms !== true) {
        return res.status(400).json({
          success: false,
          error: 'You must accept the Terms of Service, Privacy Policy, and Safety Guidelines to register.'
        });
      }

      // Validate referral source
      if (!referralSource) {
        return res.status(400).json({
          success: false,
          error: 'Please tell us how you heard about Fixxa.'
        });
      }

      // Get table name safely
      const table = getTableForUserType(type);
      if (!table) {
        return res.status(400).json({ success: false, error: 'Invalid user type' });
      }

      // Check if email already exists
      const existing = await pool.query(`SELECT id FROM ${table} WHERE email = $1`, [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, error: `Email already registered as ${type}` });
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const verificationToken = generateVerificationToken();
      const termsVersion = '1.0'; // Current terms version

      let result;

      if (type === USER_TYPES.PROFESSIONAL) {
        const profilePicUrl = req.file ? req.file.path : null;
        const profilePicCloudinaryId = req.file ? req.file.filename : null;
        result = await pool.query(
          `INSERT INTO workers (name, email, phone, city, suburb, password, speciality, experience, is_active, verification_status, approval_status, email_verified, terms_accepted, terms_accepted_at, terms_version, referral_source, profile_picture, cloudinary_profile_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'pending', 'pending', true, true, CURRENT_TIMESTAMP, $9, $10, $11, $12) RETURNING id, name, email, phone, city, speciality, experience`,
          [name, email, phone, city, suburb || null, hashedPassword, speciality, experience || null, termsVersion, referralSource, profilePicUrl, profilePicCloudinaryId]
        );
      } else {
        result = await pool.query(
          `INSERT INTO users (name, email, phone, city, suburb, password, verification_token, email_verified, terms_accepted, terms_accepted_at, terms_version, referral_source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, CURRENT_TIMESTAMP, $8, $9) RETURNING id, name, email, phone, city`,
          [name, email, phone, city, suburb || null, hashedPassword, verificationToken, termsVersion, referralSource]
        );
      }

      const user = result.rows[0];

      // Send email verification for clients only
      if (type !== USER_TYPES.PROFESSIONAL) {
        const verificationUrl = generateVerificationUrl(verificationToken, type);
        const verificationEmail = createVerificationEmail(name, verificationUrl);
        await sendEmail(user.email, verificationEmail.subject, verificationEmail.html).catch(err => {
          logger.error('Failed to send verification email', { error: err.message, email: user.email });
        });
      }

      logger.info('User registered successfully', {
        email,
        userId: user.id,
        type,
        termsAccepted: true,
        emailVerificationSent: type !== USER_TYPES.PROFESSIONAL
      });

      const message = type === USER_TYPES.PROFESSIONAL
        ? 'Account created! You can now log in and complete your profile. Once reviewed and approved, you will go live on Fixxa.'
        : 'Registration successful! Please check your email to verify your account before logging in.';

      res.json({
        success: true,
        message,
        requiresVerification: true,
        email: email,
        pendingApproval: type === USER_TYPES.PROFESSIONAL
      });

    } catch (err) {
      logger.error('Registration error', { error: err.message, stack: err.stack, email });
      res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
    }
  });

  // Email verification
  router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: red;">Invalid Verification Link</h1>
          <p>The verification link is invalid or incomplete.</p>
          <a href="/login.html" style="color: forestgreen;">Go to Login</a>
        </body></html>
      `);
    }

    try {
      let result = await pool.query(
        'SELECT id, name, email, verification_token, reset_token_expiry FROM users WHERE verification_token = $1',
        [token]
      );
      let userType = 'client';
      
      if (result.rows.length === 0) {
        result = await pool.query(
          'SELECT id, name, email, verification_token, reset_token_expiry FROM workers WHERE verification_token = $1',
          [token]
        );
        userType = 'professional';
      }

      if (result.rows.length === 0) {
        return res.status(400).send(`
          <html><body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1 style="color: red;">Invalid Token</h1>
            <p>This verification link is invalid or has already been used.</p>
            <a href="/register.html" style="color: forestgreen;">Register Again</a>
          </body></html>
        `);
      }

      const user = result.rows[0];

      if (user.reset_token_expiry && new Date() > new Date(user.reset_token_expiry)) {
        return res.status(400).send(`
          <html><body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1 style="color: orange;">Link Expired</h1>
            <p>This verification link has expired. Please request a new one.</p>
            <a href="/resend-verification.html" style="color: forestgreen;">Resend Verification Email</a>
          </body></html>
        `);
      }

      const table = userType === 'professional' ? 'workers' : 'users';
      await pool.query(
        `UPDATE ${table} SET email_verified = true, verification_token = NULL, reset_token_expiry = NULL WHERE id = $1`,
        [user.id]
      );

      logger.info('Email verified successfully', { userId: user.id, email: user.email, type: userType });

      // Send welcome email
      const welcomeEmail = emailTemplates.createWelcomeEmail(user.name);
      try {
        await sendEmail(user.email, welcomeEmail.subject, welcomeEmail.html, logger);
      } catch (emailError) {
        logger.error('Failed to send welcome email', { error: emailError.message });
      }

      // Send admin notification for professional verifications
      if (userType === 'professional') {
        try {
          const adminEmail = process.env.ADMIN_EMAIL || 'support@fixxa.co.za';
          const adminNotificationHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #228b22;">New Professional Email Verified ✅</h1>
              <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Professional Details</h3>
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Verified:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <p style="margin-top: 20px;">
                This professional has verified their email and is now ready for review in your admin dashboard.
              </p>
              <p>
                <a href="https://www.fixxa.co.za/admin.html"
                   style="display: inline-block; background: #228b22; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 10px;">
                  Review Application
                </a>
              </p>
            </div>
          `;
          await sendEmail(adminEmail, `New Professional Verified: ${user.name}`, adminNotificationHtml, logger);
        } catch (emailError) {
          logger.error('Failed to send admin notification email', { error: emailError.message });
        }
      }

      res.send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: forestgreen;">Email Verified!</h1>
          <p>Your email has been successfully verified, ${user.name}.</p>
          <p>You can now log in to your account.</p>
          <a href="/login.html" style="display: inline-block; background: forestgreen; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px;">Go to Login</a>
        </body></html>
      `);

    } catch (err) {
      logger.error('Email verification error', { error: err.message, stack: err.stack });
      console.error('Verification error:', err);
      res.status(500).send(`
        <html><body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1 style="color: red;">Error</h1>
          <p>An error occurred during verification. Please try again or contact support.</p>
        </body></html>
      `);
    }
  });

  // Resend verification
  router.post('/resend-verification', authLimiter, resendVerificationValidation, async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    try {
      let result = await pool.query(
        'SELECT id, name, email, email_verified FROM users WHERE email = $1',
        [email]
      );
      let userType = 'client';
      let table = 'users';

      if (result.rows.length === 0) {
        result = await pool.query(
          'SELECT id, name, email, email_verified FROM workers WHERE email = $1',
          [email]
        );
        userType = 'professional';
        table = 'workers';
      }

      if (result.rows.length === 0) {
        return res.json({ 
          success: true, 
          message: 'If that email is registered, a verification link has been sent.' 
        });
      }

      const user = result.rows[0];

      if (user.email_verified) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email is already verified. Please log in.' 
        });
      }

      const verificationToken = generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await pool.query(
        `UPDATE ${table} SET verification_token = $1, reset_token_expiry = $2 WHERE id = $3`,
        [verificationToken, tokenExpiry, user.id]
      );

      const verificationUrl = generateVerificationUrl(verificationToken);
      const emailContent = createVerificationEmail(user.name, verificationUrl);
      
      await sendEmail(email, emailContent.subject, emailContent.html, logger);

      logger.info('Verification email resent', { email, userId: user.id });

      res.json({ 
        success: true, 
        message: 'Verification email sent! Please check your inbox.' 
      });

    } catch (err) {
      logger.error('Resend verification error', { error: err.message, email });
      console.error('Resend verification error:', err);
      res.status(500).json({ success: false, error: 'Failed to resend verification email' });
    }
  });

  // Forgot password
  router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    try {
      const { user, table } = await getUserByEmail(pool, email);

      // Always return the same message for security (prevent email enumeration)
      const genericMessage = 'If that email is registered, a password reset link has been sent.';

      if (!user) {
        return res.json({ success: true, message: genericMessage });
      }

      const resetToken = generateVerificationToken();
      const tokenExpiry = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY);

      await pool.query(
        `UPDATE ${table} SET verification_token = $1, reset_token_expiry = $2 WHERE id = $3`,
        [resetToken, tokenExpiry, user.id]
      );

      const resetEmail = createPasswordResetEmail(user.name, resetToken);
      await sendEmail(email, resetEmail.subject, resetEmail.html, logger);

      logger.info('Password reset email sent', { email, userId: user.id });

      res.json({ success: true, message: genericMessage });

    } catch (err) {
      logger.error('Forgot password error', { error: err.message, email });
      res.status(500).json({ success: false, error: 'Failed to process request' });
    }
  });

  // Reset password
  router.post('/reset-password', authLimiter, resetPasswordValidation, async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    try {
      // Check both tables for the token
      let result = await pool.query(
        'SELECT id, name, email, verification_token, reset_token_expiry FROM users WHERE verification_token = $1',
        [token]
      );
      let table = 'users';

      if (result.rows.length === 0) {
        result = await pool.query(
          'SELECT id, name, email, verification_token, reset_token_expiry FROM workers WHERE verification_token = $1',
          [token]
        );
        table = 'workers';
      }

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
      }

      const user = result.rows[0];

      // Check token expiry
      if (user.reset_token_expiry && new Date() > new Date(user.reset_token_expiry)) {
        return res.status(400).json({
          success: false,
          error: 'Reset token has expired. Please request a new one.'
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      await pool.query(
        `UPDATE ${table}
         SET password = $1, verification_token = NULL, reset_token_expiry = NULL
         WHERE id = $2`,
        [hashedPassword, user.id]
      );

      logger.info('Password reset successfully', { userId: user.id, email: user.email });

      res.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      });

    } catch (err) {
      logger.error('Reset password error', { error: err.message });
      res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
  });

  // Login
  router.post('/login', loginLimiter, loginValidation, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }

    try {
      const { user, type } = await getUserByEmail(pool, email);

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      if (!user.email_verified && type !== USER_TYPES.PROFESSIONAL) {
        return res.status(403).json({
          success: false,
          error: 'Please verify your email before logging in. Check your inbox for the verification link.',
          requiresVerification: true,
          email: user.email
        });
      }

      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);
      const isAdmin = adminEmails.includes(user.email);

      req.session.user = { id: user.id, name: user.name, email: user.email, type, isAdmin };

      console.log('=== LOGIN DEBUG ===');
      console.log('ADMIN_EMAILS env var:', process.env.ADMIN_EMAILS);
      console.log('Parsed adminEmails array:', adminEmails);
      console.log('User email:', user.email);
      console.log('isAdmin:', isAdmin);
      console.log('User type:', type);

      let redirectUrl;
      if (isAdmin) {
        redirectUrl = '/admin.html';
        console.log('✅ Admin detected - redirecting to /admin.html');
      } else if (type === USER_TYPES.PROFESSIONAL) {
        redirectUrl = '/worker-dashboard';
        console.log('Professional detected - redirecting to /worker-dashboard');
      } else {
        redirectUrl = '/client-dashboard';
        console.log('Client detected - redirecting to /client-dashboard');
      }

      console.log('Final redirect URL:', redirectUrl);
      console.log('Session user:', req.session.user);
      console.log('===================');

      logger.info('User logged in', { userId: user.id, email: user.email, type, isAdmin, redirectUrl });

      // Generate JWT token for mobile apps
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fixxa-default-secret-change-in-production';
      const token = jwt.sign(
        { id: user.id, email: user.email, type, isAdmin },
        jwtSecret,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        redirect: redirectUrl,
        user: { ...req.session.user, type }, // Explicitly include type in user object
        token
      });

    } catch (err) {
      logger.error('Login error', { error: err.message, email });
      res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
    }
  });

  // Logout
  router.post('/logout', (req, res) => {
    if (req.session.user) {
      req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false, error: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out' });
      });
    } else {
      res.json({ success: true, message: 'Already logged out' });
    }
  });

  // Check auth endpoints
  router.get('/check-auth', async (req, res) => {
    if (req.session?.user?.id) {
      try {
        const table = req.session.user.type === 'professional' ? 'workers' : 'users';
        const result = await pool.query(
          `SELECT id, name, email, phone, address, city, postal_code, profile_pic, 
                  notification_preferences, privacy_preferences, created_at as registeredAt 
           FROM ${table} WHERE id = $1`,
          [req.session.user.id]
        );
        
        if (result.rows.length > 0) {
          // Convert old local profile pic paths to default SVG
          let profilePic = result.rows[0].profile_pic;
          if (profilePic && profilePic.startsWith('/uploads/')) {
            profilePic = 'images/default-profile.svg';
          }

          // Check if user is admin
          const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);
          const isAdmin = adminEmails.includes(result.rows[0].email);

          const userData = {
            ...result.rows[0],
            type: req.session.user.type,
            isAdmin: isAdmin,  // Add admin flag to user data
            preferences: {
              ...(typeof result.rows[0].notification_preferences === 'object'
                  ? result.rows[0].notification_preferences
                  : JSON.parse(result.rows[0].notification_preferences || '{}')),
              ...(typeof result.rows[0].privacy_preferences === 'object'
                  ? result.rows[0].privacy_preferences
                  : JSON.parse(result.rows[0].privacy_preferences || '{}'))
            },
            profilePic: profilePic
          };
          res.json({ authenticated: true, user: userData });
        } else {
          res.json({ authenticated: false, user: null });
        }
      } catch (err) {
        console.error('Check auth error:', err);
        res.json({ authenticated: true, user: req.session.user });
      }
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  router.get('/worker/check-auth', async (req, res) => {
    if (req.session?.user?.id && req.session.user.type === 'professional') {
      try {
        // Check verification status from database
        const result = await pool.query(
          'SELECT id, email_verified, verification_status FROM workers WHERE id = $1',
          [req.session.user.id]
        );

        if (result.rows.length > 0) {
          const worker = result.rows[0];

          res.json({
            authenticated: true,
            worker: req.session.user,
            emailVerified: worker.email_verified || false
          });
        } else {
          res.json({ authenticated: true, worker: req.session.user, emailVerified: false });
        }
      } catch (err) {
        logger.error('Worker check-auth error', { error: err.message });
        res.json({ authenticated: true, worker: req.session.user, emailVerified: false });
      }
    } else {
      res.json({ authenticated: false, worker: null, emailVerified: false });
    }
  });

  

  router.get('/check-session', async (req, res) => {
    // Check for JWT token (mobile apps)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({
          authenticated: true,
          user: { id: decoded.id, email: decoded.email, type: decoded.type, isAdmin: decoded.isAdmin }
        });
      } catch (err) {
        // Invalid token - fall through to session check
      }
    }

    // Check for session (web app)
    if (req.session?.user?.id) {
      res.json({
        authenticated: true,
        user: req.session.user
      });
    } else {
      res.json({
        authenticated: false,
        user: null
      });
    }
  });

  // Refresh JWT token for mobile apps
  router.post('/refresh-token', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      const token = authHeader.substring(7);

      try {
        // Verify the current token (even if expired, we can still decode it)
        const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fixxa-default-secret-change-in-production', {
          ignoreExpiration: true // Allow expired tokens to be decoded
        });

        // Get fresh user data from database
        const table = decoded.type === 'professional' ? 'workers' : 'users';
        const result = await pool.query(
          `SELECT id, name, email FROM ${table} WHERE id = $1`,
          [decoded.id]
        );

        if (result.rows.length === 0) {
          return res.status(401).json({
            success: false,
            error: 'User not found'
          });
        }

        const user = result.rows[0];

        // Generate new token with fresh expiration
        const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fixxa-default-secret-change-in-production';
        const newToken = jwt.sign(
          { id: user.id, email: user.email, type: decoded.type, isAdmin: decoded.isAdmin },
          jwtSecret,
          { expiresIn: '30d' }
        );

        logger.info('Token refreshed successfully', { userId: user.id, email: user.email });

        res.json({
          success: true,
          token: newToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            type: decoded.type,
            isAdmin: decoded.isAdmin
          }
        });

      } catch (err) {
        logger.error('Token refresh failed', { error: err.message });
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }

    } catch (err) {
      logger.error('Token refresh error', { error: err.message });
      res.status(500).json({
        success: false,
        error: 'Failed to refresh token'
      });
    }
  });

  return router;
};