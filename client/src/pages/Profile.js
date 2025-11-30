import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const Profile = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [completionRate, setCompletionRate] = useState(null);

  const [showContactForm, setShowContactForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState({ url: '', caption: '' });

  const [contactMessage, setContactMessage] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  const workerId = parseInt(searchParams.get('id'), 10);

  useEffect(() => {
    if (!workerId) {
      setError('No worker selected');
      setLoading(false);
      return;
    }
    loadWorkerProfile();
  }, [workerId]);

  const loadWorkerProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch worker data
      const workerRes = await fetch('/workers', { credentials: 'include' });
      const workersData = await workerRes.json();
      const workers = Array.isArray(workersData) ? workersData : [];
      const foundWorker = workers.find(w => Number(w.id) === workerId);

      if (!foundWorker) {
        setError('Worker not found');
        setLoading(false);
        return;
      }

      setWorker(foundWorker);

      // Load additional data in parallel
      await Promise.all([
        loadReviews(workerId),
        loadGallery(workerId),
        loadCompletionRate(workerId),
        isAuthenticated && user?.type !== 'professional' ? loadCertifications(workerId) : Promise.resolve()
      ]);

      setLoading(false);
    } catch (err) {
      console.error('Failed to load worker profile:', err);
      setError('Unable to load worker profile');
      setLoading(false);
    }
  };

  const loadReviews = async (id) => {
    try {
      const res = await fetch(`/reviews?workerId=${id}`, { credentials: 'include' });
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  const loadGallery = async (id) => {
    try {
      const res = await fetch(`/workers/portfolio/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.photos)) {
        setGallery(data.photos);
      }
    } catch (err) {
      console.error('Failed to load gallery:', err);
    }
  };

  const loadCertifications = async (id) => {
    try {
      const res = await fetch(`/workers/${id}/certifications`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.certifications)) {
        setCertifications(data.certifications);
      }
    } catch (err) {
      console.error('Failed to load certifications:', err);
    }
  };

  const loadCompletionRate = async (id) => {
    try {
      const res = await fetch(`/workers/${id}/completion-rate`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCompletionRate(data);
      }
    } catch (err) {
      console.error('Failed to load completion rate:', err);
    }
  };

  const getAvailabilityText = (availabilitySchedule) => {
    if (!availabilitySchedule) return 'All week';

    try {
      let type;
      if (typeof availabilitySchedule === 'string') {
        try {
          const parsed = JSON.parse(availabilitySchedule);
          type = parsed.type || parsed;
        } catch {
          type = availabilitySchedule;
        }
      } else if (typeof availabilitySchedule === 'object') {
        type = availabilitySchedule.type;
      } else {
        type = availabilitySchedule;
      }

      if (typeof type !== 'string') return 'All week';

      switch(type.toLowerCase()) {
        case 'weekdays': return 'Weekdays only';
        case 'weekends': return 'Weekends only';
        case 'both':
        case 'all': return 'All week';
        default: return 'All week';
      }
    } catch {
      return 'All week';
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!contactMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      const res = await fetch('/messages/contact', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: worker.id, message: contactMessage })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitMessage('Message sent successfully!');
        setContactMessage('');
        setShowContactForm(false);
        setTimeout(() => setSubmitMessage(''), 3000);
      } else {
        alert(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while sending your message');
    }
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!bookingDate || !bookingTime) {
      alert('Please select a date and time');
      return;
    }

    try {
      const res = await fetch('/bookings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: worker.id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          note: bookingNote
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubmitMessage('Booking submitted successfully!');
        setBookingDate('');
        setBookingTime('');
        setBookingNote('');
        setShowBookingForm(false);
        setTimeout(() => setSubmitMessage(''), 3000);
      } else {
        alert(data.error || 'Failed to submit booking');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while submitting booking');
    }
  };

  const handleBookNowClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowSafetyModal(true);
  };

  const handleContinueBooking = () => {
    setShowSafetyModal(false);
    setShowBookingForm(true);
    setShowContactForm(false);
    setTimeout(() => {
      document.getElementById('booking-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleContactClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowContactForm(!showContactForm);
    setShowBookingForm(false);
    setTimeout(() => {
      document.getElementById('contact-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const viewPhoto = (url, caption) => {
    setSelectedPhoto({ url, caption });
    setShowPhotoModal(true);
  };

  const scrollToReviews = () => {
    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return <div className="loading-profile">Loading profile...</div>;
  }

  if (error || !worker) {
    return <div className="error-profile">{error || 'Worker not found'}</div>;
  }

  // Calculate rating
  const actualRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / reviews.length
    : 0;
  const rating = Math.round(actualRating * 10) / 10;
  const fullStars = Math.floor(actualRating);
  const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  const reviewCount = reviews.length;

  const verifiedBadge = worker.is_verified || worker.id_verified;

  // Filter out ID and proof of residence documents - only count actual professional certifications
  const professionalCerts = certifications.filter(cert => {
    const name = (cert.document_name || cert.certification_name || '').toLowerCase();
    // Exclude common ID and verification documents
    return !name.includes('id document') &&
           !name.includes('proof of residence') &&
           !name.includes('identity') &&
           !name.includes('id copy') &&
           !name.includes('proof of address') &&
           !name.includes('residence proof');
  });

  const isCertified = professionalCerts.length > 0;

  return (
    <div className="profile-page">
      <main className="profile-container">
        <article className="worker-card">
          <div className="profile-main">
            <div className="profile-image-section">
              {worker.image && !worker.image.includes('default-profile.svg') ? (
                <img src={worker.image} alt={worker.name} className="main-profile-image" />
              ) : (
                <div className="main-profile-placeholder">
                  <div className="placeholder-initials">
                    {worker.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                </div>
              )}

              {/* Professional Badges as Stickers */}
              {verifiedBadge && (
                <div className="profile-verified-sticker" title="Identity Verified">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="11" fill="#007bff" stroke="white" strokeWidth="2"/>
                    <path d="M7 12L10.5 15.5L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              {isCertified && (
                <div className="profile-certified-sticker" title="Professionally Certified">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="11" fill="#6f42c1" stroke="white" strokeWidth="2"/>
                    <text x="12" y="17" fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">🎓</text>
                  </svg>
                </div>
              )}

              <div className="image-counter">
                📷 {gallery.length} {gallery.length === 1 ? 'photo' : 'photos'}
              </div>
            </div>

            <div className="profile-details">
              <div className="price-section">
                <div className="rating-display">
                  {rating > 0 ? `${rating}/5` : <span className="newly-joined">Newly Joined</span>}
                </div>
                <div className="rating-stars">{rating > 0 ? stars : '☆☆☆☆☆'}</div>
                {rating >= 4.5 && <span className="price-badge">Top Rated</span>}
                {reviewCount > 0 ? (
                  <span className="review-count-link" onClick={scrollToReviews}>
                    ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                ) : (
                  <span className="no-reviews-text">(No reviews yet)</span>
                )}
              </div>

              <div className="worker-name-section">
                <h1>{worker.name}</h1>
                <p className="worker-speciality">{worker.speciality}</p>
              </div>

              <div className="quick-specs">
                <span className="spec-badge">
                  📍 {worker.primary_suburb || worker.area}
                  {worker.province && `, ${worker.province}`}
                </span>
                <span className="spec-badge">⭐ {worker.experience} years experience</span>
                <span className="spec-badge" title="Days this professional is available to work">
                  📅 Works: {getAvailabilityText(worker.availability_schedule)}
                </span>
                {completionRate && completionRate.totalJobs > 0 && (
                  <span
                    className="spec-badge completion-rate-badge"
                    title={`${completionRate.completedJobs} completed out of ${completionRate.totalJobs} total jobs`}
                  >
                    ✅ {completionRate.completionRate}% completion rate
                  </span>
                )}
              </div>

              {worker.secondary_areas && worker.secondary_areas.length > 0 && (
                <div className="profile-bio secondary-areas">
                  <strong>🚗 Also Willing to Work In:</strong>{' '}
                  {Array.isArray(worker.secondary_areas)
                    ? worker.secondary_areas.join(', ')
                    : worker.secondary_areas}
                </div>
              )}

              <div className="profile-bio">
                <strong>About</strong>
                {worker.bio}
              </div>

              {isCertified && isAuthenticated && user?.type !== 'professional' && (
                <div className="certifications-section">
                  <strong>🎓 Professional Certifications</strong>
                  <p className="certifications-info">
                    This professional has verified professional certifications
                  </p>
                </div>
              )}

              <div className="rate-section">
                <div className="rate-header">💰 Rate</div>
                <div className="rate-content">
                  {!isAuthenticated ? (
                    <div className="rate-locked">
                      <a href="/login">Login</a> or <a href="/register">Register</a> to see rates
                    </div>
                  ) : worker.rate_type && worker.rate_amount ? (
                    <>
                      <div className="rate-amount">R{parseFloat(worker.rate_amount).toFixed(2)}</div>
                      <div className="rate-type">
                        {worker.rate_type === 'hourly' ? '⏱️ Per Hour' : '💵 Fixed Labour Fee'}
                      </div>
                      <div className="rate-disclaimer">
                        <strong>⚠️ Important:</strong> This rate is for labour only and does not include materials, parts, or consumables required for the job.
                      </div>
                    </>
                  ) : (
                    <div className="rate-not-set">Rate not set by professional</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="gallery-bottom-row">
            {gallery.length > 0 ? (
              gallery.map((photo, index) => (
                <div
                  key={index}
                  className="gallery-thumb"
                  onClick={() => viewPhoto(photo.photo_url, photo.description || 'Work example')}
                >
                  <img src={photo.photo_url} alt={photo.description || 'Work example'} loading="lazy" />
                </div>
              ))
            ) : (
              <div className="no-photos">No work photos available yet</div>
            )}
          </div>
        </article>

        <div className="action-buttons-container">
          <button className="btn-primary" onClick={handleContactClick}>
            📧 Contact {worker.name.split(' ')[0]}
          </button>
          <button className="btn-secondary" onClick={handleBookNowClick}>
            📅 Book Now
          </button>
        </div>

        {submitMessage && <div className="submit-message">{submitMessage}</div>}

        <div className="forms-container">
          <form
            id="contact-form-container"
            className={`form-container ${showContactForm ? 'show' : ''}`}
            onSubmit={handleContactSubmit}
          >
            <h4>📧 Send a Message</h4>
            <div>
              <label htmlFor="visitor-message">Your Message</label>
              <textarea
                id="visitor-message"
                placeholder="Tell the professional what you need help with..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary">📤 Send Message</button>
          </form>

          <form
            id="booking-form-container"
            className={`form-container ${showBookingForm ? 'show' : ''}`}
            onSubmit={handleBookingSubmit}
          >
            <h4>📅 Book an Appointment</h4>

            <div className="booking-notice">
              <p>
                <strong>⚠️ Important:</strong> Please message the professional first to check their availability before booking.
                This helps avoid disappointment if they're not available on your preferred date/time.
                Your booking will require professional approval.
              </p>
            </div>

            <div className="booking-datetime">
              <div>
                <label htmlFor="booking-date">📆 Date</label>
                <input
                  type="date"
                  id="booking-date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="booking-time">🕐 Time</label>
                <input
                  type="time"
                  id="booking-time"
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="booking-note">Additional Details (Optional)</label>
              <textarea
                id="booking-note"
                placeholder="Any specific requirements or notes for the professional..."
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary">✓ Submit Booking Request</button>
          </form>
        </div>

        <div className="profile-sections" id="reviews-section">
          <section className="section-outside-card">
            <h3>
              Customer Reviews
              <button className="reviews-refresh" onClick={() => loadReviews(workerId)}>
                ↻ Refresh
              </button>
            </h3>
            <div className="reviews-list">
              {reviews.length > 0 ? (
                <>
                  <div className="reviews-summary">
                    <h4>Customer Reviews Summary</h4>
                    <div className="reviews-summary-stats">
                      <div className="reviews-stat">
                        <div className="reviews-stat-number">{reviewCount}</div>
                        <div className="reviews-stat-label">Total Reviews</div>
                      </div>
                      <div className="reviews-stat">
                        <div className="reviews-stat-number">{rating}</div>
                        <div className="reviews-stat-label">Average Rating</div>
                      </div>
                    </div>
                  </div>

                  <div className="review-item">
                    <div className="review-header">
                      <span className="review-author">{reviews[0].client_name || 'Anonymous'}</span>
                      <span className="review-date">
                        {reviews[0].created_at ? new Date(reviews[0].created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="review-rating">
                      {'★'.repeat(reviews[0].overall_rating || 0)}
                      {'☆'.repeat(5 - (reviews[0].overall_rating || 0))}
                    </div>
                    {reviews[0].review_text && (
                      <div className="review-text">{reviews[0].review_text}</div>
                    )}
                    {reviews[0].photos && reviews[0].photos.length > 0 && (
                      <div className="review-photos">
                        {reviews[0].photos.map((photo, photoIndex) => (
                          <div
                            key={photoIndex}
                            className="review-photo-thumb"
                            onClick={() => viewPhoto(photo.photo_url || photo, 'Review photo')}
                          >
                            <img src={photo.photo_url || photo} alt="Review photo" loading="lazy" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {reviewCount > 1 && (
                    <button className="view-all-reviews-btn" onClick={() => setShowAllReviewsModal(true)}>
                      View All {reviewCount} Reviews
                    </button>
                  )}
                </>
              ) : isAuthenticated ? (
                <div className="no-reviews">
                  <div className="no-reviews-icon">⭐</div>
                  <p>No reviews yet</p>
                  <p>Be the first to review this professional!</p>
                </div>
              ) : (
                <div className="guest-reviews">
                  <p>Login to view reviews and ratings</p>
                  <button className="guest-login-btn" onClick={() => navigate('/login')}>
                    Login to View Reviews
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Safety Modal */}
      {showSafetyModal && (
        <div className="safety-modal show" onClick={() => setShowSafetyModal(false)}>
          <div className="safety-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <span style={{ fontSize: '2rem' }}>🛡️</span>
              <h2>Safety & Best Practices</h2>
            </div>
            <div className="safety-modal-body">
              <p className="safety-intro">
                Before booking, please review these important safety tips for a secure experience:
              </p>

              <div className="safety-tip">
                <div className="safety-tip-icon">💬</div>
                <div className="safety-tip-content">
                  <h3>Keep Communication on Platform</h3>
                  <p>Always message through Fixxa. Never share phone numbers, emails, or move conversations off-platform.</p>
                </div>
              </div>

              <div className="safety-tip">
                <div className="safety-tip-icon">💳</div>
                <div className="safety-tip-content">
                  <h3>Payment Safety Tips</h3>
                  <p>Always ask for a receipt. Use bank transfer when possible for a clear payment trail.</p>
                </div>
              </div>

              <div className="safety-tip">
                <div className="safety-tip-icon">🏠</div>
                <div className="safety-tip-content">
                  <h3>Meet in Safe Locations</h3>
                  <p>Ensure someone knows about your appointment. Consider having someone present during the service.</p>
                </div>
              </div>

              <div className="safety-tip">
                <div className="safety-tip-icon">✅</div>
                <div className="safety-tip-content">
                  <h3>Check Professional's Profile</h3>
                  <p>Review ratings, reviews, certifications, and verification status before booking.</p>
                </div>
              </div>

              <div className="safety-tip">
                <div className="safety-tip-icon">🚩</div>
                <div className="safety-tip-content">
                  <h3>Report Suspicious Behavior</h3>
                  <p>Report any inappropriate behavior or requests to pay outside the platform immediately.</p>
                </div>
              </div>
            </div>
            <div className="safety-modal-footer">
              <button className="btn-skip" onClick={() => setShowSafetyModal(false)}>Skip</button>
              <button className="btn-read-full" onClick={() => window.open('/safety.html', '_blank')}>
                Read Full Guide
              </button>
              <button className="btn-continue" onClick={handleContinueBooking}>
                I Understand, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Reviews Modal */}
      {showAllReviewsModal && (
        <div className="reviews-modal-overlay" onClick={() => setShowAllReviewsModal(false)}>
          <div className="reviews-modal" onClick={(e) => e.stopPropagation()}>
            <button className="reviews-modal-close" onClick={() => setShowAllReviewsModal(false)}>
              &times;
            </button>
            <h3>All Customer Reviews ({reviewCount})</h3>

            <div className="reviews-summary">
              <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                <strong>Average Rating: {rating}/5 ★</strong> ({reviewCount} reviews)
              </div>
            </div>

            <div className="reviews-modal-list">
              {reviews.map((review, index) => (
                <div key={index} className="review-item">
                  <div className="review-header">
                    <span className="review-author">{review.client_name || 'Anonymous'}</span>
                    <span className="review-date">
                      {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <div className="review-rating">
                    {'★'.repeat(review.overall_rating || 0)}
                    {'☆'.repeat(5 - (review.overall_rating || 0))}
                  </div>
                  {review.review_text && <div className="review-text">{review.review_text}</div>}
                  {review.photos && review.photos.length > 0 && (
                    <div className="review-photos">
                      {review.photos.map((photo, photoIndex) => (
                        <div
                          key={photoIndex}
                          className="review-photo-thumb"
                          onClick={() => viewPhoto(photo.photo_url || photo, 'Review photo')}
                        >
                          <img src={photo.photo_url || photo} alt="Review photo" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowAllReviewsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="reviews-modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div className="reviews-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <button className="reviews-modal-close" onClick={() => setShowPhotoModal(false)}>
              &times;
            </button>
            <img
              src={selectedPhoto.url}
              alt="Work example"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
            {selectedPhoto.caption && (
              <div style={{ textAlign: 'center', marginTop: '1rem', color: '#666', fontStyle: 'italic' }}>
                {selectedPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
