const express = require('express');
const router = express.Router();

module.exports = (pool, logger) => {
  
  // Search workers with filters
  router.get('/search/workers', async (req, res) => {
    try {
      const {
        speciality,
        suburb,
        province,
        area, // Legacy parameter
        minRating,
        available,
        sortBy = 'rating',
        limit = 20,
        offset = 0
      } = req.query;

      let query = `
        SELECT
          w.id, w.name, w.speciality,
          w.primary_suburb, w.province, w.area,
          w.bio, w.profile_picture, w.is_available, w.id_verified, w.approval_status,
          COALESCE(AVG(r.overall_rating), 0) as avg_rating,
          COUNT(DISTINCT r.id) as review_count,
          COUNT(DISTINCT b.id) as completed_jobs,
          STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) as specialties,
          COUNT(DISTINCT CASE WHEN c.status = 'approved' AND c.document_type = 'certification' THEN c.id END) as approved_cert_count
        FROM workers w
        LEFT JOIN reviews r ON w.id = r.worker_id
        LEFT JOIN bookings b ON w.id = b.worker_id AND b.status = 'Completed'
        LEFT JOIN worker_specialties ws ON w.id = ws.worker_id
        LEFT JOIN specialties s ON ws.specialty_id = s.id
        LEFT JOIN certifications c ON w.id = c.worker_id
        WHERE w.is_active = true AND w.approval_status = 'approved'
      `;

      const params = [];
      let paramCount = 1;

      // Filter by speciality (search in new specialties system OR legacy speciality field)
      if (speciality) {
        query += ` AND (
          EXISTS (
            SELECT 1 FROM worker_specialties ws2
            JOIN specialties s2 ON ws2.specialty_id = s2.id
            WHERE ws2.worker_id = w.id
            AND LOWER(s2.name) LIKE LOWER($${paramCount})
          )
          OR LOWER(w.speciality) LIKE LOWER($${paramCount})
        )`;
        params.push(`%${speciality}%`);
        paramCount++;
      }

      // Filter by suburb (PRIMARY search - locals first!)
      if (suburb) {
        query += ` AND LOWER(w.primary_suburb) = LOWER($${paramCount})`;
        params.push(suburb);
        paramCount++;
      }
      // Fallback: Filter by province if no suburb specified
      else if (province) {
        query += ` AND LOWER(w.province) = LOWER($${paramCount})`;
        params.push(province);
        paramCount++;
      }
      // Legacy: Filter by old area field
      else if (area) {
        query += ` AND (LOWER(w.area) LIKE LOWER($${paramCount}) OR LOWER(w.province) LIKE LOWER($${paramCount}))`;
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

      const workers = result.rows;

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT w.id) as total
        FROM workers w
        LEFT JOIN reviews r ON w.id = r.worker_id
        WHERE w.is_active = true AND w.approval_status = 'approved'
      `;

      const countParams = [];
      let countParamCount = 1;

      if (speciality) {
        countQuery += ` AND LOWER(w.speciality) LIKE LOWER($${countParamCount})`;
        countParams.push(`%${speciality}%`);
        countParamCount++;
      }

      if (suburb) {
        countQuery += ` AND LOWER(w.primary_suburb) = LOWER($${countParamCount})`;
        countParams.push(suburb);
        countParamCount++;
      } else if (province) {
        countQuery += ` AND LOWER(w.province) = LOWER($${countParamCount})`;
        countParams.push(province);
        countParamCount++;
      } else if (area) {
        countQuery += ` AND (LOWER(w.area) LIKE LOWER($${countParamCount}) OR LOWER(w.province) LIKE LOWER($${countParamCount}))`;
        countParams.push(`%${area}%`);
        countParamCount++;
      }

      if (available === 'true') {
        countQuery += ` AND w.is_available = true`;
      }

      if (minRating) {
        // Build location filter for subquery
        let locationFilter = '';
        if (suburb) {
          locationFilter = `AND LOWER(w.primary_suburb) = LOWER($${countParams.length > 0 ? countParams.length + 1 : 1})`;
        } else if (province) {
          locationFilter = `AND LOWER(w.province) = LOWER($${countParams.length > 0 ? countParams.length + 1 : 1})`;
        } else if (area) {
          locationFilter = `AND (LOWER(w.area) LIKE LOWER($${countParams.length > 0 ? countParams.length + 1 : 1}) OR LOWER(w.province) LIKE LOWER($${countParams.length > 0 ? countParams.length + 1 : 1}))`;
        }

        countQuery = `
          SELECT COUNT(*) as total FROM (
            SELECT w.id
            FROM workers w
            LEFT JOIN reviews r ON w.id = r.worker_id
            WHERE w.is_active = true AND w.approval_status = 'approved'
            ${speciality ? `AND LOWER(w.speciality) LIKE LOWER($1)` : ''}
            ${locationFilter}
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
        workers: workers,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + workers.length) < total
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

  // Get all active specialties (public endpoint for dropdown)
  router.get('/api/specialties', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT id, name, icon, description, display_order
        FROM specialties
        WHERE is_active = true
        ORDER BY display_order ASC, name ASC
      `);

      res.json({
        success: true,
        specialties: result.rows
      });
    } catch (error) {
      logger.error('Failed to fetch specialties', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch specialties' });
    }
  });

  return router;
};