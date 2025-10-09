-- ==================== DROP EXISTING TABLES ====================
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==================== USERS TABLE ====================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  profile_pic VARCHAR(500),
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  privacy_preferences JSONB DEFAULT '{"show_profile": true, "show_reviews": true}'::jsonb,
  email_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- ==================== WORKERS TABLE ====================
CREATE TABLE workers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  speciality VARCHAR(100) NOT NULL,
  area VARCHAR(255),
  bio TEXT,
  experience VARCHAR(50),
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  image VARCHAR(500),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  profile_pic VARCHAR(500),
  availability_schedule VARCHAR(20) DEFAULT 'both' CHECK (availability_schedule IN ('weekdays', 'weekends', 'both')),
  is_available BOOLEAN DEFAULT true,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  service_radius INTEGER DEFAULT 50 CHECK (service_radius > 0 AND service_radius <= 200),
  is_verified BOOLEAN DEFAULT false,
  verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verification_documents JSONB,
  verified_at TIMESTAMP,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  privacy_preferences JSONB DEFAULT '{"show_profile": true, "show_location": true}'::jsonb,
  email_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expiry TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_workers_email ON workers(email);
CREATE INDEX idx_workers_speciality ON workers(speciality);
CREATE INDEX idx_workers_available ON workers(is_available) WHERE is_available = true;

-- ==================== BOOKINGS TABLE ====================
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  booking_amount DECIMAL(10,2) CHECK (booking_amount >= 0),
  note TEXT,
  status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending','Confirmed','In Progress','Completed','Cancelled','Rescheduled')),
  has_review BOOLEAN DEFAULT false,
  professional_response TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(20) CHECK (cancelled_by IN ('client', 'worker', 'admin') OR cancelled_by IS NULL),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  CONSTRAINT unique_worker_booking UNIQUE (worker_id, booking_date, booking_time)
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_worker ON bookings(worker_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ==================== MESSAGES TABLE ====================
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  professional_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'professional')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_client ON messages(client_id);
CREATE INDEX idx_messages_professional ON messages(professional_id);

-- ==================== REVIEWS TABLE ====================
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  review_text TEXT CHECK (char_length(review_text) <= 1000),
  photos JSONB DEFAULT '[]'::jsonb,
  professional_response TEXT,
  response_date TIMESTAMP,
  is_flagged BOOLEAN DEFAULT false,
  is_verified_purchase BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_review_per_booking UNIQUE (booking_id, client_id)
);

CREATE INDEX idx_reviews_worker ON reviews(worker_id);
CREATE INDEX idx_reviews_client ON reviews(client_id);

-- ==================== TRIGGERS ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workers_timestamp BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_timestamp BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_timestamp BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_timestamp BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_worker_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workers SET rating = (SELECT ROUND(AVG(overall_rating)::numeric, 2) FROM reviews WHERE worker_id = NEW.worker_id) WHERE id = NEW.worker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_rating_update AFTER INSERT OR UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_worker_rating();

-- ==================== PORTFOLIO PHOTOS TABLE ====================
CREATE TABLE portfolio_photos (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_worker FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX idx_portfolio_worker ON portfolio_photos(worker_id);
CREATE INDEX idx_portfolio_uploaded ON portfolio_photos(uploaded_at DESC);
