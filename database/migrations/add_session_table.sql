-- Migration: Add session table for connect-pg-simple
-- Date: 2025-10-09

-- Create session table for PostgreSQL session store
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
) WITH (OIDS=FALSE);

-- Add index on expire column for automatic cleanup
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Grant permissions (if using specific database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON session TO fixxa_user;
