const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { cloudinary, portfolioStorage, profilePicStorage } = require('../config/cloudinary');

// Configure multer for portfolio photo uploads with Cloudinary
const portfolioUpload = multer({
  storage: portfolioStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WEBP images are allowed'));
    }
  }
});

// Configure multer for profile picture uploads with Cloudinary
const profilePicUpload = multer({
  storage: profilePicStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit for profile pics
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WEBP images are allowed'));
    }
  }
});

module.exports = (pool, logger, helpers) => {
  const { requireAuth, workerOnly } = require('../middleware/auth');
  const { calculateDistance } = helpers;

  // Get all active workers (approved only - home screen)
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, name, email, speciality, area, primary_suburb, province, secondary_areas, bio, experience, rating, profile_picture, availability_schedule, is_available, latitude, longitude, service_radius, id_verified, approval_status, rate_type, rate_amount
         FROM workers
         WHERE is_active = true AND approval_status = 'approved'
         ORDER BY name ASC`
      );

      // Convert old local profile pic paths to default SVG
      // Add is_verified field and is_pending flag
      const workers = result.rows.map(worker => {
        // Set image field from profile_picture (from prosite)
        worker.image = worker.profile_picture;

        // Convert old local profile pic paths to default SVG
        if (worker.image && worker.image.startsWith('/uploads/')) {
          worker.image = 'images/default-profile.svg';
        }

        // If no image, use default
        if (!worker.image) {
          worker.image = 'images/default-profile.svg';
        }

        // Map id_verified to is_verified for frontend compatibility
        worker.is_verified = worker.id_verified || false;
        // Add is_pending flag for frontend to show "Coming Soon" banner
        worker.is_pending = worker.approval_status === 'pending';
        return worker;
      });

      res.json(workers);
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
        SELECT id, name, email, speciality, area, primary_suburb, province, secondary_areas,
               bio, experience, rating, profile_picture as image,
               availability_schedule, is_available, latitude, longitude, service_radius, id_verified as is_verified,
               rate_type, rate_amount
        FROM workers
        WHERE is_available = true AND is_active = true AND approval_status = 'approved'
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

      // Parse availability_schedule - handle both JSON and string formats
      let schedule = 'both';
      const rawSchedule = result.rows[0].availability_schedule;

      if (rawSchedule) {
        if (typeof rawSchedule === 'object' && rawSchedule.type) {
          // JSON format: {"type": "weekdays"}
          schedule = rawSchedule.type;
        } else if (typeof rawSchedule === 'string') {
          // String format: "weekdays"
          schedule = rawSchedule;
        }
      }

      res.json({
        success: true,
        availability_schedule: schedule,
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

      // Parse the returned schedule value (handle both JSON and string formats)
      let returnedSchedule = 'both';
      const rawSchedule = result.rows[0].availability_schedule;

      if (rawSchedule) {
        if (typeof rawSchedule === 'object' && rawSchedule.type) {
          returnedSchedule = rawSchedule.type;
        } else if (typeof rawSchedule === 'string') {
          returnedSchedule = rawSchedule;
        }
      }

      res.json({
        success: true,
        message: 'Availability updated successfully',
        availability_schedule: returnedSchedule,
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

  // Update worker profile (also handles /worker/profile POST from frontend)
  router.post('/update-profile', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const {
        name,
        phone,
        speciality,
        city,
        suburb,
        address,
        area,
        postal_code,
        service_radius,
        bio,
        experience,
        id_type,
        id_number,
        emergency_name_1,
        emergency_relationship_1,
        emergency_phone_1,
        emergency_email_1,
        emergency_name_2,
        emergency_relationship_2,
        emergency_phone_2,
        emergency_email_2
      } = req.body;

      // Validate required fields
      if (!name || !phone || !speciality || !city || !area || !bio || !experience || !service_radius) {
        return res.status(400).json({ success: false, error: 'All required fields must be filled' });
      }

      // Validate emergency contact 1 (required)
      if (!emergency_name_1 || !emergency_relationship_1 || !emergency_phone_1) {
        return res.status(400).json({ success: false, error: 'Emergency Contact 1 is required' });
      }

      // Validate emergency phone formats
      if (emergency_phone_1 && !/^[0-9]{10}$/.test(emergency_phone_1)) {
        return res.status(400).json({ success: false, error: 'Emergency Contact 1 phone must be 10 digits' });
      }
      if (emergency_phone_2 && !/^[0-9]{10}$/.test(emergency_phone_2)) {
        return res.status(400).json({ success: false, error: 'Emergency Contact 2 phone must be 10 digits' });
      }

      // Validate ID/Passport number
      if (!id_type || !id_number) {
        return res.status(400).json({ success: false, error: 'ID Type and ID/Passport Number are required' });
      }

      // Validate ID format
      if (id_type === 'id_number' && !/^[0-9]{13}$/.test(id_number)) {
        return res.status(400).json({ success: false, error: 'SA ID number must be exactly 13 digits' });
      }
      if (id_type === 'passport' && !/^[A-Z0-9]{6,20}$/i.test(id_number)) {
        return res.status(400).json({ success: false, error: 'Passport number must be 6-20 alphanumeric characters' });
      }

      // Validate phone number format
      if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({ success: false, error: 'Phone number must be 10 digits' });
      }

      // Validate service radius
      if (service_radius < 5 || service_radius > 200) {
        return res.status(400).json({ success: false, error: 'Service radius must be between 5 and 200 km' });
      }

      // Check if ID is already set - if so, only admin can change it via ID change log
      const existingWorker = await pool.query(
        'SELECT id_type, id_number FROM workers WHERE id = $1',
        [workerId]
      );

      let updateQuery;
      let updateValues;

      if (existingWorker.rows[0]?.id_number && existingWorker.rows[0].id_number !== id_number) {
        // ID number exists and is being changed - this should go through change request system
        return res.status(400).json({
          success: false,
          error: 'ID number already set. Use "Request ID Change" to modify it.'
        });
      } else if (!existingWorker.rows[0]?.id_number) {
        // First time setting ID - include id_submitted_at
        updateQuery = `UPDATE workers
         SET name = $1, phone = $2, speciality = $3, city = $4, suburb = $5,
             address = $6, area = $7, postal_code = $8, service_radius = $9,
             bio = $10, experience = $11, id_type = $12, id_number = $13, id_submitted_at = CURRENT_TIMESTAMP,
             emergency_name_1 = $14, emergency_relationship_1 = $15, emergency_phone_1 = $16, emergency_email_1 = $17,
             emergency_name_2 = $18, emergency_relationship_2 = $19, emergency_phone_2 = $20, emergency_email_2 = $21
         WHERE id = $22
         RETURNING *`;
        updateValues = [name, phone, speciality, city, suburb, address, area, postal_code, service_radius, bio, experience, id_type, id_number,
                       emergency_name_1, emergency_relationship_1, emergency_phone_1, emergency_email_1,
                       emergency_name_2, emergency_relationship_2, emergency_phone_2, emergency_email_2, workerId];
      } else {
        // ID unchanged, just update profile
        updateQuery = `UPDATE workers
         SET name = $1, phone = $2, speciality = $3, city = $4, suburb = $5,
             address = $6, area = $7, postal_code = $8, service_radius = $9,
             bio = $10, experience = $11,
             emergency_name_1 = $12, emergency_relationship_1 = $13, emergency_phone_1 = $14, emergency_email_1 = $15,
             emergency_name_2 = $16, emergency_relationship_2 = $17, emergency_phone_2 = $18, emergency_email_2 = $19
         WHERE id = $20
         RETURNING *`;
        updateValues = [name, phone, speciality, city, suburb, address, area, postal_code, service_radius, bio, experience,
                       emergency_name_1, emergency_relationship_1, emergency_phone_1, emergency_email_1,
                       emergency_name_2, emergency_relationship_2, emergency_phone_2, emergency_email_2, workerId];
      }

      const result = await pool.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      logger.info('Worker profile updated', { workerId, id_type_set: !!result.rows[0].id_number });

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

  // Alias for frontend compatibility - POST /profile
  router.post('/profile', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const {
        name,
        phone,
        speciality,
        city,
        province,
        primary_suburb,
        secondary_areas,
        address,
        postal_code,
        service_radius,
        bio,
        experience,
        id_type,
        id_number,
        emergency_name_1,
        emergency_relationship_1,
        emergency_phone_1,
        emergency_email_1,
        emergency_name_2,
        emergency_relationship_2,
        emergency_phone_2,
        emergency_email_2
      } = req.body;

      // Validate required fields
      if (!name || !phone || !speciality || !city || !province || !primary_suburb || !bio || !experience || !service_radius) {
        return res.status(400).json({ success: false, error: 'All required fields must be filled' });
      }

      // Validate emergency contact 1 (required)
      if (!emergency_name_1 || !emergency_relationship_1 || !emergency_phone_1) {
        return res.status(400).json({ success: false, error: 'Emergency Contact 1 is required' });
      }

      // Validate emergency phone formats
      if (emergency_phone_1 && !/^[0-9]{10}$/.test(emergency_phone_1)) {
        return res.status(400).json({ success: false, error: 'Emergency Contact 1 phone must be 10 digits' });
      }
      if (emergency_phone_2 && !/^[0-9]{10}$/.test(emergency_phone_2)) {
        return res.status(400).json({ success: false, error: 'Emergency Contact 2 phone must be 10 digits' });
      }

      // Validate ID/Passport number
      if (!id_type || !id_number) {
        return res.status(400).json({ success: false, error: 'ID Type and ID/Passport Number are required' });
      }

      // Validate ID format
      if (id_type === 'id_number' && !/^[0-9]{13}$/.test(id_number)) {
        return res.status(400).json({ success: false, error: 'SA ID number must be exactly 13 digits' });
      }
      if (id_type === 'passport' && !/^[A-Z0-9]{6,20}$/i.test(id_number)) {
        return res.status(400).json({ success: false, error: 'Passport number must be 6-20 alphanumeric characters' });
      }

      // Validate phone number format
      if (!/^[0-9]{10}$/.test(phone)) {
        return res.status(400).json({ success: false, error: 'Phone number must be 10 digits' });
      }

      // Validate service radius
      if (service_radius < 5 || service_radius > 200) {
        return res.status(400).json({ success: false, error: 'Service radius must be between 5 and 200 km' });
      }

      // Check if ID is already set
      const existingWorker = await pool.query(
        'SELECT id_type, id_number FROM workers WHERE id = $1',
        [workerId]
      );

      let updateQuery;
      let updateValues;

      if (existingWorker.rows[0]?.id_number && existingWorker.rows[0].id_number !== id_number) {
        // ID number exists and is being changed
        return res.status(400).json({
          success: false,
          error: 'ID number already set. Use "Request ID Change" to modify it.'
        });
      } else if (!existingWorker.rows[0]?.id_number) {
        // First time setting ID
        updateQuery = `UPDATE workers
         SET name = $1, phone = $2, speciality = $3, city = $4, province = $5,
             primary_suburb = $6, secondary_areas = $7, address = $8, postal_code = $9, service_radius = $10,
             bio = $11, experience = $12, id_type = $13, id_number = $14, id_submitted_at = CURRENT_TIMESTAMP,
             emergency_name_1 = $15, emergency_relationship_1 = $16, emergency_phone_1 = $17, emergency_email_1 = $18,
             emergency_name_2 = $19, emergency_relationship_2 = $20, emergency_phone_2 = $21, emergency_email_2 = $22
         WHERE id = $23
         RETURNING *`;
        updateValues = [name, phone, speciality, city, province, primary_suburb, secondary_areas, address, postal_code, service_radius, bio, experience, id_type, id_number,
                       emergency_name_1, emergency_relationship_1, emergency_phone_1, emergency_email_1,
                       emergency_name_2, emergency_relationship_2, emergency_phone_2, emergency_email_2, workerId];
      } else {
        // ID unchanged
        updateQuery = `UPDATE workers
         SET name = $1, phone = $2, speciality = $3, city = $4, province = $5,
             primary_suburb = $6, secondary_areas = $7, address = $8, postal_code = $9, service_radius = $10,
             bio = $11, experience = $12,
             emergency_name_1 = $13, emergency_relationship_1 = $14, emergency_phone_1 = $15, emergency_email_1 = $16,
             emergency_name_2 = $17, emergency_relationship_2 = $18, emergency_phone_2 = $19, emergency_email_2 = $20
         WHERE id = $21
         RETURNING *`;
        updateValues = [name, phone, speciality, city, province, primary_suburb, secondary_areas, address, postal_code, service_radius, bio, experience,
                       emergency_name_1, emergency_relationship_1, emergency_phone_1, emergency_email_1,
                       emergency_name_2, emergency_relationship_2, emergency_phone_2, emergency_email_2, workerId];
      }

      const result = await pool.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      logger.info('Worker profile updated', { workerId, id_type_set: !!result.rows[0].id_number });

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
        `SELECT id, name, email, phone, address, city, primary_suburb, province, postal_code, speciality,
                bio, experience, area, service_radius, approval_status, approval_date, id_verified as is_verified,
                id_type, id_number, id_verified, id_submitted_at,
                profile_picture, profile_picture_uploaded_at,
                emergency_name_1, emergency_relationship_1, emergency_phone_1, emergency_email_1,
                emergency_name_2, emergency_relationship_2, emergency_phone_2, emergency_email_2,
                registration_complete, created_at
         FROM workers WHERE id = $1`,
        [workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      // Check if worker has any certificates uploaded (certifications table might not exist yet)
      let hasCertificates = false;
      try {
        const certResult = await pool.query(
          'SELECT COUNT(*) as cert_count FROM certifications WHERE worker_id = $1',
          [workerId]
        );
        hasCertificates = certResult.rows[0].cert_count > 0;
      } catch (certError) {
        // Certifications table doesn't exist yet, skip this check
        logger.error('Get certifications error', { error: certError.message });
      }

      res.json({
        success: true,
        profile: {
          ...result.rows[0],
          has_certificates: hasCertificates
        }
      });
    } catch (error) {
      logger.error('Get worker profile error', { error: error.message });
      console.error('Get worker profile error:', error);
      res.status(500).json({ success: false, error: 'Failed to get profile' });
    }
  });

  // Get profile completion checklist
  router.get('/profile/completion-checklist', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      const result = await pool.query(
        `SELECT profile_picture, id_type, id_number, id_verified,
                emergency_name_1, emergency_phone_1,
                bio, experience, area, province, speciality,
                approval_status, id_verified as is_verified
         FROM workers WHERE id = $1`,
        [workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      const worker = result.rows[0];

      // Check certifications
      const certResult = await pool.query(
        'SELECT COUNT(*) as cert_count FROM certifications WHERE worker_id = $1',
        [workerId]
      );
      const hasCertificates = certResult.rows[0].cert_count > 0;

      // Check service area suburbs (optional - table may not exist yet)
      let hasServiceArea = false;
      try {
        const suburbsResult = await pool.query(
          'SELECT COUNT(*) as suburb_count FROM worker_suburbs WHERE worker_id = $1',
          [workerId]
        );
        hasServiceArea = suburbsResult.rows[0].suburb_count > 0;
      } catch (error) {
        // worker_suburbs table doesn't exist yet - that's okay
        logger.warn('worker_suburbs table not found, skipping suburb check');
        hasServiceArea = false;
      }

      // Build checklist
      const checklist = [
        {
          id: 'profile_picture',
          label: 'Upload Profile Picture',
          completed: !!worker.profile_picture,
          required: true,
          icon: '📸',
          action: 'Go to Settings → Update Profile Picture'
        },
        {
          id: 'id_verification',
          label: 'Provide ID/Passport Information',
          completed: !!(worker.id_type && worker.id_number),
          required: true,
          icon: '🪪',
          action: 'Complete registration form'
        },
        {
          id: 'emergency_contact',
          label: 'Add Emergency Contact',
          completed: !!(worker.emergency_name_1 && worker.emergency_phone_1),
          required: true,
          icon: '🚨',
          action: 'Complete registration form'
        },
        {
          id: 'professional_info',
          label: 'Add Bio & Experience',
          completed: !!(worker.bio && worker.experience),
          required: true,
          icon: '📝',
          action: 'Go to Settings → Professional Profile'
        },
        {
          id: 'service_area',
          label: 'Set Service Area (Province)',
          completed: !!(worker.province || worker.area),
          required: true,
          icon: '📍',
          action: 'Complete registration form'
        },
        {
          id: 'speciality',
          label: 'Select Your Trade/Speciality',
          completed: !!worker.speciality,
          required: true,
          icon: '🔧',
          action: 'Complete registration form'
        },
        {
          id: 'certifications',
          label: 'Upload Certifications/Licenses',
          completed: hasCertificates,
          required: false,
          icon: '📜',
          action: 'Go to Certifications tab'
        }
      ];

      const totalItems = checklist.filter(item => item.required).length;
      const completedItems = checklist.filter(item => item.required && item.completed).length;
      const completionPercentage = Math.round((completedItems / totalItems) * 100);

      const allRequiredComplete = completedItems === totalItems;

      res.json({
        success: true,
        checklist,
        summary: {
          total: totalItems,
          completed: completedItems,
          percentage: completionPercentage,
          allRequiredComplete,
          approvalStatus: worker.approval_status,
          isVerified: worker.is_verified
        }
      });
    } catch (error) {
      logger.error('Get completion checklist error', { error: error.message });
      console.error('Get completion checklist error:', error);
      res.status(500).json({ success: false, error: 'Failed to get checklist' });
    }
  });

  // PUT /workers/profile - Update worker profile (used by Worker Dashboard Profile tab)
  router.put('/profile', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const updates = req.body;

      logger.info('Worker profile update request', { workerId, updates });

      // Build dynamic update query
      const allowedFields = ['name', 'phone', 'bio', 'experience', 'area', 'address', 'city', 'province', 'postal_code', 'speciality'];
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid fields to update' });
      }

      // Add updated_at and worker ID
      updateFields.push(`updated_at = NOW()`);
      values.push(workerId);

      const query = `UPDATE workers SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      logger.info('Worker profile updated successfully', { workerId });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: result.rows[0]
      });
    } catch (error) {
      logger.error('Update worker profile error', { error: error.message, stack: error.stack });
      console.error('Update worker profile error:', error);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
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
      // Cloudinary URL is available in req.file.path
      const photoUrl = req.file.path;
      const cloudinaryId = req.file.filename; // Store Cloudinary public_id for deletion
      const description = req.body.description || '';

      const result = await pool.query(
        'INSERT INTO portfolio_photos (worker_id, photo_url, cloudinary_id, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [workerId, photoUrl, cloudinaryId, description]
      );

      logger.info('Portfolio photo uploaded to Cloudinary', { workerId, photoId: result.rows[0].id, cloudinaryId });

      res.json({
        success: true,
        message: 'Portfolio photo uploaded successfully',
        photo: result.rows[0]
      });
    } catch (error) {
      logger.error('Portfolio photo upload error', { error: error.message, stack: error.stack });
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
        'DELETE FROM portfolio_photos WHERE id = $1 AND worker_id = $2 RETURNING photo_url, cloudinary_id',
        [photoId, workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Portfolio photo not found' });
      }

      // Delete from Cloudinary if cloudinary_id exists
      const cloudinaryId = result.rows[0].cloudinary_id;
      if (cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(cloudinaryId);
          logger.info('Portfolio photo deleted from Cloudinary', { workerId, photoId, cloudinaryId });
        } catch (cloudinaryError) {
          logger.error('Failed to delete from Cloudinary', { error: cloudinaryError.message, cloudinaryId });
          // Continue even if Cloudinary deletion fails
        }
      }

      res.json({ success: true, message: 'Portfolio photo deleted successfully' });
    } catch (error) {
      logger.error('Delete portfolio photo error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to delete portfolio photo' });
    }
  });

  // Profile Picture Routes

  // Upload profile picture
  router.post('/upload-profile-picture', requireAuth, workerOnly, uploadLimiter, profilePicUpload.single('profilePicture'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const workerId = req.session.user.id;
      const imageUrl = req.file.path;
      const cloudinaryId = req.file.filename;

      // Delete old profile picture from Cloudinary if exists
      const oldPicture = await pool.query(
        'SELECT profile_picture_cloudinary_id FROM workers WHERE id = $1',
        [workerId]
      );

      if (oldPicture.rows[0]?.profile_picture_cloudinary_id) {
        try {
          await cloudinary.uploader.destroy(oldPicture.rows[0].profile_picture_cloudinary_id);
        } catch (error) {
          logger.warn('Failed to delete old profile picture from Cloudinary', { error: error.message });
        }
      }

      // Update worker with new profile picture
      const result = await pool.query(
        `UPDATE workers
         SET profile_picture = $1,
             profile_picture_cloudinary_id = $2,
             profile_picture_uploaded_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING profile_picture, profile_picture_uploaded_at`,
        [imageUrl, cloudinaryId, workerId]
      );

      logger.info('Profile picture uploaded', { workerId, cloudinaryId });

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        profile_picture: result.rows[0].profile_picture
      });
    } catch (error) {
      logger.error('Upload profile picture error', { error: error.message });
      console.error('Upload profile picture error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload profile picture' });
    }
  });

  // Get worker registration status
  router.get('/registration-status', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      const result = await pool.query(
        'SELECT approval_status FROM workers WHERE id = $1',
        [workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      res.json({
        success: true,
        approval_status: result.rows[0].approval_status || 'incomplete'
      });
    } catch (error) {
      logger.error('Get registration status error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to get registration status' });
    }
  });

  // Get worker rate
  router.get('/rate', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      // Auto-create rate columns if they don't exist
      try {
        await pool.query('ALTER TABLE workers ADD COLUMN IF NOT EXISTS rate_type VARCHAR(10)');
        await pool.query('ALTER TABLE workers ADD COLUMN IF NOT EXISTS rate_amount DECIMAL(10,2)');
      } catch (alterError) {
        // Columns likely already exist, continue
      }

      const result = await pool.query(
        'SELECT rate_type, rate_amount FROM workers WHERE id = $1',
        [workerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Worker not found' });
      }

      res.json({
        success: true,
        rate: {
          rate_type: result.rows[0].rate_type,
          rate_amount: result.rows[0].rate_amount
        }
      });
    } catch (error) {
      logger.error('Get rate error', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to get rate' });
    }
  });

  // Update worker rate
  router.post('/rate', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { rate_type, rate_amount } = req.body;

      // Auto-create rate columns if they don't exist
      try {
        await pool.query('ALTER TABLE workers ADD COLUMN IF NOT EXISTS rate_type VARCHAR(10)');
        await pool.query('ALTER TABLE workers ADD COLUMN IF NOT EXISTS rate_amount DECIMAL(10,2)');
      } catch (alterError) {
        // Columns likely already exist, continue
      }

      // Validate rate type
      if (!rate_type || !['hourly', 'fixed'].includes(rate_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid rate type. Must be "hourly" or "fixed"'
        });
      }

      // Validate rate amount
      if (!rate_amount || isNaN(rate_amount) || parseFloat(rate_amount) <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid rate amount. Must be a positive number'
        });
      }

      // Update worker rate
      await pool.query(
        `UPDATE workers
         SET rate_type = $1,
             rate_amount = $2
         WHERE id = $3`,
        [rate_type, parseFloat(rate_amount), workerId]
      );

      logger.info('Worker rate updated', {
        workerId,
        rate_type,
        rate_amount
      });

      res.json({
        success: true,
        message: 'Rate updated successfully'
      });
    } catch (error) {
      logger.error('Update rate error', { error: error.message });
      console.error('Update rate error:', error);
      res.status(500).json({ success: false, error: 'Failed to update rate' });
    }
  });

  // Submit registration documents
  router.post('/submit-registration', requireAuth, workerOnly, uploadLimiter, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      // TODO: Handle file uploads for ID, proof of address, certificates
      // For now, we'll just store the reference information and update status

      const {
        registrationNumber,
        ref1Name, ref1Relationship, ref1Phone, ref1Email,
        ref2Name, ref2Relationship, ref2Phone, ref2Email
      } = req.body;

      // Validate required fields
      if (!ref1Name || !ref1Relationship || !ref1Phone ||
          !ref2Name || !ref2Relationship || !ref2Phone) {
        return res.status(400).json({
          success: false,
          error: 'All reference information is required'
        });
      }

      // Store references in JSON format
      const references = {
        reference1: {
          name: ref1Name,
          relationship: ref1Relationship,
          phone: ref1Phone,
          email: ref1Email || null
        },
        reference2: {
          name: ref2Name,
          relationship: ref2Relationship,
          phone: ref2Phone,
          email: ref2Email || null
        }
      };

      // Update worker record
      await pool.query(
        `UPDATE workers
         SET approval_status = 'pending',
             professional_registration_number = $1,
             references = $2,
             registration_submitted_at = NOW()
         WHERE id = $3`,
        [registrationNumber || null, JSON.stringify(references), workerId]
      );

      logger.info('Worker submitted registration', {
        workerId,
        references: `${ref1Name}, ${ref2Name}`
      });

      res.json({
        success: true,
        message: 'Registration submitted successfully! We will review your application within 7 business days.'
      });
    } catch (error) {
      logger.error('Submit registration error', { error: error.message });
      console.error('Submit registration error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit registration' });
    }
  });

  // Complete registration endpoint - handles new multi-step registration form
  router.post('/complete-registration', requireAuth, workerOnly, uploadLimiter, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      const {
        fullName,
        phone,
        address,
        city,
        province,
        postalCode,
        documentType,
        idNumber,
        passportNumber,
        idDocumentUrl,
        proofOfAddressUrl,
        certificationUrls,
        yearsExperience,
        portfolioDescription,
        references
      } = req.body;

      // Validate required fields
      if (!fullName || !phone || !address || !city || !province) {
        return res.status(400).json({
          success: false,
          error: 'Please complete all required personal information fields'
        });
      }

      if (!idDocumentUrl) {
        return res.status(400).json({
          success: false,
          error: 'Please upload your ID document or passport'
        });
      }

      if (!proofOfAddressUrl) {
        return res.status(400).json({
          success: false,
          error: 'Please upload proof of address'
        });
      }

      if (!references || references.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please provide at least one reference'
        });
      }

      // Update worker profile with all registration data
      await pool.query(
        `UPDATE workers
         SET name = $1,
             phone = $2,
             address = $3,
             city = $4,
             province = $5,
             postal_code = $6,
             id_number = $7,
             passport_number = $8,
             id_document_url = $9,
             proof_of_address_url = $10,
             years_experience = $11,
             portfolio_description = $12,
             "references" = $13,
             approval_status = 'pending',
             registration_complete = true,
             registration_submitted_at = NOW(),
             updated_at = NOW()
         WHERE id = $14`,
        [
          fullName,
          phone,
          address,
          city,
          province,
          postalCode,
          documentType === 'id' ? idNumber : null,
          documentType === 'passport' ? passportNumber : null,
          idDocumentUrl,
          proofOfAddressUrl,
          yearsExperience || null,
          portfolioDescription || null,
          JSON.stringify(references),
          workerId
        ]
      );

      // Store certifications if provided
      if (certificationUrls && certificationUrls.length > 0) {
        for (const certUrl of certificationUrls) {
          await pool.query(
            `INSERT INTO certifications (worker_id, document_url, document_name, status, document_type, uploaded_at)
             VALUES ($1, $2, $3, 'pending', 'certification', NOW())`,
            [workerId, certUrl, 'Professional Certification']
          );
        }
      }

      logger.info('Worker completed registration', {
        workerId,
        name: fullName,
        documentType
      });

      res.json({
        success: true,
        message: 'Registration completed successfully! We will review your application within 7 business days.'
      });
    } catch (error) {
      logger.error('Complete registration error', { error: error.message, stack: error.stack });
      console.error('Complete registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete registration. Please try again.'
      });
    }
  });

  // Get certifications for a specific worker (clients can view)
  router.get('/:workerId/certifications', requireAuth, async (req, res) => {
    try {
      const { workerId } = req.params;
      const userId = req.session.user.id;
      const userType = req.session.user.type;

      // Only allow clients to view certifications (not other workers)
      if (userType !== 'client') {
        return res.status(403).json({
          success: false,
          error: 'Only clients can view worker certifications'
        });
      }

      // Fetch APPROVED professional certifications only for this worker
      // Only return documents where document_type = 'certification' (not verification documents)
      const result = await pool.query(
        `SELECT id, document_name as certification_name,
                'document' as certification_type, uploaded_at
         FROM certifications
         WHERE worker_id = $1
           AND status = 'approved'
           AND document_type = 'certification'
         ORDER BY uploaded_at DESC`,
        [workerId]
      );

      res.json({
        success: true,
        certifications: result.rows
      });
    } catch (error) {
      logger.error('Get worker certifications error', { error: error.message });
      console.error('Get worker certifications error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch certifications' });
    }
  });

  // Request ID number change (requires admin approval)
  router.post('/request-id-change', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { new_id_type, new_id_number, reason } = req.body;

      if (!new_id_type || !new_id_number || !reason) {
        return res.status(400).json({
          success: false,
          error: 'ID type, ID number, and reason are required'
        });
      }

      // Validate new ID format
      if (new_id_type === 'id_number' && !/^[0-9]{13}$/.test(new_id_number)) {
        return res.status(400).json({
          success: false,
          error: 'SA ID number must be exactly 13 digits'
        });
      }
      if (new_id_type === 'passport' && !/^[A-Z0-9]{6,20}$/i.test(new_id_number)) {
        return res.status(400).json({
          success: false,
          error: 'Passport number must be 6-20 alphanumeric characters'
        });
      }

      // Get current ID information
      const currentWorker = await pool.query(
        'SELECT id_type, id_number FROM workers WHERE id = $1',
        [workerId]
      );

      if (!currentWorker.rows[0]?.id_number) {
        return res.status(400).json({
          success: false,
          error: 'No ID number set yet. Please set it through profile update.'
        });
      }

      const old_id_type = currentWorker.rows[0].id_type;
      const old_id_number = currentWorker.rows[0].id_number;

      // Check if there's already a pending change request
      const pendingRequest = await pool.query(
        'SELECT id FROM id_change_logs WHERE worker_id = $1 AND admin_reviewed = false',
        [workerId]
      );

      if (pendingRequest.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'You already have a pending ID change request. Please wait for admin review.'
        });
      }

      // Create change request log
      await pool.query(
        `INSERT INTO id_change_logs
         (worker_id, old_id_type, old_id_number, new_id_type, new_id_number, change_reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [workerId, old_id_type, old_id_number, new_id_type, new_id_number, reason]
      );

      logger.info('ID change request submitted', {
        workerId,
        old_id_type,
        new_id_type,
        reason: reason.substring(0, 50)
      });

      res.json({
        success: true,
        message: 'ID change request submitted successfully. Admin will review your request.'
      });
    } catch (error) {
      logger.error('Request ID change error', { error: error.message });
      console.error('Request ID change error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit ID change request' });
    }
  });

  // Get worker completion rate statistics
  router.get('/:workerId/completion-rate', async (req, res) => {
    try {
      const workerId = req.params.workerId;

      // Get all bookings for this worker (excluding cancelled ones from total)
      const result = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'Completed') as completed_jobs,
          COUNT(*) FILTER (WHERE status IN ('Completed', 'Confirmed', 'In Progress', 'Pending')) as total_jobs
        FROM bookings
        WHERE worker_id = $1
      `, [workerId]);

      const stats = result.rows[0];
      const completedJobs = parseInt(stats.completed_jobs) || 0;
      const totalJobs = parseInt(stats.total_jobs) || 0;

      // Calculate completion rate percentage
      const completionRate = totalJobs > 0
        ? Math.round((completedJobs / totalJobs) * 100)
        : 0;

      res.json({
        success: true,
        completedJobs,
        totalJobs,
        completionRate
      });
    } catch (error) {
      logger.error('Get completion rate error', { error: error.message });
      console.error('Get completion rate error:', error);
      res.status(500).json({ success: false, error: 'Failed to get completion rate' });
    }
  });

  // ==================== PORTFOLIO MANAGEMENT ====================

  // Get worker's portfolio photos
  router.get('/portfolio', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      const result = await pool.query(
        `SELECT id, url, thumbnail_url, cloudinary_id, caption, display_order, created_at
         FROM portfolio_photos
         WHERE worker_id = $1
         ORDER BY display_order ASC, created_at DESC`,
        [workerId]
      );

      res.json({
        success: true,
        photos: result.rows
      });
    } catch (error) {
      logger.error('Get portfolio photos error', { error: error.message });
      console.error('Get portfolio photos error:', error);
      res.status(500).json({ success: false, error: 'Failed to get portfolio photos' });
    }
  });

  // Upload portfolio photo
  router.post('/upload-portfolio', requireAuth, workerOnly, uploadLimiter, portfolioUpload.single('photo'), async (req, res) => {
    try {
      const workerId = req.session.user.id;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No photo provided' });
      }

      const { caption } = req.body;

      // Get the highest display_order for this worker
      const orderResult = await pool.query(
        'SELECT COALESCE(MAX(display_order), -1) as max_order FROM portfolio_photos WHERE worker_id = $1',
        [workerId]
      );
      const displayOrder = orderResult.rows[0].max_order + 1;

      // Insert portfolio photo
      const result = await pool.query(
        `INSERT INTO portfolio_photos (worker_id, url, thumbnail_url, cloudinary_id, caption, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, url, thumbnail_url, cloudinary_id, caption, display_order, created_at`,
        [
          workerId,
          req.file.path, // Cloudinary URL
          req.file.path, // Use same URL for thumbnail (Cloudinary can resize on-the-fly)
          req.file.filename, // Cloudinary public_id
          caption || null,
          displayOrder
        ]
      );

      logger.info('Portfolio photo uploaded', {
        workerId,
        photoId: result.rows[0].id,
        cloudinaryId: req.file.filename
      });

      res.json({
        success: true,
        photo: result.rows[0]
      });
    } catch (error) {
      logger.error('Upload portfolio photo error', { error: error.message });
      console.error('Upload portfolio photo error:', error);

      // Clean up uploaded file from Cloudinary if database insert failed
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (cleanupError) {
          logger.error('Cloudinary cleanup error', { error: cleanupError.message });
        }
      }

      res.status(500).json({ success: false, error: 'Failed to upload portfolio photo' });
    }
  });

  // Delete portfolio photo
  router.delete('/portfolio/:photoId', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const { photoId } = req.params;

      // Get photo details first to verify ownership and get cloudinary_id
      const photoResult = await pool.query(
        'SELECT id, cloudinary_id, worker_id FROM portfolio_photos WHERE id = $1',
        [photoId]
      );

      if (photoResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Photo not found' });
      }

      const photo = photoResult.rows[0];

      // Verify ownership
      if (photo.worker_id !== workerId) {
        return res.status(403).json({ success: false, error: 'Unauthorized to delete this photo' });
      }

      // Delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(photo.cloudinary_id);
        logger.info('Deleted from Cloudinary', { cloudinaryId: photo.cloudinary_id });
      } catch (cloudinaryError) {
        logger.error('Cloudinary delete error', { error: cloudinaryError.message });
        // Continue with database deletion even if Cloudinary fails
      }

      // Delete from database
      await pool.query('DELETE FROM portfolio_photos WHERE id = $1', [photoId]);

      logger.info('Portfolio photo deleted', {
        workerId,
        photoId,
        cloudinaryId: photo.cloudinary_id
      });

      res.json({
        success: true,
        message: 'Photo deleted successfully'
      });
    } catch (error) {
      logger.error('Delete portfolio photo error', { error: error.message });
      console.error('Delete portfolio photo error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete portfolio photo' });
    }
  });

  // Get dashboard statistics
  router.get('/dashboard-stats', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get today's bookings count
      const todayBookingsResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM bookings
         WHERE worker_id = $1
         AND booking_date >= $2
         AND booking_date < $3
         AND status NOT IN ('cancelled', 'declined')`,
        [workerId, today, new Date(today.getTime() + 24 * 60 * 60 * 1000)]
      );

      // Get pending requests count
      const pendingRequestsResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM bookings
         WHERE worker_id = $1 AND status = 'pending'`,
        [workerId]
      );

      // Get yesterday's pending count for trend
      const yesterdayPendingResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM bookings
         WHERE worker_id = $1
         AND status = 'pending'
         AND created_at < $2`,
        [workerId, today]
      );

      // Get completed jobs and earnings (if payment system is implemented)
      const completedJobsResult = await pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total
         FROM bookings
         WHERE worker_id = $1 AND status = 'completed'`,
        [workerId]
      );

      // Get this month's earnings for trend
      const monthEarningsResult = await pool.query(
        `SELECT COALESCE(SUM(price), 0) as total
         FROM bookings
         WHERE worker_id = $1
         AND status = 'completed'
         AND booking_date >= $2`,
        [workerId, startOfMonth]
      );

      // Get last month's earnings
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = startOfMonth;
      const lastMonthEarningsResult = await pool.query(
        `SELECT COALESCE(SUM(price), 0) as total
         FROM bookings
         WHERE worker_id = $1
         AND status = 'completed'
         AND booking_date >= $2
         AND booking_date < $3`,
        [workerId, lastMonthStart, lastMonthEnd]
      );

      // Calculate completion rate
      const totalBookingsResult = await pool.query(
        `SELECT COUNT(*) as total
         FROM bookings
         WHERE worker_id = $1 AND status NOT IN ('cancelled', 'declined')`,
        [workerId]
      );

      const todayBookings = parseInt(todayBookingsResult.rows[0].count);
      const pendingRequests = parseInt(pendingRequestsResult.rows[0].count);
      const yesterdayPending = parseInt(yesterdayPendingResult.rows[0].count);
      const completedJobs = parseInt(completedJobsResult.rows[0].count);
      const totalEarnings = parseFloat(completedJobsResult.rows[0].total);
      const monthEarnings = parseFloat(monthEarningsResult.rows[0].total);
      const lastMonthEarnings = parseFloat(lastMonthEarningsResult.rows[0].total);
      const totalBookings = parseInt(totalBookingsResult.rows[0].total);

      const completionRate = totalBookings > 0
        ? Math.round((completedJobs / totalBookings) * 100)
        : 0;

      const pendingChange = pendingRequests - yesterdayPending;
      const earningsChange = monthEarnings - lastMonthEarnings;

      res.json({
        success: true,
        stats: {
          todayBookings,
          pendingRequests,
          pendingChange,
          totalEarnings,
          earningsChange,
          completedJobs,
          totalBookings,
          completionRate,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Dashboard stats error', { error: error.message });
      console.error('Dashboard stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
    }
  });

  return router;
};