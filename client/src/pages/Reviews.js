import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ReviewPhotoGuidelines from '../components/ReviewPhotoGuidelines';
import './Reviews.css';

const Reviews = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('statistics');
  const [pendingReviews, setPendingReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [statistics, setStatistics] = useState({
    totalReviews: 0,
    averageRating: 0,
    pendingCount: 0,
    thisMonthCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPhotoGuidelines, setShowPhotoGuidelines] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Photo upload state
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const editPhotoInputRef = useRef(null);

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

  const maxChars = 1000;
  const maxPhotos = 5;
  const maxPhotoSize = 5 * 1024 * 1024; // 5MB
  const allowedPhotoTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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
      const pending = response.data.pendingReviews || [];
      setPendingReviews(pending);
      setStatistics(prev => ({
        ...prev,
        pendingCount: pending.length
      }));
    } catch (err) {
      console.error('Failed to fetch pending reviews:', err);
      showToast('Failed to load pending reviews', 'error');
    }
  };

  const fetchMyReviews = async () => {
    try {
      const response = await api.get('/reviews/client');
      const reviews = response.data.reviews || [];
      setMyReviews(reviews);

      // Calculate statistics
      const totalReviews = reviews.length;
      const averageRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length).toFixed(1)
        : 0;

      const now = new Date();
      const thisMonthReviews = reviews.filter(r => {
        const reviewDate = new Date(r.created_at);
        return reviewDate.getMonth() === now.getMonth() &&
               reviewDate.getFullYear() === now.getFullYear();
      });

      setStatistics(prev => ({
        ...prev,
        totalReviews,
        averageRating,
        thisMonthCount: thisMonthReviews.length
      }));
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

  // Photo Upload Functions
  const handlePhotoClick = () => {
    const guidelinesSeen = sessionStorage.getItem('reviewPhotoGuidelinesSeen');
    if (!guidelinesSeen) {
      setShowPhotoGuidelines(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleAcceptGuidelines = () => {
    sessionStorage.setItem('reviewPhotoGuidelinesSeen', 'true');
    setShowPhotoGuidelines(false);
    fileInputRef.current?.click();
  };

  const handleCancelGuidelines = () => {
    setShowPhotoGuidelines(false);
  };

  const handleFileSelection = async (e) => {
    const files = Array.from(e.target.files);

    if (uploadedPhotos.length + files.length > maxPhotos) {
      showToast(`Maximum ${maxPhotos} photos allowed per review`, 'error');
      return;
    }

    for (const file of files) {
      if (!allowedPhotoTypes.includes(file.type)) {
        showToast(`${file.name}: Only JPEG, PNG, and WEBP images are allowed`, 'error');
        continue;
      }

      if (file.size > maxPhotoSize) {
        showToast(`${file.name}: File size must be less than 5MB`, 'error');
        continue;
      }

      await uploadPhoto(file);
    }

    // Reset file input
    e.target.value = '';
  };

  const uploadPhoto = async (file) => {
    const photoId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Add to uploading list with preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadingPhotos((prev) => [
        ...prev,
        { id: photoId, preview: e.target.result, progress: 0 }
      ]);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await api.post('/reviews/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadingPhotos((prev) =>
            prev.map((p) => (p.id === photoId ? { ...p, progress } : p))
          );
        }
      });

      if (response.data.success) {
        // Move from uploading to uploaded
        setUploadingPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setUploadedPhotos((prev) => [...prev, response.data.url]);
        showToast('Photo uploaded successfully', 'success');
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      setUploadingPhotos((prev) => prev.filter((p) => p.id !== photoId));
      showToast(`Failed to upload ${file.name}`, 'error');
    }
  };

  const removePhoto = (photoUrl) => {
    setUploadedPhotos((prev) => prev.filter((url) => url !== photoUrl));
  };

  const handleViewPhoto = (photoUrl) => {
    setViewerPhoto(photoUrl);
    setShowPhotoViewer(true);
  };

  const handleClosePhotoViewer = () => {
    setShowPhotoViewer(false);
    setViewerPhoto(null);
  };

  const handleEditPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (uploadedPhotos.length >= maxPhotos) {
      showToast(`Maximum ${maxPhotos} photos allowed`, 'error');
      return;
    }

    if (!allowedPhotoTypes.includes(file.type)) {
      showToast('Only JPEG, PNG, and WEBP images are allowed', 'error');
      return;
    }

    if (file.size > maxPhotoSize) {
      showToast('File size must be less than 5MB', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await api.post(`/reviews/${selectedReview.id}/upload-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setUploadedPhotos(response.data.allPhotos);
        showToast('Photo added successfully', 'success');
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      showToast('Failed to upload photo', 'error');
    }

    e.target.value = '';
  };

  const handleRemoveEditPhoto = async (photoUrl) => {
    if (!selectedReview) return;

    try {
      const response = await api.delete(`/reviews/${selectedReview.id}/photos`, {
        data: { photoUrl }
      });

      if (response.data.success) {
        setUploadedPhotos(response.data.photos);
        showToast('Photo removed', 'success');
      } else {
        throw new Error(response.data.error || 'Failed to remove photo');
      }
    } catch (error) {
      console.error('Remove photo error:', error);
      showToast('Failed to remove photo', 'error');
    }
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
    setUploadedPhotos([]);
    setUploadingPhotos([]);
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
    setUploadedPhotos(review.photos || []);
    setUploadingPhotos([]);
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
        ...formData,
        photos: uploadedPhotos
      });

      showToast('Review submitted successfully!', 'success');
      setShowReviewModal(false);
      setUploadedPhotos([]);
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
      await api.put(`/reviews/${selectedReview.id}`, {
        ...formData,
        photos: uploadedPhotos
      });

      showToast('Review updated successfully!', 'success');
      setShowEditModal(false);
      setUploadedPhotos([]);
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

        {/* Photo Upload Section */}
        <div className="form-section photo-section">
          <label className="form-label">
            Photos (Optional)
            <span className="photo-hint"> - Show before/after or completed work</span>
          </label>

          <input
            ref={isEdit ? editPhotoInputRef : fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={isEdit ? handleEditPhotoUpload : handleFileSelection}
            style={{ display: 'none' }}
            multiple={!isEdit}
          />

          {uploadedPhotos.length === 0 && uploadingPhotos.length === 0 && (
            <div className="upload-dropzone" onClick={isEdit ? () => editPhotoInputRef.current?.click() : handlePhotoClick}>
              <div className="upload-icon">📷</div>
              <p>Click to upload photos</p>
              <p className="upload-hint">Max {maxPhotos} photos, 5MB each (JPEG, PNG, WEBP)</p>
            </div>
          )}

          {(uploadedPhotos.length > 0 || uploadingPhotos.length > 0) && (
            <div className="photo-preview-grid">
              {uploadedPhotos.map((photoUrl, index) => (
                <div key={index} className="photo-preview-item">
                  <img src={photoUrl} alt={`Review ${index + 1}`} onClick={() => handleViewPhoto(photoUrl)} />
                  <button
                    type="button"
                    className="photo-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      isEdit ? handleRemoveEditPhoto(photoUrl) : removePhoto(photoUrl);
                    }}
                    title="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
              {uploadingPhotos.map((photo) => (
                <div key={photo.id} className="photo-preview-item uploading">
                  <img src={photo.preview} alt="Uploading..." />
                  <div className="photo-upload-progress">
                    <div className="progress-bar" style={{ width: `${photo.progress}%` }}></div>
                    <span>{photo.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {uploadedPhotos.length > 0 && uploadedPhotos.length < maxPhotos && (
            <button
              type="button"
              className="btn-add-photo"
              onClick={isEdit ? () => editPhotoInputRef.current?.click() : handlePhotoClick}
              disabled={submitting}
            >
              + Add Another Photo ({uploadedPhotos.length}/{maxPhotos})
            </button>
          )}

          <div className="photo-safety-note">
            <strong>⚠️ Privacy reminder:</strong> Only upload photos of work areas. Avoid personal documents, faces, addresses, and valuables.
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
          className={`tab ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          📊 Statistics
        </button>
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
        ) : activeTab === 'statistics' ? (
          <div className="statistics-dashboard">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.totalReviews}</div>
                  <div className="stat-label">Total Reviews</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⭐</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.averageRating || '0.0'}</div>
                  <div className="stat-label">Average Rating</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.pendingCount}</div>
                  <div className="stat-label">Pending Reviews</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><img src="/images/icons-fixxa/calendar_16926328.png" alt="Calendar" style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '4px' }} /></div>
                <div className="stat-content">
                  <div className="stat-value">{statistics.thisMonthCount}</div>
                  <div className="stat-label">This Month</div>
                </div>
              </div>
            </div>

            <div className="impact-message">
              <div className="impact-icon">💡</div>
              <div className="impact-content">
                <h3>Your Reviews Make a Difference!</h3>
                <p>
                  {statistics.totalReviews === 0 ? (
                    "Start leaving reviews to help other clients find reliable professionals and help workers improve their services."
                  ) : statistics.totalReviews === 1 ? (
                    "Great start! Your review helps other clients make informed decisions and supports quality service providers."
                  ) : statistics.totalReviews < 5 ? (
                    `You've written ${statistics.totalReviews} reviews! Your feedback helps build trust in our community and guides others toward quality services.`
                  ) : statistics.totalReviews < 10 ? (
                    `Amazing! With ${statistics.totalReviews} reviews, you're an active community member helping others make informed choices and encouraging professional excellence.`
                  ) : (
                    `Incredible! You've contributed ${statistics.totalReviews} reviews! You're a valued member of our community, helping maintain high service standards and guiding countless clients.`
                  )}
                </p>
                {statistics.pendingCount > 0 && (
                  <button
                    className="btn-primary-impact"
                    onClick={() => setActiveTab('pending')}
                  >
                    Review {statistics.pendingCount} Pending Job{statistics.pendingCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
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

      {/* Photo Guidelines Modal */}
      {showPhotoGuidelines && (
        <ReviewPhotoGuidelines
          onAccept={handleAcceptGuidelines}
          onCancel={() => setShowPhotoGuidelines(false)}
        />
      )}

      {/* Photo Viewer Modal */}
      {showPhotoViewer && (
        <div className="photo-viewer-overlay" onClick={() => setShowPhotoViewer(false)}>
          <div className="photo-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="photo-viewer-close"
              onClick={() => setShowPhotoViewer(false)}
              aria-label="Close photo viewer"
            >
              ×
            </button>
            <img src={showPhotoViewer} alt="Review photo" />
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
