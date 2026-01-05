import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './ProfessionalCarousel.css';

const ProfessionalCarousel = ({ professionals = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isAnimating && professionals.length > 1) {
        nextSlide();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [currentIndex, isAnimating, professionals.length]);

  const nextSlide = () => {
    if (isAnimating || professionals.length === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % professionals.length);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const prevSlide = () => {
    if (isAnimating || professionals.length === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + professionals.length) % professionals.length);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const goToSlide = (index) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
  };

  const getCardPosition = (index) => {
    const total = professionals.length;
    const diff = index - currentIndex;

    // Normalize position to be within -total/2 to total/2
    let position = diff;
    if (position > total / 2) position -= total;
    if (position < -total / 2) position += total;

    return position;
  };

  if (professionals.length === 0) {
    return (
      <div className="carousel-empty">
        <p>No professionals available</p>
      </div>
    );
  }

  return (
    <div className="carousel-3d-container">
      <h2 className="carousel-title">Top-Rated Professionals</h2>

      <div className="carousel-3d">
        <div className="carousel-3d-track">
          {professionals.map((pro, index) => {
            const position = getCardPosition(index);
            const isCenter = position === 0;
            const rating = parseFloat(pro.avg_rating) || 0;
            const stars = rating > 0 ? renderStars(rating) : '☆☆☆☆☆';

            return (
              <div
                key={pro.id}
                className={`carousel-card ${isCenter ? 'center' : ''} position-${position}`}
                style={{
                  '--position': position,
                }}
              >
                <Link to={`/profile?id=${pro.id}`} className="card-link">
                  <div className="card-image-wrapper">
                    {pro.profile_photo_url ? (
                      <img
                        src={pro.profile_photo_url}
                        alt={`${pro.name}'s profile`}
                        className="card-image"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const placeholder = e.target.parentElement.querySelector('.card-image-placeholder');
                          if (placeholder) placeholder.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="card-image-placeholder" style={{ display: pro.profile_photo_url ? 'none' : 'flex' }}>
                      <div className="placeholder-initial">{pro.name?.charAt(0) || '?'}</div>
                    </div>
                    {pro.is_verified && <div className="verified-badge">Verified</div>}
                  </div>

                  <div className="card-content">
                    <h3 className="card-name">{pro.name}</h3>
                    <p className="card-specialty">{pro.speciality || 'General Services'}</p>
                    {pro.city && (
                      <p className="card-location">
                        <img src="/images/icons-fixxa/travel.png" alt="Location" style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '4px' }} />
                        {pro.city}
                      </p>
                    )}
                    {pro.years_of_experience && (
                      <p className="card-experience">
                        {pro.years_of_experience} {pro.years_of_experience === 1 ? 'year' : 'years'} experience
                      </p>
                    )}

                    {rating > 0 ? (
                      <div className="card-rating">
                        <span className="rating-number">{rating.toFixed(1)}</span>
                        <span className="rating-stars">{stars}</span>
                        <span className="review-count">({pro.review_count || 0})</span>
                      </div>
                    ) : (
                      <p className="no-reviews">No reviews yet</p>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        {professionals.length > 1 && (
          <>
            <button
              className="carousel-nav prev"
              onClick={prevSlide}
              disabled={isAnimating}
              aria-label="Previous professional"
            >
              ‹
            </button>
            <button
              className="carousel-nav next"
              onClick={nextSlide}
              disabled={isAnimating}
              aria-label="Next professional"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Indicators */}
      {professionals.length > 1 && (
        <div className="carousel-indicators">
          {professionals.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              disabled={isAnimating}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfessionalCarousel;
