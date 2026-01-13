-- Migration tracking table
-- This table keeps track of which migrations have been run
-- to prevent re-running them on every server restart

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON schema_migrations(migration_name);
CREATE INDEX IF NOT EXISTS idx_migrations_executed_at ON schema_migrations(executed_at);

-- Insert this migration itself
INSERT INTO schema_migrations (migration_name, execution_time_ms, success)
VALUES ('000_create_migrations_table', 0, true)
ON CONFLICT (migration_name) DO NOTHING;
