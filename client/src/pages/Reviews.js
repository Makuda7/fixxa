import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Reviews.css';

const Reviews = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingReviews, setPendingReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Review form state
  const [formData, setFormData] = useState({
    overall_rating: 0,
    quality_rating: 0,
    punctuality_rating: 0,
    communication_rating: 0,
    value_rating: 0,
    review_text: ''
  });
  const [hoveredRating, setHoveredRating] = useState({});

  const maxChars = 500;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, 5000);
      return () => clearTimeout(timer);
    });
  }, [toasts]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchPendingReviews(), fetchMyReviews()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const response = await api.get('/reviews/pending-reviews');
      setPendingReviews(response.data.pendingReviews || []);
    } catch (err) {
      console.error('Failed to fetch pending reviews:', err);
      showToast('Failed to load pending reviews', 'error');
    }
  };

  const fetchMyReviews = async () => {
    try {
      const response = await api.get('/reviews/client');
      setMyReviews(response.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch my reviews:', err);
      showToast('Failed to load your reviews', 'error');
    }
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    const newToast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleWriteReview = (booking) => {
    setSelectedBooking(booking);
    setFormData({
      overall_rating: 0,
      quality_rating: 0,
      punctuality_rating: 0,
      communication_rating: 0,
      value_rating: 0,
      review_text: ''
    });
    setShowReviewModal(true);
  };

  const handleEditReview = (review) => {
    setSelectedReview(review);
    setFormData({
      overall_rating: review.overall_rating || 0,
      quality_rating: review.quality_rating || 0,
      punctuality_rating: review.punctuality_rating || 0,
      communication_rating: review.communication_rating || 0,
      value_rating: review.value_rating || 0,
      review_text: review.review_text || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteReview = (review) => {
    setSelectedReview(review);
    setShowDeleteModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (formData.overall_rating === 0) {
      showToast('Please provide an overall rating', 'error');
      return;
    }

    if (!formData.review_text.trim()) {
      showToast('Please write a review', 'error');
      return;
    }

    if (formData.review_text.length > maxChars) {
      showToast(`Review must be ${maxChars} characters or less`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/reviews/client', {
        booking_id: selectedBooking.booking_id,
        worker_id: selectedBooking.worker_id,
        ...formData
      });

      showToast('Review submitted successfully!', 'success');
      setShowReviewModal(false);
      await fetchData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to submit review';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();

    if (formData.overall_rating === 0) {
      showToast('Please provide an overall rating', 'error');
      return;
    }

    if (!formData.review_text.trim()) {
      showToast('Please write a review', 'error');
      return;
    }

    if (formData.review_text.length > maxChars) {
      showToast(`Review must be ${maxChars} characters or less`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/reviews/${selectedReview.id}`, formData);

      showToast('Review updated successfully!', 'success');
      setShowEditModal(false);
      await fetchMyReviews();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to update review';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteReview = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/reviews/${selectedReview.id}`);

      showToast('Review deleted successfully', 'success');
      setShowDeleteModal(false);
      await fetchMyReviews();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to delete review';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRatingClick = (category, rating) => {
    setFormData((prev) => ({ ...prev, [category]: rating }));
  };

  const handleRatingHover = (category, rating) => {
    setHoveredRating((prev) => ({ ...prev, [category]: rating }));
  };

  const handleRatingLeave = (category) => {
    setHoveredRating((prev) => ({ ...prev, [category]: 0 }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const charCount = formData.review_text.length;
  const charsRemaining = maxChars - charCount;
  const isOverLimit = charCount > maxChars;

  const renderStars = (category, rating) => {
    const displayRating = hoveredRating[category] || rating;
    return (
      <div className="stars-input">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= displayRating ? 'filled' : ''}`}
            onClick={() => handleRatingClick(category, star)}
            onMouseEnter={() => handleRatingHover(category, star)}
            onMouseLeave={() => handleRatingLeave(category)}
            aria-label={`Rate ${star} stars`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={star <= displayRating ? '#ffc107' : 'none'}
              stroke={star <= displayRating ? '#ffc107' : '#ccc'}
              strokeWidth="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
        <span className="rating-value">{displayRating > 0 ? displayRating : '-'}</span>
      </div>
    );
  };

  const renderReadOnlyStars = (rating) => {
    return (
      <div className="stars-readonly">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={star <= rating ? '#ffc107' : 'none'}
            stroke={star <= rating ? '#ffc107' : '#ccc'}
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    );
  };

  const renderReviewForm = (isEdit = false) => {
    const booking = isEdit ? selectedReview : selectedBooking;
    const workerName = isEdit ? selectedReview?.professional_name : selectedBooking?.worker_name;

    return (
      <form onSubmit={isEdit ? handleUpdateReview : handleSubmitReview} className="review-form">
        <div className="review-form-header">
          <h3>{isEdit ? 'Edit Review' : 'Write a Review'}</h3>
          <p className="review-subtitle">
            {isEdit ? `Update your review for ${workerName}` : `Share your experience with ${workerName}`}
          </p>
        </div>

        <div className="rating-section">
          <div className="rating-row">
            <label className="rating-label">
              Overall Rating <span className="required">*</span>
            </label>
            {renderStars('overall_rating', formData.overall_rating)}
          </div>

          <div className="rating-row">
            <label className="rating-label">Quality of Work</label>
            {renderStars('quality_rating', formData.quality_rating)}
          </div>

          <div className="rating-row">
            <label className="rating-label">Punctuality</label>
            {renderStars('punctuality_rating', formData.punctuality_rating)}
          </div>

          <div className="rating-row">
            <label className="rating-label">Communication</label>
            {renderStars('communication_rating', formData.communication_rating)}
          </div>

          <div className="rating-row">
            <label className="rating-label">Value for Money</label>
            {renderStars('value_rating', formData.value_rating)}
          </div>
        </div>

        <div className="form-section">
          <label htmlFor="review_text" className="form-label">
            Your Review <span className="required">*</span>
          </label>
          <textarea
            id="review_text"
            name="review_text"
            value={formData.review_text}
            onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
            placeholder="Share details of your experience..."
            rows="6"
            className={isOverLimit ? 'over-limit' : ''}
            disabled={submitting}
          />
          <div className="character-counter">
            <span className={isOverLimit ? 'over-limit' : ''}>
              {charCount} / {maxChars} characters
            </span>
            {!isOverLimit && charsRemaining <= 50 && charsRemaining > 0 && (
              <span className="warning-text">({charsRemaining} remaining)</span>
            )}
            {isOverLimit && (
              <span className="error-text">({Math.abs(charsRemaining)} over limit)</span>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => isEdit ? setShowEditModal(false) : setShowReviewModal(false)}
            className="btn-cancel"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting || isOverLimit || formData.overall_rating === 0}
          >
            {submitting ? (isEdit ? 'Updating...' : 'Submitting...') : (isEdit ? 'Update Review' : 'Submit Review')}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <button className="back-button" onClick={() => navigate('/client-dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>My Reviews</h1>
        <p className="reviews-subtitle">Manage your service reviews and feedback</p>
      </div>

      <div className="reviews-tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Reviews
          {pendingReviews.length > 0 && (
            <span className="badge">{pendingReviews.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'submitted' ? 'active' : ''}`}
          onClick={() => setActiveTab('submitted')}
        >
          My Reviews
          {myReviews.length > 0 && (
            <span className="badge">{myReviews.length}</span>
          )}
        </button>
      </div>

      <div className="reviews-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading reviews...</p>
          </div>
        ) : activeTab === 'pending' ? (
          <div className="pending-reviews">
            {pendingReviews.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <h3>No Pending Reviews</h3>
                <p>You're all caught up! You'll see completed jobs here that need reviews.</p>
              </div>
            ) : (
              <div className="reviews-grid">
                {pendingReviews.map((booking) => (
                  <div key={booking.booking_id} className="review-card pending">
                    <div className="card-header">
                      <div className="worker-info">
                        <h3>{booking.worker_name}</h3>
                        <p className="service">{booking.worker_service}</p>
                      </div>
                      <span className="pending-badge">Pending</span>
                    </div>
                    <div className="card-body">
                      <div className="booking-info">
                        <p className="info-row">
                          <span className="label">Job Date:</span>
                          <span className="value">{formatDate(booking.booking_date)}</span>
                        </p>
                        <p className="info-row">
                          <span className="label">Completed:</span>
                          <span className="value">{formatDate(booking.completed_at)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn-primary"
                        onClick={() => handleWriteReview(booking)}
                      >
                        Write Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="my-reviews">
            {myReviews.length === 0 ? (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <h3>No Reviews Yet</h3>
                <p>You haven't submitted any reviews. Complete a job to leave your first review!</p>
              </div>
            ) : (
              <div className="reviews-grid">
                {myReviews.map((review) => (
                  <div key={review.id} className="review-card submitted">
                    <div className="card-header">
                      <div className="worker-info">
                        <h3>{review.professional_name}</h3>
                        <p className="service">{review.service}</p>
                      </div>
                      <div className="overall-rating">
                        {renderReadOnlyStars(review.overall_rating)}
                        <span className="rating-number">{review.overall_rating}/5</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="detailed-ratings">
                        {review.quality_rating > 0 && (
                          <div className="rating-item">
                            <span className="category">Quality:</span>
                            {renderReadOnlyStars(review.quality_rating)}
                          </div>
                        )}
                        {review.punctuality_rating > 0 && (
                          <div className="rating-item">
                            <span className="category">Punctuality:</span>
                            {renderReadOnlyStars(review.punctuality_rating)}
                          </div>
                        )}
                        {review.communication_rating > 0 && (
                          <div className="rating-item">
                            <span className="category">Communication:</span>
                            {renderReadOnlyStars(review.communication_rating)}
                          </div>
                        )}
                        {review.value_rating > 0 && (
                          <div className="rating-item">
                            <span className="category">Value:</span>
                            {renderReadOnlyStars(review.value_rating)}
                          </div>
                        )}
                      </div>
                      <p className="review-text">{review.review_text}</p>
                      <p className="review-date">
                        Submitted on {formatDate(review.created_at)}
                      </p>
                    </div>
                    <div className="card-footer">
                      <button
                        className="btn-secondary"
                        onClick={() => handleEditReview(review)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteReview(review)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {renderReviewForm(false)}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {renderReviewForm(true)}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirmation">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <h3>Delete Review?</h3>
              <p>Are you sure you want to delete your review for {selectedReview?.professional_name}? This action cannot be undone.</p>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-cancel"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteReview}
                  className="btn-danger"
                  disabled={submitting}
                >
                  {submitting ? 'Deleting...' : 'Delete Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="toast-close">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reviews;
