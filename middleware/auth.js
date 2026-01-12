const jwt = require('jsonwebtoken');

// Authorization middleware functions
function requireAuth(req, res, next) {
  console.log('🔒 REQUIREAUTH START - Path:', req.path);
  console.log('🔒 Session ID:', req.sessionID);
  console.log('🔒 Session exists:', !!req.session);
  console.log('🔒 Session user:', JSON.stringify(req.session?.user || null));
  console.log('🔒 Cookie header:', req.headers.cookie ? 'Present' : 'Missing');

  // Check for JWT token (mobile apps)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.session = req.session || {};
      req.session.user = { id: decoded.id, email: decoded.email, type: decoded.type, isAdmin: decoded.isAdmin };
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  }

  // Check for session (web app)
  if (req.session?.user?.id) {
    console.log('🔒 REQUIREAUTH SUCCESS - User ID:', req.session.user.id);
    next();
  } else {
    console.log('🔒 REQUIREAUTH FAILED - No session user');
    res.status(401).json({ success: false, error: 'Authentication required' });
  }
}

function clientOnly(req, res, next) {
  if (!req.session?.user) {
    // Check if this is an API request (has Authorization header or Accept: application/json)
    const isApiRequest = req.headers.authorization || req.headers.accept?.includes('application/json');
    if (isApiRequest) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    return res.redirect('/login.html');
  }

  if (req.session.user.type === 'professional') {
    // Check if this is an API request
    const isApiRequest = req.headers.authorization || req.headers.accept?.includes('application/json');
    if (isApiRequest) {
      return res.status(403).json({ success: false, error: 'Client access required' });
    }
    return res.redirect('/prosite.html');
  }

  next();
}

function workerOnly(req, res, next) {
  console.log('👷 WORKERONLY - User type:', req.session?.user?.type);
  console.log('👷 WORKERONLY - Accept header:', req.headers.accept);

  if (!req.session?.user) {
    console.log('👷 WORKERONLY - No session user');
    // Check if this is an API request (has Authorization header or Accept: application/json)
    const isApiRequest = req.headers.authorization || req.headers.accept?.includes('application/json');
    if (isApiRequest) {
      console.log('👷 WORKERONLY - Returning 401 JSON');
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    console.log('👷 WORKERONLY - Redirecting to login');
    return res.redirect('/login.html');
  }

  if (req.session.user.type === 'client') {
    console.log('👷 WORKERONLY - User is client, not worker');
    // Check if this is an API request
    const isApiRequest = req.headers.authorization || req.headers.accept?.includes('application/json');
    if (isApiRequest) {
      console.log('👷 WORKERONLY - Returning 403 JSON');
      return res.status(403).json({ success: false, error: 'Worker access required' });
    }
    console.log('👷 WORKERONLY - Redirecting to index');
    return res.redirect('/index.html');
  }

  console.log('👷 WORKERONLY SUCCESS - User is worker/professional');
  next();
}

function adminOnly(req, res, next) {
  console.log('=== adminOnly middleware ===');
  console.log('Session user:', req.session?.user);
  console.log('Path:', req.path);

  if (!req.session?.user?.id) {
    console.log('No session user - returning 401');
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e);
  console.log('Admin emails:', adminEmails);
  console.log('User email:', req.session.user.email);

  if (adminEmails.length === 0 || !adminEmails.includes(req.session.user.email)) {
    console.log('Not admin - returning 403');
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  console.log('Admin check passed - calling next()');
  next();
}

async function verifyBookingOwnership(pool, logger) {
  return async (req, res, next) => {
    try {
      const bookingId = req.params.id || req.params.bookingId;
      const userId = req.session.user.id;
      const userType = req.session.user.type;
      
      const result = await pool.query('SELECT user_id, worker_id FROM bookings WHERE id = $1', [bookingId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }
      
      const booking = result.rows[0];
      const isOwner = (userType === 'client' && booking.user_id === userId) || 
                      (userType === 'professional' && booking.worker_id === userId);
      
      if (!isOwner) {
        logger.warn('Unauthorized booking access attempt', { userId, bookingId });
        return res.status(403).json({ success: false, error: 'Not authorized to access this booking' });
      }
      
      next();
    } catch (err) {
      logger.error('Booking ownership verification failed', { error: err.message });
      res.status(500).json({ success: false, error: 'Authorization check failed' });
    }
  };
}

module.exports = {
  requireAuth,
  clientOnly,
  workerOnly,
  adminOnly,
  verifyBookingOwnership
};