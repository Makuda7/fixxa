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
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);

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

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  const handleReschedule = () => {
    handleCloseModal();
    window.location.href = '/client-dashboard';
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      handleCloseModal();
      window.location.href = '/client-dashboard';
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
          {bookings.map((booking) => {
            // Inline border color as backup for cache issues
            const getBorderColor = (status) => {
              if (!status) return 'transparent';
              switch(status.toLowerCase()) {
                case 'pending': return '#fbbf24';
                case 'confirmed': return '#3b82f6';
                case 'completed': return '#10b981';
                case 'cancelled': return '#ef4444';
                case 'declined': return '#ef4444';
                case 'in_progress': return '#3b82f6';
                case 'in progress': return '#3b82f6';
                default: return 'transparent';
              }
            };

            return (
            <div
              key={booking.id}
              className={`fixxa-booking-card-v2 booking-${booking.status}`}
              style={{ borderLeft: `6px solid ${getBorderColor(booking.status)}` }}
            >
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
                  onClick={() => handleViewDetails(booking)}
                >
                  View Details
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Booking Details Modal */}
      {showModal && selectedBooking && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Booking Details</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="modal-status">
                <span className={`status-badge ${getStatusBadgeClass(selectedBooking.status)}`}>
                  {selectedBooking.status?.replace('_', ' ')}
                </span>
              </div>

              <div className="modal-details">
                <div className="modal-detail-row">
                  <span className="modal-label">Service:</span>
                  <span className="modal-value">{selectedBooking.service_type || 'Service Booking'}</span>
                </div>
                <div className="modal-detail-row">
                  <span className="modal-label">Professional:</span>
                  <span className="modal-value">{selectedBooking.worker_name}</span>
                </div>
                <div className="modal-detail-row">
                  <span className="modal-label">Date:</span>
                  <span className="modal-value">{formatDate(selectedBooking.booking_date)}</span>
                </div>
                <div className="modal-detail-row">
                  <span className="modal-label">Time:</span>
                  <span className="modal-value">{formatTime(selectedBooking.booking_time)}</span>
                </div>
                {selectedBooking.booking_amount && (
                  <div className="modal-detail-row">
                    <span className="modal-label">Amount:</span>
                    <span className="modal-value">R {selectedBooking.booking_amount}</span>
                  </div>
                )}
                {selectedBooking.description && (
                  <div className="modal-detail-row description">
                    <span className="modal-label">Description:</span>
                    <span className="modal-value">{selectedBooking.description}</span>
                  </div>
                )}
                <div className="modal-detail-row">
                  <span className="modal-label">Booking ID:</span>
                  <span className="modal-value">{selectedBooking.id}</span>
                </div>
                <div className="modal-detail-row">
                  <span className="modal-label">Created:</span>
                  <span className="modal-value">{formatDate(selectedBooking.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {(selectedBooking.status?.toLowerCase() === 'pending' || selectedBooking.status?.toLowerCase() === 'confirmed') && (
                <>
                  <button className="btn-warning" onClick={handleReschedule}>
                    Reschedule
                  </button>
                  <button className="btn-danger" onClick={handleCancel}>
                    Cancel Booking
                  </button>
                </>
              )}
              {selectedBooking.status?.toLowerCase() === 'completed' && (
                <button className="btn-warning" onClick={handleReschedule}>
                  Book Again
                </button>
              )}
              <button className="btn-secondary" onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobHistory;
