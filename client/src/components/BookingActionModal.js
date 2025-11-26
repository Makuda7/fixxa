import React, { useState } from 'react';
import './BookingActionModal.css';

const BookingActionModal = ({ booking, action, onClose, onConfirm }) => {
  const [formData, setFormData] = useState({
    reason: '',
    newDate: '',
    newTime: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation based on action type
    if (action === 'decline' && !formData.reason.trim()) {
      setError('Please provide a reason for declining');
      return;
    }

    if (action === 'reschedule') {
      if (!formData.newDate) {
        setError('Please select a new date');
        return;
      }
      if (!formData.newTime) {
        setError('Please select a new time');
        return;
      }
    }

    setSubmitting(true);

    try {
      await onConfirm(formData);
    } catch (err) {
      setError(err.message || 'Action failed');
      setSubmitting(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  // Modal content based on action type
  const getModalContent = () => {
    switch (action) {
      case 'approve':
        return {
          title: 'Approve Booking',
          icon: '✓',
          iconClass: 'icon-success',
          message: `Are you sure you want to approve this booking from ${booking?.client_name}?`,
          confirmText: 'Approve Booking',
          confirmClass: 'btn-success',
        };

      case 'decline':
        return {
          title: 'Decline Booking',
          icon: '✕',
          iconClass: 'icon-danger',
          message: `Please provide a reason for declining this booking from ${booking?.client_name}:`,
          confirmText: 'Decline Booking',
          confirmClass: 'btn-danger',
          showReasonField: true,
        };

      case 'reschedule':
        return {
          title: 'Reschedule Booking',
          icon: '📅',
          iconClass: 'icon-warning',
          message: `Select a new date and time for ${booking?.client_name}'s booking:`,
          confirmText: 'Reschedule Booking',
          confirmClass: 'btn-warning',
          showDateTimeFields: true,
        };

      case 'complete':
        return {
          title: 'Mark as Complete',
          icon: '✓',
          iconClass: 'icon-success',
          message: `Mark this job for ${booking?.client_name} as completed?`,
          confirmText: 'Mark as Complete',
          confirmClass: 'btn-success',
        };

      default:
        return {
          title: 'Confirm Action',
          icon: '?',
          iconClass: 'icon-info',
          message: 'Are you sure you want to proceed?',
          confirmText: 'Confirm',
          confirmClass: 'btn-primary',
        };
    }
  };

  const content = getModalContent();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="btn-close-modal" onClick={onClose} disabled={submitting}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={`modal-icon ${content.iconClass}`}>
          <span>{content.icon}</span>
        </div>

        <h2 className="modal-title">{content.title}</h2>

        {error && (
          <div className="modal-error">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <p className="modal-message">{content.message}</p>

          {/* Booking Details */}
          {booking && (
            <div className="booking-details">
              <div className="detail-row">
                <span className="detail-label">Service:</span>
                <span className="detail-value">{booking.service_type || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Current Date:</span>
                <span className="detail-value">
                  {booking.booking_date ? new Date(booking.booking_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Time:</span>
                <span className="detail-value">{booking.booking_time || 'N/A'}</span>
              </div>
            </div>
          )}

          {/* Reason Field for Decline */}
          {content.showReasonField && (
            <div className="form-group">
              <label htmlFor="reason">
                Reason for Declining <span className="required">*</span>
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                placeholder="Explain why you're declining this booking"
                rows="4"
                required
                disabled={submitting}
              />
            </div>
          )}

          {/* Date/Time Fields for Reschedule */}
          {content.showDateTimeFields && (
            <>
              <div className="form-group">
                <label htmlFor="newDate">
                  New Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  id="newDate"
                  name="newDate"
                  value={formData.newDate}
                  onChange={handleInputChange}
                  min={today}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-group">
                <label htmlFor="newTime">
                  New Time <span className="required">*</span>
                </label>
                <input
                  type="time"
                  id="newTime"
                  name="newTime"
                  value={formData.newTime}
                  onChange={handleInputChange}
                  required
                  disabled={submitting}
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn-confirm ${content.confirmClass}`}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : content.confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingActionModal;
