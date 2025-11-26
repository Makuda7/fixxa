import React, { useState } from 'react';
import PhotoDropzone from './PhotoDropzone';
import './ReviewForm.css';

const ReviewForm = ({ workerName, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
  });
  const [photos, setPhotos] = useState([]);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const maxChars = 500;
  const charCount = formData.comment.length;
  const charsRemaining = maxChars - charCount;
  const isOverLimit = charCount > maxChars;

  // Handle rating change
  const handleRatingClick = (rating) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  // Handle comment change
  const handleCommentChange = (e) => {
    setFormData((prev) => ({ ...prev, comment: e.target.value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!formData.comment.trim()) {
      setError('Please write a review');
      return;
    }

    if (formData.comment.length > maxChars) {
      setError(`Review must be ${maxChars} characters or less`);
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        photos: photos.map((p) => p.file),
      });
    } catch (err) {
      setError(err.message || 'Failed to submit review');
      setSubmitting(false);
    }
  };

  // Rating labels
  const getRatingLabel = (rating) => {
    const labels = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent',
    };
    return labels[rating] || '';
  };

  const displayRating = hoveredRating || formData.rating;

  return (
    <div className="review-form-container">
      <div className="review-form-header">
        <h2>Write a Review</h2>
        <p className="review-subtitle">
          Share your experience with {workerName}
        </p>
      </div>

      {error && (
        <div className="review-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="review-form">
        {/* Rating Section */}
        <div className="form-section">
          <label className="form-label">
            Rating <span className="required">*</span>
          </label>

          <div className="rating-container">
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star ${star <= displayRating ? 'filled' : ''}`}
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  aria-label={`Rate ${star} stars`}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill={star <= displayRating ? '#ffc107' : 'none'}
                    stroke={star <= displayRating ? '#ffc107' : '#ccc'}
                    strokeWidth="2"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            {displayRating > 0 && (
              <p className="rating-label">
                {displayRating} {displayRating === 1 ? 'Star' : 'Stars'} -{' '}
                {getRatingLabel(displayRating)}
              </p>
            )}
          </div>
        </div>

        {/* Review Text Section */}
        <div className="form-section">
          <label htmlFor="comment" className="form-label">
            Your Review <span className="required">*</span>
          </label>

          <textarea
            id="comment"
            name="comment"
            value={formData.comment}
            onChange={handleCommentChange}
            placeholder="Share details of your own experience with this worker..."
            rows="6"
            className={isOverLimit ? 'over-limit' : ''}
            disabled={submitting}
          />

          <div className="character-counter">
            <span className={isOverLimit ? 'over-limit' : ''}>
              {charCount} / {maxChars} characters
            </span>
            {!isOverLimit && charsRemaining <= 50 && charsRemaining > 0 && (
              <span className="warning-text">
                ({charsRemaining} remaining)
              </span>
            )}
            {isOverLimit && (
              <span className="error-text">
                ({Math.abs(charsRemaining)} over limit)
              </span>
            )}
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="form-section">
          <label className="form-label">
            Photos (Optional)
            <span className="label-hint">Max 3 photos</span>
          </label>

          <PhotoDropzone
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={3}
            maxSize={5}
          />
        </div>

        {/* Guidelines */}
        <div className="review-guidelines">
          <h4>Review Guidelines:</h4>
          <ul>
            <li>Be honest and constructive</li>
            <li>Focus on your experience with the service</li>
            <li>Avoid offensive language or personal attacks</li>
            <li>Don't include personal information</li>
          </ul>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting || isOverLimit || formData.rating === 0}
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
