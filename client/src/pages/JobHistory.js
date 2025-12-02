import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './JobHistory.css';

const JobHistory = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings', {
        withCredentials: true
      });
      // Ensure bookings is always an array
      const bookingsData = response.data;
      if (Array.isArray(bookingsData)) {
        setBookings(bookingsData);
      } else if (bookingsData && Array.isArray(bookingsData.bookings)) {
        setBookings(bookingsData.bookings);
      } else {
        console.warn('Unexpected bookings data format:', bookingsData);
        setBookings([]);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load job history');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'confirmed':
        return 'status-confirmed';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="job-history-page">
        <div className="page-header">
          <div className="page-header-content">
            <Link to="/client-dashboard" className="back-link">
              <span>←</span> Back to Dashboard
            </Link>
            <h1>Job History</h1>
          </div>
        </div>
        <div className="page-content">
          <div className="loading-container">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="job-history-page">
      <div className="page-header">
        <div className="page-header-content">
          <Link to="/client-dashboard" className="back-link">
            <span>←</span> Back to Dashboard
          </Link>
          <h1>Job History</h1>
          <p className="page-subtitle">View all your past and current bookings</p>
        </div>
      </div>

      <div className="page-content">
        {error && (
          <div className="error-message">{error}</div>
        )}

        {!Array.isArray(bookings) || bookings.length === 0 ? (
          <div className="empty-state">
            <p>No job history yet.</p>
            <Link to="/service" className="btn-primary">
              Find a Professional
            </Link>
          </div>
        ) : (
          <div className="bookings-grid">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card">
              <div className="booking-header">
                <div className="booking-title">
                  <h4>{booking.service_type || 'Service Booking'}</h4>
                  <p className="worker-name">with {booking.worker_name}</p>
                </div>
                <span className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                  {booking.status?.replace('_', ' ')}
                </span>
              </div>

              <div className="booking-details">
                <div className="detail-row">
                  <span className="label">📅 Date:</span>
                  <span className="value">{formatDate(booking.booking_date)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">🕐 Time:</span>
                  <span className="value">{formatTime(booking.booking_time)}</span>
                </div>
                {booking.booking_amount && (
                  <div className="detail-row">
                    <span className="label">💰 Amount:</span>
                    <span className="value">R {booking.booking_amount}</span>
                  </div>
                )}
                {booking.description && (
                  <div className="detail-row description">
                    <span className="label">📝 Description:</span>
                    <span className="value">{booking.description}</span>
                  </div>
                )}
              </div>

              <div className="booking-footer">
                <span className="booking-id">ID: {booking.id}</span>
                <span className="booking-created">
                  Created {formatDate(booking.created_at)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="booking-actions">
                <button
                  className="btn-secondary"
                  onClick={() => window.location.href = `/booking/${booking.id}`}
                >
                  View Details
                </button>
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <>
                    <button
                      className="btn-warning"
                      onClick={() => {
                        // Navigate back to dashboard to handle reschedule
                        window.location.href = '/client-dashboard';
                      }}
                    >
                      Reschedule
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this booking?')) {
                          // Navigate back to dashboard to handle cancellation
                          window.location.href = '/client-dashboard';
                        }
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default JobHistory;
