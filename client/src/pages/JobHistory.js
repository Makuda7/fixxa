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

  // Reschedule modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Submitting state
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Quote management state
  const [quotes, setQuotes] = useState({});

  // Service address state
  const [serviceAddresses, setServiceAddresses] = useState({});
  const [addressInput, setAddressInput] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(null); // booking ID

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
      let bookingsArray = [];

      if (Array.isArray(bookingsData)) {
        bookingsArray = bookingsData;
      } else if (bookingsData && Array.isArray(bookingsData.bookings)) {
        bookingsArray = bookingsData.bookings;
      } else {
        console.warn('Unexpected bookings data format:', bookingsData);
        bookingsArray = [];
      }

      setBookings(bookingsArray);

      // Fetch quotes for all bookings
      await fetchQuotesForBookings(bookingsArray);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load job history');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotesForBookings = async (bookingsArray) => {
    const quotesData = {};

    for (const booking of bookingsArray) {
      try {
        const response = await api.get(`/quotes/booking/${booking.id}`, {
          withCredentials: true
        });

        if (response.data.success && response.data.quote) {
          quotesData[booking.id] = response.data.quote;
        }
      } catch (err) {
        console.error(`Error fetching quote for booking ${booking.id}:`, err);
        // Continue with other bookings even if one fails
      }
    }

    setQuotes(quotesData);
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  const handleCloseAllModals = () => {
    setShowModal(false);
    setShowRescheduleModal(false);
    setShowCancelModal(false);
    setSelectedBooking(null);
    setCancelReason('');
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleReason('');
  };

  const handleOpenRescheduleModal = (booking) => {
    setShowModal(false);
    setSelectedBooking(booking);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleReason('');
    setShowRescheduleModal(true);
  };

  const handleRescheduleBooking = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      showToast('Please select a date and time', 'error');
      return;
    }

    if (!rescheduleReason.trim()) {
      showToast('Please provide a reason for rescheduling', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/bookings/${selectedBooking.id}/reschedule`, {
        newDate: rescheduleDate,
        newTime: rescheduleTime,
        reason: rescheduleReason
      });

      showToast('Reschedule request submitted successfully!', 'success');
      handleCloseAllModals();
      fetchBookings();
    } catch (err) {
      console.error('Error rescheduling booking:', err);
      showToast(err.response?.data?.error || 'Failed to reschedule booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCancelModal = (booking) => {
    setShowModal(false);
    setSelectedBooking(booking);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      showToast('Please provide a cancellation reason', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/bookings/${selectedBooking.id}/cancel`, {
        cancelReason
      });

      showToast('Booking cancelled successfully', 'success');
      handleCloseAllModals();
      fetchBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      showToast(err.response?.data?.error || 'Failed to cancel booking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptQuote = async (quoteId, bookingId) => {
    if (!window.confirm('Accept this quote? The job will be confirmed.')) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post(`/quotes/${quoteId}/accept`, {}, {
        withCredentials: true
      });

      if (response.data.success) {
        showToast('Quote accepted! Booking confirmed.', 'success');
        await fetchBookings();
      } else {
        showToast(response.data.error || 'Failed to accept quote', 'error');
      }
    } catch (err) {
      console.error('Error accepting quote:', err);
      showToast(err.response?.data?.error || 'Failed to accept quote', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectQuote = async (quoteId, bookingId) => {
    const reason = window.prompt('Please provide a reason for declining this quote (optional):');

    // User clicked cancel
    if (reason === null) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post(`/quotes/${quoteId}/reject`, {
        reason: reason || 'No reason provided'
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        showToast('Quote declined', 'success');
        await fetchBookings();
      } else {
        showToast(response.data.error || 'Failed to decline quote', 'error');
      }
    } catch (err) {
      console.error('Error rejecting quote:', err);
      showToast(err.response?.data?.error || 'Failed to decline quote', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitServiceAddress = async (bookingId) => {
    // Validate address
    const trimmedAddress = addressInput.trim();

    if (trimmedAddress.length < 10) {
      showToast('Please provide a complete address (minimum 10 characters)', 'error');
      return;
    }

    // Check if address contains basic components
    if (!trimmedAddress.match(/\d/) || trimmedAddress.split(' ').length < 3) {
      showToast('Please include street number, street name, suburb, and city', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post(`/bookings/${bookingId}/service-address`, {
        service_address: trimmedAddress
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        showToast('Service address submitted successfully!', 'success');

        // Update local state
        setServiceAddresses(prev => ({
          ...prev,
          [bookingId]: {
            address: trimmedAddress,
            submitted_at: new Date().toISOString()
          }
        }));

        setShowAddressForm(null);
        setAddressInput('');
        await fetchBookings();
      } else {
        showToast(response.data.error || 'Failed to submit address', 'error');
      }
    } catch (err) {
      console.error('Error submitting service address:', err);
      showToast(err.response?.data?.error || 'Failed to submit address', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAddressForm = (bookingId) => {
    setShowAddressForm(null);
    setAddressInput('');
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

              {/* Quote Display */}
              {quotes[booking.id] && (
                <div style={{
                  background: quotes[booking.id].status === 'pending' ? '#e3f2fd' :
                             quotes[booking.id].status === 'accepted' ? '#d4edda' : '#f8d7da',
                  padding: '1rem',
                  borderRadius: '8px',
                  margin: '1rem 0',
                  borderLeft: `4px solid ${
                    quotes[booking.id].status === 'pending' ? '#2196F3' :
                    quotes[booking.id].status === 'accepted' ? '#28a745' : '#dc3545'
                  }`
                }}>
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    color: quotes[booking.id].status === 'pending' ? '#0d47a1' :
                           quotes[booking.id].status === 'accepted' ? '#155724' : '#721c24',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}>
                    💰 Quote {quotes[booking.id].status === 'accepted' ? 'Accepted' :
                               quotes[booking.id].status === 'rejected' ? 'Declined' : 'Received'}
                  </h4>

                  {quotes[booking.id].line_items && Array.isArray(quotes[booking.id].line_items) && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      {quotes[booking.id].line_items.map((item, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.3rem',
                          fontSize: '0.9rem'
                        }}>
                          <span>{item.description}</span>
                          <span style={{ fontWeight: 600 }}>R {parseFloat(item.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.5rem',
                    marginTop: '0.5rem',
                    borderTop: `2px solid ${
                      quotes[booking.id].status === 'pending' ? '#2196F3' :
                      quotes[booking.id].status === 'accepted' ? '#28a745' : '#dc3545'
                    }`,
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}>
                    <span>Total:</span>
                    <span>R {parseFloat(quotes[booking.id].total_amount).toFixed(2)}</span>
                  </div>

                  {quotes[booking.id].payment_methods && quotes[booking.id].payment_methods.length > 0 && (
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                      <strong>Payment:</strong> {quotes[booking.id].payment_methods.join(', ').toUpperCase()}
                    </p>
                  )}

                  {quotes[booking.id].notes && (
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.85rem',
                      fontStyle: 'italic',
                      opacity: 0.9
                    }}>
                      "{quotes[booking.id].notes}"
                    </p>
                  )}

                  {quotes[booking.id].status === 'pending' && quotes[booking.id].valid_until && (
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
                      Valid until: {formatDate(quotes[booking.id].valid_until)}
                    </p>
                  )}

                  {/* Quote Action Buttons */}
                  {quotes[booking.id].status === 'pending' && (
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginTop: '1rem'
                    }}>
                      <button
                        style={{
                          flex: 1,
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.6 : 1
                        }}
                        onClick={() => handleAcceptQuote(quotes[booking.id].id, booking.id)}
                        disabled={submitting}
                      >
                        ✅ Accept Quote
                      </button>
                      <button
                        style={{
                          flex: 1,
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '0.65rem 1rem',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: submitting ? 'not-allowed' : 'pointer',
                          opacity: submitting ? 0.6 : 1
                        }}
                        onClick={() => handleRejectQuote(quotes[booking.id].id, booking.id)}
                        disabled={submitting}
                      >
                        ❌ Decline Quote
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Service Address Submission */}
              {quotes[booking.id] && quotes[booking.id].status === 'accepted' && !booking.service_address && !serviceAddresses[booking.id] && (
                <div style={{
                  background: '#fff3cd',
                  padding: '1rem',
                  borderRadius: '8px',
                  margin: '1rem 0',
                  borderLeft: '4px solid #ffc107'
                }}>
                  {showAddressForm === booking.id ? (
                    <>
                      <h4 style={{
                        margin: '0 0 0.75rem 0',
                        color: '#856404',
                        fontSize: '1rem',
                        fontWeight: 600
                      }}>
                        📍 Provide Service Address
                      </h4>
                      <p style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.9rem',
                        color: '#856404',
                        lineHeight: '1.5'
                      }}>
                        Please provide your complete service address so the professional can visit your location.
                        Include street number, street name, suburb, and city.
                      </p>
                      <textarea
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        placeholder="e.g., 123 Main Street, Sandton, Johannesburg, 2196"
                        rows="3"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #ffc107',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          marginBottom: '0.75rem'
                        }}
                      />
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem'
                      }}>
                        <button
                          style={{
                            flex: 1,
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.6 : 1
                          }}
                          onClick={() => handleSubmitServiceAddress(booking.id)}
                          disabled={submitting}
                        >
                          ✅ Submit Address
                        </button>
                        <button
                          style={{
                            flex: 1,
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            padding: '0.65rem 1rem',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.6 : 1
                          }}
                          onClick={() => handleCancelAddressForm(booking.id)}
                          disabled={submitting}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h4 style={{
                        margin: '0 0 0.5rem 0',
                        color: '#856404',
                        fontSize: '1rem',
                        fontWeight: 600
                      }}>
                        ⚠️ Service Address Required
                      </h4>
                      <p style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.9rem',
                        color: '#856404',
                        lineHeight: '1.5'
                      }}>
                        You've accepted the quote! Please provide your service address so the professional knows where to go.
                      </p>
                      <button
                        style={{
                          background: '#ffc107',
                          color: '#000',
                          border: 'none',
                          padding: '0.65rem 1.5rem',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          width: '100%'
                        }}
                        onClick={() => setShowAddressForm(booking.id)}
                      >
                        📍 Provide Address
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Address Confirmation Display */}
              {(booking.service_address || serviceAddresses[booking.id]) && (
                <div style={{
                  background: '#d4edda',
                  padding: '1rem',
                  borderRadius: '8px',
                  margin: '1rem 0',
                  borderLeft: '4px solid #28a745'
                }}>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    color: '#155724',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}>
                    ✅ Service Address Confirmed
                  </h4>
                  <p style={{
                    margin: '0.5rem 0',
                    fontSize: '0.95rem',
                    color: '#155724',
                    fontWeight: 500
                  }}>
                    📍 {booking.service_address || serviceAddresses[booking.id]?.address}
                  </p>
                  {(booking.service_address_submitted_at || serviceAddresses[booking.id]?.submitted_at) && (
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.8rem',
                      color: '#155724',
                      opacity: 0.8
                    }}>
                      Submitted: {formatDate(booking.service_address_submitted_at || serviceAddresses[booking.id]?.submitted_at)}
                    </p>
                  )}
                </div>
              )}

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
              {/* Only show reschedule/cancel if no pending quote */}
              {(selectedBooking.status?.toLowerCase() === 'pending' || selectedBooking.status?.toLowerCase() === 'confirmed') &&
               (!quotes[selectedBooking.id] || quotes[selectedBooking.id].status !== 'pending') && (
                <>
                  <button className="btn-warning" onClick={() => handleOpenRescheduleModal(selectedBooking)}>
                    Reschedule
                  </button>
                  <button className="btn-danger" onClick={() => handleOpenCancelModal(selectedBooking)}>
                    Cancel Booking
                  </button>
                </>
              )}
              {selectedBooking.status?.toLowerCase() === 'completed' && (
                <button className="btn-warning" onClick={() => window.location.href = '/service'}>
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

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedBooking && (
        <div className="modal-overlay" onClick={handleCloseAllModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cancel Booking</h2>
              <button className="modal-close" onClick={handleCloseAllModals}>×</button>
            </div>
            <div className="modal-body">
              <div className="cancel-warning">
                <p><strong>Are you sure you want to cancel this booking?</strong></p>
                <p className="warning-text">Service: {selectedBooking.service_type}</p>
                <p className="warning-text">Professional: {selectedBooking.worker_name}</p>
                <p className="warning-text">Date: {formatDate(selectedBooking.booking_date)}</p>
              </div>

              <div className="refund-policy-notice" style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '1rem',
                margin: '1rem 0'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>Cancellation & Refund Policy</h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#856404' }}>
                  <li>Free cancellation up to 48 hours before booking</li>
                  <li>Cancellations within 48 hours may incur a fee</li>
                  <li>No refunds for same-day cancellations</li>
                  <li>Refunds are processed within 5-7 business days</li>
                </ul>
              </div>

              <div className="feedback-section">
                <h4>Reason for Cancellation</h4>
                <textarea
                  className="feedback-textarea"
                  placeholder="Please explain why you need to cancel..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    resize: 'vertical'
                  }}
                />
                <p className="feedback-hint" style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                  Your cancellation will be processed immediately
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCloseAllModals}
                disabled={submitting}
              >
                Keep Booking
              </button>
              <button
                className="btn-danger"
                onClick={handleCancelBooking}
                disabled={submitting || !cancelReason.trim()}
              >
                {submitting ? 'Submitting...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Booking Modal */}
      {showRescheduleModal && selectedBooking && (
        <div className="modal-overlay" onClick={handleCloseAllModals}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reschedule Booking</h2>
              <button className="modal-close" onClick={handleCloseAllModals}>×</button>
            </div>
            <div className="modal-body">
              <div className="reschedule-info" style={{
                background: '#f8f9fa',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                <p><strong>Current Schedule:</strong></p>
                <p>Date: {formatDate(selectedBooking.booking_date)}</p>
                <p>Time: {formatTime(selectedBooking.booking_time)}</p>
              </div>

              <div className="reschedule-policy-notice" style={{
                background: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#0d47a1' }}>Reschedule Policy</h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#0d47a1' }}>
                  <li>Free rescheduling up to 24 hours before booking</li>
                  <li>Professional must approve new date/time</li>
                  <li>You'll receive confirmation within 24 hours</li>
                  <li>Multiple reschedules may require additional fees</li>
                </ul>
              </div>

              <div className="form-group">
                <label>New Date *</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    marginTop: '0.5rem'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>New Time *</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    marginTop: '0.5rem'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Reason for Rescheduling *</label>
                <textarea
                  placeholder="Please explain why you need to reschedule..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  rows={4}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem',
                    resize: 'vertical',
                    marginTop: '0.5rem'
                  }}
                />
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                  The professional will review your request
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCloseAllModals}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-warning"
                onClick={handleRescheduleBooking}
                disabled={submitting || !rescheduleDate || !rescheduleTime || !rescheduleReason.trim()}
              >
                {submitting ? 'Submitting...' : 'Request Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10000,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default JobHistory;
