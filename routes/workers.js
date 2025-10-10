const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { uploadLimiter } = require('../middleware/rateLimiter');

// Configure multer for portfolio photo uploads
const portfolioStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = 'public/uploads/portfolio';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'portfolio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const portfolioUpload = multer({
  storage: portfolioStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WEBP images are allowed'));
    }
  }
});

module.exports = (pool, logger, helpers) => {
  const { requireAuth, workerOnly } = require('../middleware/auth');
  const { calculateDistance } = helpers;

  // Get all active workers
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name, email, speciality, area, bio, experience, rating, profile_pic as image, availability_schedule, is_available, latitude, longitude, service_radius FROM workers WHERE is_active = true ORDER BY name ASC'
      );
      res.json(result.rows);
    } catch (err) {
      logger.error('Failed to fetch workers', { error: err.message });
      console.error('Failed to fetch workers:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get nearby workers
  router.get('/nearby', async (req, res) => {
    try {
      const { latitude, longitude, radius = 50 } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, error: 'Location required' });
      }

      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      const maxRadius = parseFloat(radius);

      const result = await pool.query(`
        SELECT id, name, email, speciality, area, bio, experience, rating, profile_pic as image,
               availability_schedule, is_available, latitude, longitude, service_radius, is_verified
        FROM workers
        WHERE is_available = true AND is_active = true
        ORDER BY name ASC
      `);

      const workersWithDistance = result.rows
        .map(worker => {
          if (!worker.latitude || !worker.longitude) {
            return { ...worker, distance: null, inServiceArea: false };
          }
          
          const distance = calculateDistance(
            userLat, userLon, 
            parseFloat(worker.latitude), 
            parseFloat(worker.longitude)
          );
          
          const withinServiceArea = distance <= (worker.service_radius || 50);
          
          return {
            ...worker,
            distance: Math.round(distance * 10) / 10,
            inServiceArea: withinServiceArea
          };
        })
        .sort((a, b) => {
          if (a.inServiceArea && !b.inServiceArea) return -1;
          if (!a.inServiceArea && b.inServiceArea) return 1;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });

      res.json(workersWithDistance);
    } catch (err) {
      logger.error('Failed to fetch nearby workers', { error: err.message });
      console.error('Failed to fetch nearby workers:', err);
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get worker availability
  router.get('/availability', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const result = await pool.query(
        'SELECT availability_schedule, is_available FROM workers WHERE id = $1',
        [workerId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }
      
      res.json({ 
        success: true, 
        availability_schedule: result.rows[0].availability_schedule || 'both',
        is_available: result.rows[0].is_available !== false
      });
    } catch (error) {
      logger.error('Get availability error', { error: error.message });
      console.error('Get availability error:', error);
      res.status(500).json({ success: false, error: 'Failed to get availability' });
    }
  });

  // Update worker availability
  router.post('/availability', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { availability_schedule, is_available } = req.body;

      const validSchedules = ['weekdays', 'weekends', 'both'];
      if (availability_schedule && !validSchedules.includes(availability_schedule.toLowerCase())) {
        return res.status(400).json({ success: false, error: 'Invalid availability schedule' });
      }

      const updates = [];
      const values = [];
      let idx = 1;

      if (availability_schedule !== undefined) {
        updates.push(`availability_schedule = $${idx++}`);
        // Convert string to JSONB object
        const scheduleJson = { type: availability_schedule.toLowerCase() };
        values.push(JSON.stringify(scheduleJson));
      }

      if (is_available !== undefined) {
        updates.push(`is_available = $${idx++}`);
        values.push(Boolean(is_available));
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No updates provided' });
      }
      
      values.push(workerId);
      const query = `UPDATE workers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING availability_schedule, is_available`;
      
      const result = await pool.query(query, values);
      
      res.json({ 
        success: true, 
        message: 'Availability updated successfully',
        availability_schedule: result.rows[0].availability_schedule,
        is_available: result.rows[0].is_available
      });
    } catch (error) {
      logger.error('Update availability error', { error: error.message });
      console.error('Update availability error:', error);
      res.status(500).json({ success: false, error: 'Failed to update availability' });
    }
  });

  // Update worker location
  router.post('/update-location', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { latitude, longitude, serviceRadius } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ success: false, error: 'Location required' });
      }
      
      const updates = [];
      const values = [];
      let idx = 1;
      
      updates.push(`latitude = $${idx++}`);
      values.push(parseFloat(latitude));
      
      updates.push(`longitude = $${idx++}`);
      values.push(parseFloat(longitude));
      
      if (serviceRadius !== undefined) {
        updates.push(`service_radius = $${idx++}`);
        values.push(parseInt(serviceRadius));
      }
      
      values.push(workerId);
      const query = `UPDATE workers SET ${updates.join(', ')} WHERE id = $${idx} RETURNING latitude, longitude, service_radius`;
      
      const result = await pool.query(query, values);
      
      res.json({ 
        success: true, 
        message: 'Location updated successfully',
        location: result.rows[0]
      });
    } catch (error) {
      logger.error('Update location error', { error: error.message });
      console.error('Update location error:', error);
      res.status(500).json({ success: false, error: 'Failed to update location' });
    }
  });

  // Update worker profile
  router.post('/update-profile', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { bio, experience, area } = req.body;
      
      if (!bio || !experience || !area) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
      }
      
      const result = await pool.query(
        `UPDATE workers 
         SET bio = $1, experience = $2, area = $3 
         WHERE id = $4 
         RETURNING id, bio, experience, area`,
        [bio, experience, area, workerId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }
      
      res.json({ 
        success: true, 
        message: 'Profile updated successfully',
        worker: result.rows[0]
      });
    } catch (error) {
      logger.error('Update worker profile error', { error: error.message });
      console.error('Update worker profile error:', error);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
  });

  // Get worker profile
  router.get('/profile', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const result = await pool.query(
        'SELECT id, name, email, bio, experience, area, speciality FROM workers WHERE id = $1',
        [workerId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }
      
      res.json({ 
        success: true, 
        worker: result.rows[0]
      });
    } catch (error) {
      logger.error('Get worker profile error', { error: error.message });
      console.error('Get worker profile error:', error);
      res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
  });

  // Portfolio Routes

  // Upload portfolio photo
  router.post('/portfolio/upload', requireAuth, workerOnly, uploadLimiter, portfolioUpload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const workerId = req.session.user.id;
      const photoUrl = `/uploads/portfolio/${req.file.filename}`;
      const description = req.body.description || '';

      const result = await pool.query(
        'INSERT INTO portfolio_photos (worker_id, photo_url, description) VALUES ($1, $2, $3) RETURNING *',
        [workerId, photoUrl, description]
      );

      logger.info('Portfolio photo uploaded', { workerId, photoId: result.rows[0].id });
      
      res.json({
        success: true,
        message: 'Portfolio photo uploaded successfully',
        photo: result.rows[0]
      });
    } catch (error) {
      logger.error('Portfolio photo upload error', { error: error.message });
      console.error('Portfolio photo upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload portfolio photo' });
    }
  });

  // Get worker's portfolio photos
  router.get('/portfolio', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      
      const result = await pool.query(
        'SELECT * FROM portfolio_photos WHERE worker_id = $1 ORDER BY uploaded_at DESC',
        [workerId]
      );

      res.json({ success: true, photos: result.rows });
    } catch (error) {
      logger.error('Get portfolio photos error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch portfolio photos' });
    }
  });

  // Get portfolio photos for a specific worker (public)
  router.get('/portfolio/:workerId', async (req, res) => {
    try {
      const workerId = req.params.workerId;
      
      const result = await pool.query(
        'SELECT * FROM portfolio_photos WHERE worker_id = $1 ORDER BY uploaded_at DESC',
        [workerId]
      );

      res.json({ success: true, photos: result.rows });
    } catch (error) {
      logger.error('Get worker portfolio photos error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch portfolio photos' });
    }
  });

  // Delete portfolio photo
  router.delete('/portfolio/:photoId', requireAuth, workerOnly, async (req, res) => {
    try {
      const photoId = req.params.photoId;
      const workerId = req.session.user.id;

      const result = await pool.query(
        'DELETE FROM portfolio_photos WHERE id = $1 AND worker_id = $2 RETURNING photo_url',
        [photoId, workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Portfolio photo not found' });
      }

      res.json({ success: true, message: 'Portfolio photo deleted successfully' });
    } catch (error) {
      logger.error('Delete portfolio photo error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to delete portfolio photo' });
    }
  });

  return router;
};