// Worker Specialties Migration - Multi-category support
const { Pool } = require('pg');

async function runWorkerSpecialtiesMigration(pool, logger) {
  try {
    console.log('🔄 Running worker specialties migration...');

    // Create specialties table (categories that can be added/managed by admin)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS specialties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ Created specialties table');

    // Create worker_specialties junction table (many-to-many)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_specialties (
        id SERIAL PRIMARY KEY,
        worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
        specialty_id INTEGER REFERENCES specialties(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(worker_id, specialty_id)
      )
    `);
    console.log('  ✓ Created worker_specialties junction table');

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_worker_specialties_worker_id
      ON worker_specialties(worker_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_worker_specialties_specialty_id
      ON worker_specialties(specialty_id)
    `);
    console.log('  ✓ Created indexes on worker_specialties');

    // Insert default specialties from existing data
    const defaultSpecialties = [
      { name: 'Plumber', icon: '🔧', description: 'Plumbing services including repairs, installations, and maintenance' },
      { name: 'Electrician', icon: '⚡', description: 'Electrical installations, repairs, and certifications' },
      { name: 'Painter', icon: '🎨', description: 'Interior and exterior painting services' },
      { name: 'Gardener', icon: '🌱', description: 'Garden maintenance, landscaping, and lawn care' },
      { name: 'Handyman', icon: '🔨', description: 'General repairs and maintenance services' },
      { name: 'Tree Feller', icon: '🌳', description: 'Tree felling, trimming, and removal services' },
      { name: 'Tiler', icon: '🧱', description: 'Tile installation and repairs' },
      { name: 'Builder', icon: '🏗️', description: 'Construction and building services' },
      { name: 'Carpenter', icon: '🪚', description: 'Woodworking and carpentry services' },
      { name: 'Roofer', icon: '🏠', description: 'Roof repairs and installations' }
    ];

    for (const specialty of defaultSpecialties) {
      await pool.query(`
        INSERT INTO specialties (name, icon, description, display_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO NOTHING
      `, [specialty.name, specialty.icon, specialty.description, defaultSpecialties.indexOf(specialty)]);
    }
    console.log('  ✓ Inserted default specialties');

    // Migrate existing workers' specialties to the new system
    const existingWorkers = await pool.query(`
      SELECT id, speciality
      FROM workers
      WHERE speciality IS NOT NULL AND speciality != ''
    `);

    for (const worker of existingWorkers.rows) {
      // Try to match their existing specialty to one in the specialties table
      const specialtyMatch = await pool.query(`
        SELECT id FROM specialties
        WHERE LOWER(name) = LOWER($1)
      `, [worker.speciality.trim()]);

      if (specialtyMatch.rows.length > 0) {
        // Link worker to specialty
        await pool.query(`
          INSERT INTO worker_specialties (worker_id, specialty_id)
          VALUES ($1, $2)
          ON CONFLICT (worker_id, specialty_id) DO NOTHING
        `, [worker.id, specialtyMatch.rows[0].id]);
      } else {
        // Create new specialty for this worker if it doesn't exist
        const newSpecialty = await pool.query(`
          INSERT INTO specialties (name, is_active, display_order)
          VALUES ($1, true, 100)
          ON CONFLICT (name) DO NOTHING
          RETURNING id
        `, [worker.speciality.trim()]);

        if (newSpecialty.rows.length > 0) {
          await pool.query(`
            INSERT INTO worker_specialties (worker_id, specialty_id)
            VALUES ($1, $2)
            ON CONFLICT (worker_id, specialty_id) DO NOTHING
          `, [worker.id, newSpecialty.rows[0].id]);
        }
      }
    }
    console.log(`  ✓ Migrated ${existingWorkers.rows.length} workers to new specialty system`);

    console.log('✅ Worker specialties migration completed');
  } catch (error) {
    console.log('⚠️  Worker specialties migration skipped:', error.message);
  }
}

module.exports = { runWorkerSpecialtiesMigration };
