const express = require('express');
const router = express.Router();

module.exports = (pool, logger) => {
  
  // Search workers with filters
  router.get('/search/workers', async (req, res) => {
    try {
      const { 
        speciality, 
        area, 
        minRating, 
        available, 
        sortBy = 'rating',
        limit = 20,
        offset = 0 
      } = req.query;

      let query = `
        SELECT
          w.id, w.name, w.speciality, w.area, w.bio,
          w.profile_pic, w.is_available,
          COALESCE(AVG(r.overall_rating), 0) as avg_rating,
          COUNT(DISTINCT r.id) as review_count,
          COUNT(DISTINCT b.id) as completed_jobs
        FROM workers w
        LEFT JOIN reviews r ON w.id = r.worker_id
        LEFT JOIN bookings b ON w.id = b.worker_id AND b.status = 'Completed'
        WHERE w.is_active = true
      `;

      const params = [];
      let paramCount = 1;

      // Filter by speciality
      if (speciality) {
        query += ` AND LOWER(w.speciality) LIKE LOWER($${paramCount})`;
        params.push(`%${speciality}%`);
        paramCount++;
      }

      // Filter by area
      if (area) {
        query += ` AND LOWER(w.area) LIKE LOWER($${paramCount})`;
        params.push(`%${area}%`);
        paramCount++;
      }

      // Filter by availability
      if (available === 'true') {
        query += ` AND w.is_available = true`;
      }

      query += ` GROUP BY w.id`;

      // Filter by minimum rating (after aggregation)
      if (minRating) {
        query += ` HAVING COALESCE(AVG(r.overall_rating), 0) >= $${paramCount}`;
        params.push(parseFloat(minRating));
        paramCount++;
      }

      // Sorting
      switch (sortBy) {
        case 'rating':
          query += ` ORDER BY avg_rating DESC, review_count DESC`;
          break;
        case 'price_low':
        case 'price_high':
          // Price sorting disabled - hourly_rate column doesn't exist
          // Default to rating sort instead
          query += ` ORDER BY avg_rating DESC, review_count DESC`;
          break;
        case 'reviews':
          query += ` ORDER BY review_count DESC, avg_rating DESC`;
          break;
        case 'recent':
          query += ` ORDER BY w.created_at DESC`;
          break;
        default:
          query += ` ORDER BY avg_rating DESC`;
      }

      // Pagination
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(parseInt(limit), parseInt(offset));

      const result = await pool.query(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT w.id) as total
        FROM workers w
        LEFT JOIN reviews r ON w.id = r.worker_id
        WHERE w.is_active = true
      `;
      
      const countParams = [];
      let countParamCount = 1;

      if (speciality) {
        countQuery += ` AND LOWER(w.speciality) LIKE LOWER($${countParamCount})`;
        countParams.push(`%${speciality}%`);
        countParamCount++;
      }

      if (area) {
        countQuery += ` AND LOWER(w.area) LIKE LOWER($${countParamCount})`;
        countParams.push(`%${area}%`);
        countParamCount++;
      }

      if (available === 'true') {
        countQuery += ` AND w.is_available = true`;
      }

      if (minRating) {
        countQuery = `
          SELECT COUNT(*) as total FROM (
            SELECT w.id
            FROM workers w
            LEFT JOIN reviews r ON w.id = r.worker_id
            WHERE w.is_active = true
            ${speciality ? `AND LOWER(w.speciality) LIKE LOWER($1)` : ''}
            ${area ? `AND LOWER(w.area) LIKE LOWER($${countParams.length + 1})` : ''}
            ${available === 'true' ? 'AND w.is_available = true' : ''}
            GROUP BY w.id
            HAVING COALESCE(AVG(r.overall_rating), 0) >= $${countParams.length + 1}
          ) as filtered
        `;
        countParams.push(parseFloat(minRating));
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        workers: result.rows,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + result.rows.length) < total
        }
      });

    } catch (error) {
      logger.error('Worker search failed', { error: error.message });
      console.error('Worker search error:', error);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  });

  // Get unique specialities for filter dropdown
  router.get('/search/specialities', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT speciality 
        FROM workers 
        WHERE is_active = true AND speciality IS NOT NULL
        ORDER BY speciality
      `);
      
      res.json({ 
        success: true, 
        specialities: result.rows.map(r => r.speciality) 
      });
    } catch (error) {
      logger.error('Failed to fetch specialities', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch specialities' });
    }
  });

  // Get unique areas for filter dropdown
  router.get('/search/areas', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT area 
        FROM workers 
        WHERE is_active = true AND area IS NOT NULL
        ORDER BY area
      `);
      
      res.json({ 
        success: true, 
        areas: result.rows.map(r => r.area) 
      });
    } catch (error) {
      logger.error('Failed to fetch areas', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch areas' });
    }
  });

  return router;
};