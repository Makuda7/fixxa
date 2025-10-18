const express = require('express');
const router = express.Router();
const { uploadLimiter, reviewLimiter } = require('../middleware/rateLimiter');

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

      // Cloudinary URL is in req.file.path
      const fileUrl = req.file.path;
      const cloudinaryId = req.file.filename;

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

      // Verify review belongs to this client and get existing photos
      let reviewCheck;
      let existingPhotos = [];

      try {
        // Try to select with photos column
        reviewCheck = await pool.query(
          'SELECT photos FROM reviews WHERE id = $1 AND client_id = $2',
          [reviewId, clientId]
        );

        if (reviewCheck.rows.length === 0) {
          return res.status(403).json({ success: false, error: 'Review not found or unauthorized' });
        }

        // Parse existing photos
        try {
          const photosData = reviewCheck.rows[0].photos;
          existingPhotos = typeof photosData === 'string' ? JSON.parse(photosData) : (photosData || []);
        } catch (e) {
          console.error('Error parsing existing photos:', e);
        }
      } catch (dbError) {
        if (dbError.code === '42703') { // photos column doesn't exist
          // Fall back to checking without photos column
          reviewCheck = await pool.query(
            'SELECT id FROM reviews WHERE id = $1 AND client_id = $2',
            [reviewId, clientId]
          );

          if (reviewCheck.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'Review not found or unauthorized' });
          }

          // No existing photos since column doesn't exist
          existingPhotos = [];
        } else {
          throw dbError;
        }
      }

      // Add new photo (Cloudinary URL)
      const fileUrl = req.file.path;
      existingPhotos.push(fileUrl);

      // Update review with new photos array
      // Try with updated_at, fall back without if column doesn't exist
      try {
        await pool.query(
          'UPDATE reviews SET photos = $1, updated_at = NOW() WHERE id = $2',
          [JSON.stringify(existingPhotos), reviewId]
        );
      } catch (dbError) {
        if (dbError.code === '42703') { // Column doesn't exist
          await pool.query(
            'UPDATE reviews SET photos = $1 WHERE id = $2',
            [JSON.stringify(existingPhotos), reviewId]
          );
        } else {
          throw dbError;
        }
      }

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
          review_text || '',
          JSON.stringify(photos || [])
        ]);

        await client.query(`
          UPDATE bookings SET has_review = true WHERE id = $1
        `, [booking_id]);

        await client.query('COMMIT');

        logger.info('Review submitted successfully', { reviewId: result.rows[0].id, bookingId: booking_id });
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

  return router;
};