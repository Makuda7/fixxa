async function addReviewPhotos(pool, logger) {
  try {
    console.log('🔄 Creating review_photos table...');

    // Create review_photos table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_photos (
        id SERIAL PRIMARY KEY,
        review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        cloudinary_id TEXT NOT NULL,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on review_id for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_photos_review_id
      ON review_photos(review_id)
    `);

    // Create index on display_order for sorting
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_photos_display_order
      ON review_photos(review_id, display_order)
    `);

    console.log('✅ Review photos table created successfully');
  } catch (error) {
    console.log('⚠️  Migration skipped or already applied:', error.message);
  }
}

module.exports = { addReviewPhotos };
