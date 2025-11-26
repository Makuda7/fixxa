import React, { useState } from 'react';
import './StarRating.css';

const StarRating = ({
  rating = 0,
  onRatingChange,
  readonly = false,
  size = 'medium',
  label = '',
  showValue = false
}) => {
  const [hover, setHover] = useState(0);

  const handleClick = (value) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value) => {
    if (!readonly) {
      setHover(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHover(0);
    }
  };

  const getStarClass = (index) => {
    const value = index + 1;
    const currentRating = hover || rating;

    if (value <= currentRating) {
      return 'star filled';
    } else if (value - 0.5 <= currentRating) {
      return 'star half-filled';
    }
    return 'star empty';
  };

  return (
    <div className={`star-rating ${size} ${readonly ? 'readonly' : 'interactive'}`}>
      {label && <span className="rating-label">{label}</span>}
      <div className="stars-container">
        {[...Array(5)].map((_, index) => (
          <span
            key={index}
            className={getStarClass(index)}
            onClick={() => handleClick(index + 1)}
            onMouseEnter={() => handleMouseEnter(index + 1)}
            onMouseLeave={handleMouseLeave}
            role={readonly ? 'img' : 'button'}
            aria-label={`${index + 1} star${index !== 0 ? 's' : ''}`}
            tabIndex={readonly ? -1 : 0}
          >
            ★
          </span>
        ))}
      </div>
      {showValue && (
        <span className="rating-value">
          {rating > 0 ? rating.toFixed(1) : 'Not rated'}
        </span>
      )}
    </div>
  );
};

export default StarRating;
