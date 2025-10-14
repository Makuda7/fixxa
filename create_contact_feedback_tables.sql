-- Create worker contact messages table
CREATE TABLE IF NOT EXISTS worker_contact_messages (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP
);

-- Create feature suggestions table
CREATE TABLE IF NOT EXISTS feature_suggestions (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  category VARCHAR(100),
  suggestion TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_worker_contact_messages_worker_id ON worker_contact_messages(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_contact_messages_status ON worker_contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_worker_contact_messages_created_at ON worker_contact_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_suggestions_worker_id ON feature_suggestions(worker_id);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_status ON feature_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_created_at ON feature_suggestions(created_at DESC);
