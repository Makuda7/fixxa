const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadLimiter, reviewLimiter } = require('../middleware/rateLimiter');
const { moderateContent } = require('../utils/contentModeration');
const { scanFile } = require('../utils/virusScanner');
const { cloudinary, reviewPhotoStorage } = require('../config/cloudinary');

// Configure multer for review photo uploads
const reviewPhotoUpload = multer({
  storage: reviewPhotoStorage,
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

module.exports = (pool, logger, upload) => {
  const { requireAuth, clientOnly } = require('../middleware/auth');

  // Get reviews for a worker
  router.get('/', async (req, res) => {
    try {
      const workerId = req.query.workerId;
      if (!workerId) {
        return res.status(400).json({ success: false, error: 'Worker ID required' });
      }

      const result = await pool.query(`
        SELECT r.*, u.name AS client_name
        FROM reviews r
        LEFT JOIN users u ON r.client_id = u.id
        WHERE r.worker_id = $1
        ORDER BY r.created_at DESC
      `, [workerId]);
      
      const processedReviews = result.rows.map(review => {
        let photos = [];
        try {
          if (review.photos) {
            photos = typeof review.photos === 'string' ? JSON.parse(review.photos) : review.photos;
          }
        } catch (e) {
          console.error('Photo parse error:', e);
        }
        
        return {
          id: review.id,
          overall_rating: review.overall_rating,
          quality_rating: review.quality_rating,
          punctuality_rating: review.punctuality_rating,
          communication_rating: review.communication_rating,
          value_rating: review.value_rating,
          review_text: review.review_text,
          photos: photos,
          created_at: review.created_at,
          client_name: review.client_name ? review.client_name.split(' ')[0] : 'Anonymous'
        };
      });
      
      res.json(processedReviews);
    } catch (err) {
      logger.error('Failed to fetch worker reviews', { error: err.message, stack: err.stack });
      console.error('Failed to fetch worker reviews:', err);
      res.status(500).json([]);
    }
  });

  // COMMENTED OUT: Get worker's completion photos from approved completion requests
  // REASON: completion_requests table doesn't exist yet
  // TO ENABLE: Create the table using the SQL below, then uncomment this endpoint
  /*
  router.get('/workers/:workerId/completion-photos', async (req, res) => {
    try {
      const workerId = req.params.workerId;
      
      const result = await pool.query(`
        SELECT 
          cr.photos,
          cr.completion_notes,
          cr.created_at,
          b.booking_date,
          u.name AS client_name
        FROM completion_requests cr
        JOIN bookings b ON cr.booking_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        WHERE cr.worker_id = $1 
          AND cr.status = 'Approved'
          AND cr.photos IS NOT NULL
        ORDER BY cr.created_at DESC
        LIMIT 50
      `, [workerId]);
      
      const allPhotos = [];
      result.rows.forEach(row => {
        try {
          let photos = typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos;
          if (Array.isArray(photos)) {
            photos.forEach(photoUrl => {
              allPhotos.push({
                url: photoUrl,
                caption: row.completion_notes || '',
                date: row.booking_date || row.created_at,
                clientName: row.client_name ? row.client_name.split(' ')[0] : null
              });
            });
          }
        } catch (e) {
          console.error('Error parsing completion photos:', e);
        }
      });
      
      res.json({ 
        success: true, 
        photos: allPhotos,
        total: allPhotos.length 
      });
    } catch (err) {
      logger.error('Failed to fetch completion photos', { error: err.message, stack: err.stack });
      console.error('Failed to fetch completion photos:', err);
      res.status(500).json({ success: false, error: 'Database error', photos: [] });
    }
  });
  */

  // Upload review photo
  router.post('/upload-photo', requireAuth, uploadLimiter, upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const userId = req.session.user.id;
      const fileName = req.file.originalname;

      // STEP 1: Virus scan the file BEFORE uploading to Cloudinary
      logger.info('Scanning review photo for viruses', { userId, fileName });
      const scanResult = await scanFile(req.file);

      if (!scanResult.clean) {
        logger.warn('VIRUS DETECTED in review photo upload', {
          userId,
          fileName,
          viruses: scanResult.foundViruses
        });

        return res.status(400).json({
          success: false,
          error: 'File failed security scan - malware detected. Please ensure your image is safe and try again.',
          code: 'VIRUS_DETECTED'
        });
      }

      logger.info('Review photo passed virus scan', { userId, fileName, scanResult: scanResult.scanResult });

      // STEP 2: Upload to Cloudinary (file is clean)
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'fixxa/review-photos',
            resource_type: 'image',
            transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
            public_id: `review-${userId}-${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      const cloudinaryResult = await uploadPromise;
      const fileUrl = cloudinaryResult.secure_url;
      const cloudinaryId = cloudinaryResult.public_id;

      res.json({
        success: true,
        url: fileUrl,
        filename: cloudinaryId,
        originalName: req.file.originalname,
        size: req.file.size
      });

    } catch (error) {
      logger.error('Photo upload error', { error: error.message, stack: error.stack });
      console.error('Photo upload error:', error);
      res.status(500).json({ success: false, error: 'Upload failed: ' + error.message });
    }
  });

  // NEW: Upload photo to existing review
  router.post('/:reviewId/upload-photo', requireAuth, clientOnly, uploadLimiter, upload.single('photo'), async (req, res) => {
    try {
      const reviewId = req.params.reviewId;
      const clientId = req.session.user.id;

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const fileName = req.file.originalname;

      // Verify review belongs to this client and get existing photos
      const reviewCheck = await pool.query(
        'SELECT photos FROM reviews WHERE id = $1 AND client_id = $2',
        [reviewId, clientId]
      );

      if (reviewCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Review not found or unauthorized' });
      }

      // STEP 1: Virus scan the file BEFORE uploading to Cloudinary
      logger.info('Scanning review photo for viruses', { clientId, reviewId, fileName });
      const scanResult = await scanFile(req.file);

      if (!scanResult.clean) {
        logger.warn('VIRUS DETECTED in review photo upload', {
          clientId,
          reviewId,
          fileName,
          viruses: scanResult.foundViruses
        });

        return res.status(400).json({
          success: false,
          error: 'File failed security scan - malware detected. Please ensure your image is safe and try again.',
          code: 'VIRUS_DETECTED'
        });
      }

      logger.info('Review photo passed virus scan', { clientId, reviewId, fileName, scanResult: scanResult.scanResult });

      // STEP 2: Upload to Cloudinary (file is clean)
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'fixxa/review-photos',
            resource_type: 'image',
            transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
            public_id: `review-${clientId}-${Date.now()}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      const cloudinaryResult = await uploadPromise;
      const fileUrl = cloudinaryResult.secure_url;

      // Parse existing photos
      let existingPhotos = [];
      try {
        const photosData = reviewCheck.rows[0].photos;
        existingPhotos = typeof photosData === 'string' ? JSON.parse(photosData) : (photosData || []);
      } catch (e) {
        console.error('Error parsing existing photos:', e);
      }

      // Add new photo
      existingPhotos.push(fileUrl);

      // Update review with new photos array
      await pool.query(
        'UPDATE reviews SET photos = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(existingPhotos), reviewId]
      );

      res.json({
        success: true,
        url: fileUrl,
        allPhotos: existingPhotos
      });

    } catch (error) {
      logger.error('Photo upload to review error', { error: error.message });
      console.error('Photo upload to review error:', error);
      res.status(500).json({ success: false, error: 'Upload failed' });
    }
  });

  // Get client's reviews
  router.get('/client', requireAuth, clientOnly, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      
      const result = await pool.query(`
        SELECT 
          r.*,
          w.name AS professional_name, 
          w.speciality AS service,
          b.booking_date
        FROM reviews r
        LEFT JOIN workers w ON r.worker_id = w.id
        LEFT JOIN bookings b ON r.booking_id = b.id
        WHERE r.client_id = $1
        ORDER BY r.created_at DESC
      `, [clientId]);
      
      const processedReviews = result.rows.map(review => {
        let photos = [];
        try {
          if (review.photos) {
            photos = typeof review.photos === 'string' ? JSON.parse(review.photos) : review.photos;
          }
        } catch (e) {
          console.error('Photo parse error for review:', review.id, e);
        }
        
        return {
          id: review.id,
          booking_id: review.booking_id,
          worker_id: review.worker_id,
          overall_rating: review.overall_rating,
          quality_rating: review.quality_rating,
          punctuality_rating: review.punctuality_rating,
          communication_rating: review.communication_rating,
          value_rating: review.value_rating,
          review_text: review.review_text,
          photos: photos,
          created_at: review.created_at,
          updated_at: review.updated_at,
          booking_date: review.booking_date,
          professional_name: review.professional_name || 'Professional',
          service: review.service || 'Service'
        };
      });
      
      res.json({ success: true, reviews: processedReviews });
    } catch (err) {
      logger.error('Failed to fetch client reviews', { error: err.message, stack: err.stack });
      console.error('Failed to fetch reviews:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Submit review
  router.post('/client', requireAuth, clientOnly, reviewLimiter, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      const { 
        booking_id, 
        overall_rating, 
        quality_rating, 
        punctuality_rating, 
        communication_rating, 
        value_rating, 
        review_text,
        photos
      } = req.body;

      if (!booking_id) {
        return res.status(400).json({ success: false, error: 'Booking ID required' });
      }

      if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
        return res.status(400).json({ success: false, error: 'Valid overall rating required (1-5)' });
      }

      const bookingCheck = await pool.query(`
        SELECT * FROM bookings
        WHERE id = $1 AND user_id = $2 AND status = 'Completed'
      `, [booking_id, clientId]);

      if (bookingCheck.rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid booking or not completed' });
      }

      const existingReview = await pool.query(`
        SELECT id FROM reviews WHERE booking_id = $1 AND client_id = $2
      `, [booking_id, clientId]);

      if (existingReview.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Review already exists for this booking' });
      }

      // Moderate review text for profanity
      let moderatedText = review_text || '';
      let moderationFlag = null;

      if (review_text && review_text.trim().length > 0) {
        const moderation = moderateContent(review_text, 'review');

        if (moderation.flaggedWords && moderation.flaggedWords.length > 0) {
          moderatedText = moderation.cleanText;
          moderationFlag = {
            flagged: true,
            reason: moderation.reason,
            flaggedWords: moderation.flaggedWords,
            originalText: review_text,
            action: moderation.action
          };

          logger.warn('Review contains inappropriate language', {
            clientId,
            bookingId: booking_id,
            flaggedWords: moderation.flaggedWords
          });
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const result = await client.query(`
          INSERT INTO reviews (
            client_id, booking_id, worker_id, overall_rating,
            quality_rating, punctuality_rating, communication_rating,
            value_rating, review_text, photos
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          clientId,
          booking_id,
          bookingCheck.rows[0].worker_id,
          overall_rating,
          quality_rating || null,
          punctuality_rating || null,
          communication_rating || null,
          value_rating || null,
          moderatedText, // Use moderated text instead of original
          JSON.stringify(photos || [])
        ]);

        await client.query(`
          UPDATE bookings SET has_review = true WHERE id = $1
        `, [booking_id]);

        // Recalculate worker's average rating from all reviews
        const workerId = bookingCheck.rows[0].worker_id;
        const ratingResult = await client.query(`
          SELECT AVG(overall_rating) as avg_rating, COUNT(*) as review_count
          FROM reviews
          WHERE worker_id = $1
        `, [workerId]);

        const avgRating = parseFloat(ratingResult.rows[0].avg_rating) || 0;
        const reviewCount = parseInt(ratingResult.rows[0].review_count) || 0;

        // Round to nearest 0.5 for star display (e.g., 4.3 -> 4.5, 4.2 -> 4.0)
        const roundedRating = Math.round(avgRating * 2) / 2;

        // Update worker's rating in workers table
        await client.query(`
          UPDATE workers
          SET rating = $1
          WHERE id = $2
        `, [roundedRating, workerId]);

        await client.query('COMMIT');

        logger.info('Review submitted successfully', {
          reviewId: result.rows[0].id,
          bookingId: booking_id,
          workerId: workerId,
          newRating: roundedRating,
          reviewCount: reviewCount
        });

        // Send email notification to worker about the new review
        const workerResult = await pool.query(
          'SELECT name, email FROM workers WHERE id = $1',
          [workerId]
        );

        const clientResult = await pool.query(
          'SELECT name FROM users WHERE id = $1',
          [clientId]
        );

        if (workerResult.rows.length > 0 && clientResult.rows.length > 0) {
          const { sendEmail } = require('../utils/email');
          const { createReviewReceivedEmail } = require('../templates/emails');

          const worker = workerResult.rows[0];
          const client = clientResult.rows[0];
          const bookingDate = bookingCheck.rows[0].booking_date;

          const emailContent = createReviewReceivedEmail(
            worker.name,
            client.name,
            overall_rating,
            review_text || '',
            bookingDate
          );

          await sendEmail(worker.email, emailContent.subject, emailContent.html).catch(err => {
            logger.error('Failed to send review notification email', {
              error: err.message,
              workerEmail: worker.email
            });
            // Don't fail the review submission if email fails
          });
        }

        res.json({ success: true, review: result.rows[0] });
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Failed to submit review transaction', { error: err.message, bookingId: booking_id });
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      logger.error('Submit review error', { error: err.message, stack: err.stack });
      console.error('Submit review error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // NEW: Update existing review
  router.put('/:reviewId', requireAuth, clientOnly, async (req, res) => {
    try {
      const reviewId = req.params.reviewId;
      const clientId = req.session.user.id;
      const { 
        overall_rating, 
        quality_rating, 
        punctuality_rating, 
        communication_rating, 
        value_rating, 
        review_text,
        photos
      } = req.body;

      // Verify review belongs to this client
      const reviewCheck = await pool.query(
        'SELECT * FROM reviews WHERE id = $1 AND client_id = $2',
        [reviewId, clientId]
      );

      if (reviewCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Review not found or unauthorized' });
      }

      if (overall_rating && (overall_rating < 1 || overall_rating > 5)) {
        return res.status(400).json({ success: false, error: 'Valid overall rating required (1-5)' });
      }

      // Build update query dynamically based on provided fields
      const updates = [];
      const values = [];
      let valueIndex = 1;

      if (overall_rating !== undefined) {
        updates.push(`overall_rating = $${valueIndex++}`);
        values.push(overall_rating);
      }
      if (quality_rating !== undefined) {
        updates.push(`quality_rating = $${valueIndex++}`);
        values.push(quality_rating);
      }
      if (punctuality_rating !== undefined) {
        updates.push(`punctuality_rating = $${valueIndex++}`);
        values.push(punctuality_rating);
      }
      if (communication_rating !== undefined) {
        updates.push(`communication_rating = $${valueIndex++}`);
        values.push(communication_rating);
      }
      if (value_rating !== undefined) {
        updates.push(`value_rating = $${valueIndex++}`);
        values.push(value_rating);
      }
      if (review_text !== undefined) {
        updates.push(`review_text = $${valueIndex++}`);
        values.push(review_text);
      }
      if (photos !== undefined) {
        updates.push(`photos = $${valueIndex++}`);
        values.push(JSON.stringify(photos));
      }

      updates.push(`updated_at = NOW()`);
      values.push(reviewId);

      const query = `
        UPDATE reviews 
        SET ${updates.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      // Recalculate worker's average rating if overall_rating was updated
      if (overall_rating !== undefined) {
        const workerId = reviewCheck.rows[0].worker_id;
        const ratingResult = await pool.query(`
          SELECT AVG(overall_rating) as avg_rating, COUNT(*) as review_count
          FROM reviews
          WHERE worker_id = $1
        `, [workerId]);

        const avgRating = parseFloat(ratingResult.rows[0].avg_rating) || 0;
        const roundedRating = Math.round(avgRating * 2) / 2;

        await pool.query(`
          UPDATE workers SET rating = $1 WHERE id = $2
        `, [roundedRating, workerId]);

        logger.info('Worker rating recalculated after review update', {
          workerId,
          newRating: roundedRating
        });
      }

      logger.info('Review updated successfully', { reviewId });
      res.json({ success: true, review: result.rows[0] });

    } catch (err) {
      logger.error('Update review error', { error: err.message, stack: err.stack });
      console.error('Update review error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // NEW: Delete photo from review
  router.delete('/:reviewId/photos', requireAuth, clientOnly, async (req, res) => {
    try {
      const reviewId = req.params.reviewId;
      const clientId = req.session.user.id;
      const { photoUrl } = req.body;

      if (!photoUrl) {
        return res.status(400).json({ success: false, error: 'Photo URL required' });
      }

      // Verify review belongs to this client
      const reviewCheck = await pool.query(
        'SELECT photos FROM reviews WHERE id = $1 AND client_id = $2',
        [reviewId, clientId]
      );

      if (reviewCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: 'Review not found or unauthorized' });
      }

      // Parse existing photos
      let existingPhotos = [];
      try {
        const photosData = reviewCheck.rows[0].photos;
        existingPhotos = typeof photosData === 'string' ? JSON.parse(photosData) : (photosData || []);
      } catch (e) {
        console.error('Error parsing existing photos:', e);
      }

      // Remove the specified photo
      const updatedPhotos = existingPhotos.filter(photo => photo !== photoUrl);

      // Update review
      await pool.query(
        'UPDATE reviews SET photos = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(updatedPhotos), reviewId]
      );

      res.json({ 
        success: true, 
        photos: updatedPhotos,
        message: 'Photo removed successfully'
      });

    } catch (err) {
      logger.error('Delete photo from review error', { error: err.message, stack: err.stack });
      console.error('Delete photo from review error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Get completed bookings without reviews (for review prompt on login)
  router.get('/pending-reviews', requireAuth, clientOnly, async (req, res) => {
    try {
      const clientId = req.session.user.id;

      const result = await pool.query(`
        SELECT
          b.id as booking_id,
          b.booking_date,
          b.completed_at,
          w.id as worker_id,
          w.name as worker_name,
          w.speciality as worker_service
        FROM bookings b
        JOIN workers w ON b.worker_id = w.id
        LEFT JOIN reviews r ON r.booking_id = b.id
        WHERE b.user_id = $1
          AND b.status = 'Completed'
          AND r.id IS NULL
        ORDER BY b.completed_at DESC
        LIMIT 5
      `, [clientId]);

      res.json({
        success: true,
        pendingReviews: result.rows
      });
    } catch (err) {
      logger.error('Failed to fetch pending reviews', { error: err.message });
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Upload review photo
  router.post('/upload-photo', requireAuth, clientOnly, uploadLimiter, reviewPhotoUpload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      logger.info('Review photo uploaded', {
        userId: req.session.user.id,
        filename: req.file.filename,
        size: req.file.size
      });

      res.json({
        success: true,
        photo: {
          url: req.file.path,
          thumbnail_url: req.file.path, // Cloudinary handles thumbnails via transformations
          cloudinary_id: req.file.filename
        }
      });
    } catch (error) {
      logger.error('Upload review photo error', { error: error.message });
      console.error('Upload review photo error:', error);

      // Clean up uploaded file if there's an error
      if (req.file && req.file.filename) {
        try {
          await cloudinary.uploader.destroy(req.file.filename);
        } catch (cleanupError) {
          logger.error('Cloudinary cleanup error', { error: cleanupError.message });
        }
      }

      res.status(500).json({ success: false, error: 'Failed to upload photo' });
    }
  });

  return router;
};