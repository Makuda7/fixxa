-- Migration: Create booking_requests table

CREATE TABLE IF NOT EXISTS booking_requests (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    worker_id INTEGER REFERENCES workers(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    new_date DATE,
    new_time TIME,
    reason TEXT,
    completion_notes TEXT,
    photos JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    CONSTRAINT valid_request_type CHECK (request_type IN ('reschedule', 'cancellation', 'completion')),
    CONSTRAINT valid_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_booking ON booking_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_user ON booking_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_worker ON booking_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON booking_requests(status);
CREATE INDEX IF NOT EXISTS idx_booking_requests_type ON booking_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_booking_requests_created_at ON booking_requests(created_at);
