async function addPortfolioPhotos(pool, logger) {
  try {
    console.log('🔄 Creating portfolio_photos table...');

    // Create portfolio_photos table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portfolio_photos (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        cloudinary_id TEXT NOT NULL,
        caption TEXT,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on worker_id for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_photos_worker_id
      ON portfolio_photos(worker_id)
    `);

    // Create index on display_order for sorting
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_photos_display_order
      ON portfolio_photos(worker_id, display_order)
    `);

    console.log('✅ Portfolio photos table created successfully');
  } catch (error) {
    console.log('⚠️  Migration skipped or already applied:', error.message);
  }
}

module.exports = { addPortfolioPhotos };
