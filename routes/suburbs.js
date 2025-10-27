const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const logger = require('../config/logger');

// GET /suburbs - Get all suburbs (optionally filtered by province)
router.get('/', async (req, res) => {
  try {
    const { province } = req.query;

    let query = `
      SELECT id, name, province, worker_count
      FROM suburbs
      WHERE is_active = true
        AND worker_count > 0
    `;
    const params = [];

    if (province) {
      query += ` AND LOWER(province) = LOWER($1)`;
      params.push(province);
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      suburbs: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch suburbs', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suburbs'
    });
  }
});

// GET /suburbs/provinces - Get list of provinces with available workers
router.get('/provinces', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT province, COUNT(*) as suburb_count
      FROM suburbs
      WHERE is_active = true
        AND worker_count > 0
      GROUP BY province
      ORDER BY province ASC
    `);

    res.json({
      success: true,
      provinces: result.rows
    });
  } catch (error) {
    logger.error('Failed to fetch provinces', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch provinces'
    });
  }
});

// POST /suburbs/add - Add or update suburb (used during worker approval)
router.post('/add', async (req, res) => {
  try {
    const { name, province } = req.body;

    if (!name || !province) {
      return res.status(400).json({
        success: false,
        message: 'Name and province are required'
      });
    }

    // Capitalize properly
    const capitalizedName = name.trim().split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    const capitalizedProvince = province.trim().split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');

    const result = await pool.query(`
      INSERT INTO suburbs (name, province, worker_count)
      VALUES ($1, $2, 0)
      ON CONFLICT (name, province)
      DO UPDATE SET updated_at = NOW()
      RETURNING id, name, province
    `, [capitalizedName, capitalizedProvince]);

    logger.info('Suburb added/updated', {
      suburb: capitalizedName,
      province: capitalizedProvince
    });

    res.json({
      success: true,
      suburb: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to add suburb', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to add suburb'
    });
  }
});

// GET /suburbs/stats - Get suburb statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_suburbs,
        COUNT(DISTINCT province) as total_provinces,
        SUM(worker_count) as total_workers,
        AVG(worker_count) as avg_workers_per_suburb
      FROM suburbs
      WHERE is_active = true
    `);

    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch suburb stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

module.exports = router;
