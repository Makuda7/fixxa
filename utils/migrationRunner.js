// Migration Runner with Tracking
// Prevents re-running migrations that have already been executed

const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor(pool, logger) {
    this.pool = pool;
    this.logger = logger;
  }

  /**
   * Ensure the migrations tracking table exists
   */
  async ensureMigrationsTable() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time_ms INTEGER,
          success BOOLEAN DEFAULT true
        );

        CREATE INDEX IF NOT EXISTS idx_migrations_name ON schema_migrations(migration_name);
        CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON schema_migrations(executed_at);
      `);
    } catch (error) {
      this.logger.error('Failed to create migrations table:', error);
      throw error;
    }
  }

  /**
   * Check if a migration has already been run
   */
  async hasRun(migrationName) {
    try {
      const result = await this.pool.query(
        'SELECT 1 FROM schema_migrations WHERE migration_name = $1 AND success = true',
        [migrationName]
      );
      return result.rows.length > 0;
    } catch (error) {
      // If table doesn't exist yet, migration hasn't run
      if (error.code === '42P01') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Mark a migration as completed
   */
  async markAsRun(migrationName, executionTimeMs, success = true) {
    try {
      await this.pool.query(
        `INSERT INTO schema_migrations (migration_name, execution_time_ms, success)
         VALUES ($1, $2, $3)
         ON CONFLICT (migration_name)
         DO UPDATE SET executed_at = CURRENT_TIMESTAMP, execution_time_ms = $2, success = $3`,
        [migrationName, executionTimeMs, success]
      );
    } catch (error) {
      this.logger.error(`Failed to mark migration ${migrationName} as run:`, error);
    }
  }

  /**
   * Run a migration function with tracking
   */
  async run(migrationName, migrationFunction) {
    // Ensure migrations table exists
    await this.ensureMigrationsTable();

    // Check if already run
    if (await this.hasRun(migrationName)) {
      this.logger.info(`⏭️  Skipping ${migrationName} (already run)`);
      return;
    }

    this.logger.info(`▶️  Running ${migrationName}...`);
    const startTime = Date.now();

    try {
      await migrationFunction(this.pool, this.logger);
      const executionTime = Date.now() - startTime;
      await this.markAsRun(migrationName, executionTime, true);
      this.logger.info(`✅ ${migrationName} completed in ${executionTime}ms`);
    } catch (error) {
      const executionTime = Date.now() - startTime;
      await this.markAsRun(migrationName, executionTime, false);
      this.logger.error(`❌ ${migrationName} failed:`, error);
      throw error;
    }
  }

  /**
   * Get list of all executed migrations
   */
  async getExecutedMigrations() {
    try {
      const result = await this.pool.query(
        'SELECT migration_name, executed_at, execution_time_ms, success FROM schema_migrations ORDER BY executed_at'
      );
      return result.rows;
    } catch (error) {
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    }
  }
}

module.exports = MigrationRunner;
