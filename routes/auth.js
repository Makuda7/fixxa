const express = require('express');
const bcrypt = require('bcrypt');
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

module.exports = (pool, logger, sendEmail, emailTemplates, helpers) => {
  const {
    generateVerificationToken,
    generateVerificationUrl,
    createVerificationEmail,
    getUserByEmail,
    getTableForUserType,
    createPasswordResetEmail
  } = helpers; 
  
  // Register
  router.post('/register', registrationLimiter, registerValidation, async (req, res) => {

    const { type, name, email, phone, city, suburb, password, speciality } = req.body;



    try {

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

      let result;

      if (type === USER_TYPES.PROFESSIONAL) {
        result = await pool.query(
          `INSERT INTO workers (name, email, phone, city, suburb, password, speciality, is_active, verification_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'pending') RETURNING id, name, email, phone, city, speciality`,
          [name, email, phone, city, suburb || null, hashedPassword, speciality]
        );
      } else {
        result = await pool.query(
          `INSERT INTO users (name, email, phone, city, suburb, password)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, city`,
          [name, email, phone, city, suburb || null, hashedPassword]
        );
      }

      const user = result.rows[0];

      // Email verification disabled for beta - accounts are immediately active
      logger.info('User registered successfully', { email, userId: user.id, type });

      const message = type === USER_TYPES.PROFESSIONAL
        ? 'Registration successful! Your application is under review. You will be notified once approved.'
        : 'Registration successful! You can now log in.';

      res.json({
        success: true,
        message,
        requiresVerification: false,
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

      if (!user.email_verified) {
        return res.status(403).json({
          success: false,
          error: 'Please verify your email before logging in. Check your inbox for the verification link.',
          requiresVerification: true,
          email: user.email
        });
      }

      req.session.user = { id: user.id, name: user.name, email: user.email, type };

      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);
      const isAdmin = adminEmails.includes(user.email);

      let redirectUrl;
      if (isAdmin && type === USER_TYPES.CLIENT) {
        redirectUrl = '/admin.html';
      } else if (type === USER_TYPES.PROFESSIONAL) {
        redirectUrl = '/prosite.html';
      } else {
        redirectUrl = '/clientProfile.html';
      }

      logger.info('User logged in', { userId: user.id, email: user.email, type });

      res.json({ success: true, redirect: redirectUrl, user: req.session.user });

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
          const userData = {
            ...result.rows[0],
            type: req.session.user.type,
            preferences: {
              ...(typeof result.rows[0].notification_preferences === 'object' 
                  ? result.rows[0].notification_preferences 
                  : JSON.parse(result.rows[0].notification_preferences || '{}')),
              ...(typeof result.rows[0].privacy_preferences === 'object'
                  ? result.rows[0].privacy_preferences
                  : JSON.parse(result.rows[0].privacy_preferences || '{}'))
            },
            profilePic: result.rows[0].profile_pic
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

  router.get('/worker/check-auth', (req, res) => {
    if (req.session?.user?.id && req.session.user.type === 'professional') {
      res.json({ authenticated: true, worker: req.session.user });
    } else {
      res.json({ authenticated: false, worker: null });
    }
  });

  

  router.get('/check-session', (req, res) => {
    if (req.session?.user?.id) {
      res.json({ 
        loggedIn: true, 
        user: req.session.user 
      });
    } else {
      res.json({ 
        loggedIn: false, 
        user: null 
      });
    }
  });

  return router;
};