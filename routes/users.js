const express = require('express');
const { requireAuth } = require('../middleware/auth');

module.exports = (pool, logger, helpers) => {
  const router = express.Router();

// GET /users/profile - Get current user's profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    console.log('GET /users/profile - User ID:', userId);

    // Fetch user data from users table
    const result = await pool.query(
      `SELECT
        id, name, email, phone, location, profile_picture,
        created_at, updated_at
      FROM users
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    console.log('User profile fetched:', { id: user.id, name: user.name });

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// PUT /users/profile - Update current user's profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    console.log('PUT /users/profile - User ID:', userId);
    console.log('Update data:', req.body);

    const { name, email, phone, location, profile_picture } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if email is already taken by another user
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.trim().toLowerCase(), userId]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email is already taken'
      });
    }

    // Update user profile
    const result = await pool.query(
      `UPDATE users
      SET
        name = $1,
        email = $2,
        phone = $3,
        location = $4,
        profile_picture = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING
        id, name, email, phone, location, profile_picture,
        created_at, updated_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone?.trim() || null,
        location?.trim() || null,
        profile_picture || null,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updatedUser = result.rows[0];
    // Add type field for consistency with auth responses
    updatedUser.type = 'client';

    console.log('User profile updated:', { id: updatedUser.id, name: updatedUser.name });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

  return router;
};
