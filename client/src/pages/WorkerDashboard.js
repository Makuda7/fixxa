import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { workerAPI, certificationsAPI } from '../services/api';
import PortfolioGallery from '../components/PortfolioGallery';
import DashboardStats from '../components/DashboardStats';
import ProfileCompletionBanner from '../components/ProfileCompletionBanner';
import './WorkerDashboard.css';

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Profile data
  const [profile, setProfile] = useState(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileFormData, setProfileFormData] = useState({});

  // Certifications data
  const [certifications, setCertifications] = useState([]);
  const [uploadingCert, setUploadingCert] = useState(false);

  // Bookings data
  const [bookings, setBookings] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);

  // Reviews data
  const [reviews, setReviews] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingRequests: 0,
    completedJobs: 0,
    averageRating: 0,
    totalReviews: 0,
  });

  // Availability
  const [isAvailable, setIsAvailable] = useState(false);
  const [availabilitySchedule, setAvailabilitySchedule] = useState('weekdays');

  // Portfolio data
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchProfile(),
        fetchCertifications(),
        fetchBookings(),
        fetchReviews(),
      ]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch all data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchProfile = async () => {
    try {
      const response = await workerAPI.getProfile();
      if (response.data.success) {
        setProfile(response.data.profile);
        setProfileFormData(response.data.profile);
        setIsAvailable(response.data.profile.is_available || false);
        setAvailabilitySchedule(
          response.data.profile.availability_schedule?.type || 'weekdays'
        );
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchCertifications = async () => {
    try {
      const response = await certificationsAPI.getMyCertifications();
      if (response.data.success) {
        setCertifications(response.data.certifications || []);
      }
    } catch (err) {
      console.error('Error fetching certifications:', err);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await workerAPI.getBookings();
      if (response.data.success) {
        const allBookings = response.data.bookings || [];
        setBookings(allBookings);

        // Separate pending requests
        const pending = allBookings.filter((b) => b.status === 'pending');
        setBookingRequests(pending);

        // Calculate stats
        const totalBookings = allBookings.length;
        const pendingRequests = pending.length;
        const completedJobs = allBookings.filter(
          (b) => b.status === 'completed'
        ).length;

        setStats((prev) => ({
          ...prev,
          totalBookings,
          pendingRequests,
          completedJobs,
        }));
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/reviews?workerId=${user.id}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setReviews(data);
        const avgRating =
          data.length > 0
            ? data.reduce((sum, r) => sum + (r.overall_rating || 0), 0) /
              data.length
            : 0;
        setStats((prev) => ({
          ...prev,
          averageRating: avgRating.toFixed(1),
          totalReviews: data.length,
        }));
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const fetchPortfolioPhotos = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/workers/portfolio`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setPortfolioPhotos(data.photos || []);
      }
    } catch (err) {
      console.error('Error fetching portfolio photos:', err);
    }
  };

  const handlePortfolioUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/workers/upload-portfolio`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setPortfolioPhotos((prev) => [...prev, data.photo]);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading portfolio photo:', err);
      throw err;
    }
  };

  const handlePortfolioDelete = async (photoId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/workers/portfolio/${photoId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        setPortfolioPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Error deleting portfolio photo:', err);
      throw err;
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await workerAPI.updateProfile(profileFormData);
      if (response.data.success) {
        setProfile(response.data.profile);
        setProfileEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile');
    }
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCertificationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingCert(true);
    const formData = new FormData();
    formData.append('certification', file);
    formData.append('name', prompt('Enter certification name:'));
    formData.append('type', prompt('Enter certification type (e.g., License, Certificate):'));

    try {
      const response = await certificationsAPI.uploadCertification(formData);
      if (response.data.success) {
        alert('Certification uploaded successfully!');
        fetchCertifications();
      }
    } catch (err) {
      console.error('Error uploading certification:', err);
      alert('Failed to upload certification');
    } finally {
      setUploadingCert(false);
    }
  };

  const handleDeleteCertification = async (certId) => {
    if (!window.confirm('Are you sure you want to delete this certification?'))
      return;

    try {
      const response = await certificationsAPI.deleteCertification(certId);
      if (response.data.success) {
        alert('Certification deleted successfully');
        fetchCertifications();
      }
    } catch (err) {
      console.error('Error deleting certification:', err);
      alert('Failed to delete certification');
    }
  };

  const handleBookingAction = async (bookingId, action) => {
    const status = action === 'approve' ? 'confirmed' : 'declined';
    try {
      const response = await workerAPI.updateBookingStatus(bookingId, status);
      if (response.data.success) {
        alert(`Booking ${action === 'approve' ? 'approved' : 'declined'}!`);
        fetchBookings();
      }
    } catch (err) {
      console.error('Error updating booking:', err);
      alert('Failed to update booking');
    }
  };

  const handleAvailabilityToggle = async () => {
    const newAvailability = !isAvailable;
    setIsAvailable(newAvailability);

    try {
      await workerAPI.updateProfile({ is_available: newAvailability });
    } catch (err) {
      console.error('Error updating availability:', err);
      setIsAvailable(!newAvailability); // Revert on error
    }
  };

  const handleScheduleChange = async (e) => {
    const newSchedule = e.target.value;
    setAvailabilitySchedule(newSchedule);

    try {
      await workerAPI.updateProfile({
        availability_schedule: { type: newSchedule },
      });
    } catch (err) {
      console.error('Error updating schedule:', err);
    }
  };

  const viewCertification = (url) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Worker Dashboard</h1>
          <p>Welcome back, {profile?.name || user?.name}!</p>
        </div>
        <div className="header-right">
          <button className="btn-logout" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* Registration Completion Banner */}
      {profile && !profile.registration_complete && (
        <div className="registration-banner incomplete">
          <div className="banner-icon">⚠️</div>
          <div className="banner-content">
            <h3>Complete Your Registration</h3>
            <p>
              Finish setting up your profile to start receiving job requests.
              Add your documents, certifications, and references to build trust with clients.
            </p>
          </div>
          <button
            className="btn-complete-registration"
            onClick={() => window.location.href = '/complete-registration'}
          >
            Complete Registration →
          </button>
        </div>
      )}

      {/* Registration Complete Badge */}
      {profile && profile.registration_complete && (
        <div className="registration-banner complete">
          <div className="banner-icon">✅</div>
          <div className="banner-content">
            <h3>Registration Complete!</h3>
            <p>Your profile is fully set up and you're ready to receive job requests.</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={activeTab === 'certifications' ? 'active' : ''}
          onClick={() => setActiveTab('certifications')}
        >
          Certifications
          {certifications.filter((c) => c.status === 'pending').length > 0 && (
            <span className="badge">
              {certifications.filter((c) => c.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          className={activeTab === 'portfolio' ? 'active' : ''}
          onClick={() => {
            setActiveTab('portfolio');
            fetchPortfolioPhotos();
          }}
        >
          Portfolio
        </button>
        <button
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings
          {stats.pendingRequests > 0 && (
            <span className="badge">{stats.pendingRequests}</span>
          )}
        </button>
        <button
          className={activeTab === 'reviews' ? 'active' : ''}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
      </nav>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Profile Completion Banner */}
            <ProfileCompletionBanner
              profile={profile}
              certifications={certifications}
              portfolioPhotos={portfolioPhotos}
            />

            {/* Profile Summary Card */}
            <section className="profile-summary-card">
              <div className="profile-header">
                <div className="profile-image">
                  {profile?.image ? (
                    <img src={profile.image} alt={profile.name} />
                  ) : (
                    <div className="profile-placeholder">
                      {profile?.name?.charAt(0) || 'W'}
                    </div>
                  )}
                </div>
                <div className="profile-info">
                  <h2>{profile?.name || 'Worker Name'}</h2>
                  <p className="speciality">{profile?.speciality || 'Specialty'}</p>
                  <p className="location">
                    {profile?.primary_suburb || profile?.area},{' '}
                    {profile?.province}
                  </p>
                  <div className="profile-badges">
                    {profile?.is_verified && (
                      <span className="badge verified">Verified</span>
                    )}
                    {certifications.filter((c) => c.status === 'approved').length >
                      0 && <span className="badge certified">Certified</span>}
                  </div>
                </div>
              </div>

              {/* Availability Toggle */}
              <div className="availability-section">
                <h3>Availability Status</h3>
                <div className="availability-controls">
                  <button
                    className={`availability-toggle ${
                      isAvailable ? 'active' : ''
                    }`}
                    onClick={handleAvailabilityToggle}
                  >
                    {isAvailable ? 'Available for Work' : 'Not Available'}
                  </button>
                  <select
                    value={availabilitySchedule}
                    onChange={handleScheduleChange}
                  >
                    <option value="weekdays">Weekdays Only</option>
                    <option value="weekends">Weekends Only</option>
                    <option value="both">All Week</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Dashboard Statistics */}
            <section className="stats-section">
              <DashboardStats />
            </section>

            {/* Pending Booking Requests */}
            {bookingRequests.length > 0 && (
              <section className="requests-section">
                <h3>Pending Booking Requests ({bookingRequests.length})</h3>
                <div className="requests-list">
                  {bookingRequests.map((booking) => (
                    <div key={booking.id} className="request-card">
                      <div className="request-header">
                        <h4>{booking.client_name}</h4>
                        <span className="status-badge status-pending">
                          Pending
                        </span>
                      </div>
                      <p>
                        <strong>Date:</strong>{' '}
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                      <p>
                        <strong>Time:</strong> {booking.booking_time}
                      </p>
                      {booking.note && (
                        <p>
                          <strong>Note:</strong> {booking.note}
                        </p>
                      )}
                      <div className="request-actions">
                        <button
                          className="btn-approve"
                          onClick={() => handleBookingAction(booking.id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-decline"
                          onClick={() => handleBookingAction(booking.id, 'decline')}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Reviews */}
            {reviews.length > 0 && (
              <section className="recent-reviews-section">
                <h3>Recent Reviews</h3>
                <div className="reviews-preview">
                  {reviews.slice(0, 3).map((review) => (
                    <div key={review.id} className="review-card-mini">
                      <div className="review-header">
                        <strong>{review.client_name || 'Anonymous'}</strong>
                        <span className="rating">
                          {'★'.repeat(review.overall_rating || 0)}
                          {'☆'.repeat(5 - (review.overall_rating || 0))}
                        </span>
                      </div>
                      <p>{review.review_text}</p>
                      <small>
                        {new Date(review.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  ))}
                </div>
                <button
                  className="btn-view-all"
                  onClick={() => setActiveTab('reviews')}
                >
                  View All Reviews
                </button>
              </section>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <section className="profile-management">
              <div className="section-header">
                <h3>Profile Management</h3>
                {!profileEditing ? (
                  <button
                    className="btn-edit"
                    onClick={() => setProfileEditing(true)}
                  >
                    Edit Profile
                  </button>
                ) : (
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setProfileEditing(false);
                      setProfileFormData(profile);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profileFormData.name || ''}
                    onChange={handleProfileInputChange}
                    disabled={!profileEditing}
                  />
                </div>

                <div className="form-group">
                  <label>Speciality</label>
                  <input
                    type="text"
                    name="speciality"
                    value={profileFormData.speciality || ''}
                    onChange={handleProfileInputChange}
                    disabled={!profileEditing}
                  />
                </div>

                <div className="form-group">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    rows="4"
                    value={profileFormData.bio || ''}
                    onChange={handleProfileInputChange}
                    disabled={!profileEditing}
                  />
                </div>

                <div className="form-group">
                  <label>Years of Experience</label>
                  <input
                    type="number"
                    name="experience"
                    value={profileFormData.experience || ''}
                    onChange={handleProfileInputChange}
                    disabled={!profileEditing}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Primary Suburb</label>
                    <input
                      type="text"
                      name="primary_suburb"
                      value={profileFormData.primary_suburb || ''}
                      onChange={handleProfileInputChange}
                      disabled={!profileEditing}
                    />
                  </div>

                  <div className="form-group">
                    <label>Province</label>
                    <input
                      type="text"
                      name="province"
                      value={profileFormData.province || ''}
                      onChange={handleProfileInputChange}
                      disabled={!profileEditing}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileFormData.phone || ''}
                    onChange={handleProfileInputChange}
                    disabled={!profileEditing}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Rate Type</label>
                    <select
                      name="rate_type"
                      value={profileFormData.rate_type || 'hourly'}
                      onChange={handleProfileInputChange}
                      disabled={!profileEditing}
                    >
                      <option value="hourly">Hourly</option>
                      <option value="fixed">Fixed Fee</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Rate Amount (R)</label>
                    <input
                      type="number"
                      name="rate_amount"
                      value={profileFormData.rate_amount || ''}
                      onChange={handleProfileInputChange}
                      disabled={!profileEditing}
                    />
                  </div>
                </div>

                {profileEditing && (
                  <button type="submit" className="btn-save">
                    Save Changes
                  </button>
                )}
              </form>
            </section>
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === 'certifications' && (
          <div className="certifications-tab">
            <section className="certifications-management">
              <h3>Professional Certifications</h3>

              {/* Upload Section */}
              <div className="upload-section">
                <label className="upload-area">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleCertificationUpload}
                    disabled={uploadingCert}
                  />
                  <div className="upload-content">
                    <div className="upload-icon">📄</div>
                    <p>
                      {uploadingCert
                        ? 'Uploading...'
                        : 'Click to upload certification'}
                    </p>
                    <small>PDF, JPG, or PNG (Max 5MB)</small>
                  </div>
                </label>
              </div>

              {/* Certifications List */}
              <div className="certifications-list">
                {certifications.length === 0 ? (
                  <p className="no-data">No certifications uploaded yet</p>
                ) : (
                  certifications.map((cert) => (
                    <div
                      key={cert.id}
                      className={`cert-card ${cert.status}`}
                    >
                      <div className="cert-info">
                        <h4>{cert.name}</h4>
                        <p>{cert.type}</p>
                        <small>
                          Uploaded: {new Date(cert.uploaded_at).toLocaleDateString()}
                        </small>
                      </div>
                      <div className="cert-status-badge">
                        <span className={`status-badge status-${cert.status}`}>
                          {cert.status}
                        </span>
                      </div>
                      <div className="cert-actions">
                        <button
                          className="btn-view"
                          onClick={() => viewCertification(cert.file_url)}
                        >
                          View
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteCertification(cert.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bookings-tab">
            <section className="bookings-management">
              <h3>All Bookings</h3>

              {bookings.length === 0 ? (
                <p className="no-data">No bookings yet</p>
              ) : (
                <div className="bookings-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Client</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr
                          key={booking.id}
                          className={
                            booking.status === 'cancelled' ||
                            booking.status === 'declined'
                              ? 'cancelled-row'
                              : ''
                          }
                        >
                          <td>{booking.client_name}</td>
                          <td>
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </td>
                          <td>{booking.booking_time}</td>
                          <td>
                            <span
                              className={`status-badge status-${booking.status}`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td>
                            {booking.status === 'pending' && (
                              <div className="booking-actions">
                                <button
                                  className="btn-approve"
                                  onClick={() =>
                                    handleBookingAction(booking.id, 'approve')
                                  }
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn-decline"
                                  onClick={() =>
                                    handleBookingAction(booking.id, 'decline')
                                  }
                                >
                                  Decline
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="reviews-tab">
            <section className="reviews-section">
              <h3>Customer Reviews</h3>

              <div className="reviews-summary">
                <div className="summary-card">
                  <div className="summary-value">{stats.averageRating}</div>
                  <div className="summary-label">Average Rating</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{stats.totalReviews}</div>
                  <div className="summary-label">Total Reviews</div>
                </div>
              </div>

              {reviews.length === 0 ? (
                <p className="no-data">No reviews yet</p>
              ) : (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <strong>{review.client_name || 'Anonymous'}</strong>
                          <small>
                            {new Date(review.created_at).toLocaleDateString()}
                          </small>
                        </div>
                        <div className="review-rating">
                          <span className="stars">
                            {'★'.repeat(review.overall_rating || 0)}
                            {'☆'.repeat(5 - (review.overall_rating || 0))}
                          </span>
                          <span className="rating-value">
                            {review.overall_rating}/5
                          </span>
                        </div>
                      </div>

                      {review.review_text && (
                        <div className="review-text">{review.review_text}</div>
                      )}

                      {(review.quality_rating ||
                        review.punctuality_rating ||
                        review.communication_rating ||
                        review.value_rating) && (
                        <div className="review-categories">
                          {review.quality_rating && (
                            <div className="category">
                              <span className="category-label">Quality:</span>
                              <span className="category-rating">
                                {'★'.repeat(review.quality_rating)}
                                {'☆'.repeat(5 - review.quality_rating)}
                              </span>
                            </div>
                          )}
                          {review.punctuality_rating && (
                            <div className="category">
                              <span className="category-label">Punctuality:</span>
                              <span className="category-rating">
                                {'★'.repeat(review.punctuality_rating)}
                                {'☆'.repeat(5 - review.punctuality_rating)}
                              </span>
                            </div>
                          )}
                          {review.communication_rating && (
                            <div className="category">
                              <span className="category-label">
                                Communication:
                              </span>
                              <span className="category-rating">
                                {'★'.repeat(review.communication_rating)}
                                {'☆'.repeat(5 - review.communication_rating)}
                              </span>
                            </div>
                          )}
                          {review.value_rating && (
                            <div className="category">
                              <span className="category-label">Value:</span>
                              <span className="category-rating">
                                {'★'.repeat(review.value_rating)}
                                {'☆'.repeat(5 - review.value_rating)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div className="portfolio-tab">
            <PortfolioGallery
              photos={portfolioPhotos}
              onUpload={handlePortfolioUpload}
              onDelete={handlePortfolioDelete}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default WorkerDashboard;
