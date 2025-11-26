import React, { useState, useEffect } from 'react';
import './WorkerDetailsModal.css';

const WorkerDetailsModal = ({ worker, onClose, onApprove, onReject, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorker, setEditedWorker] = useState({});
  const [certifications, setCertifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (worker) {
      setEditedWorker({ ...worker });
      loadWorkerDetails();
    }
  }, [worker]);

  const loadWorkerDetails = async () => {
    setLoading(true);
    try {
      // Load certifications
      const certRes = await fetch(`/admin/workers/${worker.id}/certifications`, {
        credentials: 'include'
      });
      if (certRes.ok) {
        const certData = await certRes.json();
        setCertifications(certData.certifications || []);
      }

      // Load reviews
      const reviewRes = await fetch(`/admin/workers/${worker.id}/reviews`, {
        credentials: 'include'
      });
      if (reviewRes.ok) {
        const reviewData = await reviewRes.json();
        setReviews(reviewData.reviews || []);
      }

      // Load bookings
      const bookingRes = await fetch(`/admin/workers/${worker.id}/bookings`, {
        credentials: 'include'
      });
      if (bookingRes.ok) {
        const bookingData = await bookingRes.json();
        setBookings(bookingData.bookings || []);
      }
    } catch (error) {
      console.error('Failed to load worker details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedWorker(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedWorker);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedWorker({ ...worker });
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      approved: { label: 'Approved', class: 'approved' },
      pending: { label: 'Pending', class: 'pending' },
      rejected: { label: 'Rejected', class: 'rejected' },
      verified: { label: 'Verified', class: 'verified' },
      unverified: { label: 'Unverified', class: 'unverified' }
    };
    const statusInfo = statusMap[status] || { label: status, class: '' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  if (!worker) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="worker-details-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="header-content">
            <div className="worker-avatar">
              {worker.profile_image ? (
                <img src={worker.profile_image} alt={worker.name} />
              ) : (
                <div className="avatar-placeholder">
                  {worker.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="header-info">
              <h2>{worker.name}</h2>
              <p className="worker-specialty">{worker.speciality || 'No specialty'}</p>
              <div className="worker-badges">
                {getStatusBadge(worker.approval_status)}
                {worker.is_verified && getStatusBadge('verified')}
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Information
          </button>
          <button
            className={`tab-btn ${activeTab === 'certifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('certifications')}
          >
            Certifications ({certifications.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews ({reviews.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Bookings ({bookings.length})
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {activeTab === 'info' && (
            <div className="info-tab">
              <div className="info-section">
                <div className="section-header">
                  <h3>Personal Information</h3>
                  {!isEditing && (
                    <button className="edit-btn" onClick={() => setIsEditing(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="name"
                        value={editedWorker.name || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p>{worker.name}</p>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="email"
                        value={editedWorker.email || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p>{worker.email}</p>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={editedWorker.phone || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p>{worker.phone || 'N/A'}</p>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Specialty</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="speciality"
                        value={editedWorker.speciality || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p>{worker.speciality || 'N/A'}</p>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Location</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="location"
                        value={editedWorker.location || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p>{worker.location || 'N/A'}</p>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Hourly Rate</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="rate"
                        value={editedWorker.rate || ''}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <p>{worker.rate ? `R${worker.rate}/hr` : 'N/A'}</p>
                    )}
                  </div>
                  <div className="info-item">
                    <label>Joined</label>
                    <p>{formatDate(worker.created_at)}</p>
                  </div>
                  <div className="info-item">
                    <label>Last Updated</label>
                    <p>{formatDate(worker.updated_at)}</p>
                  </div>
                </div>

                {isEditing && (
                  <div className="edit-actions">
                    <button className="btn-save" onClick={handleSave}>Save Changes</button>
                    <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                  </div>
                )}
              </div>

              {worker.description && (
                <div className="info-section">
                  <h3>Description</h3>
                  <p className="description-text">{worker.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'certifications' && (
            <div className="certifications-tab">
              {loading ? (
                <div className="loading-state">Loading certifications...</div>
              ) : certifications.length === 0 ? (
                <div className="empty-state">No certifications found</div>
              ) : (
                <div className="certifications-list">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="certification-card">
                      <div className="cert-info">
                        <h4>{cert.document_name}</h4>
                        <p className="cert-meta">
                          Uploaded: {formatDate(cert.uploaded_at)}
                        </p>
                      </div>
                      <div className="cert-actions">
                        {getStatusBadge(cert.status)}
                        {cert.document_url && (
                          <a
                            href={cert.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-link"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-tab">
              {loading ? (
                <div className="loading-state">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="empty-state">No reviews yet</div>
              ) : (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-card">
                      <div className="review-header">
                        <div className="review-rating">
                          {'★'.repeat(review.rating)}
                          {'☆'.repeat(5 - review.rating)}
                        </div>
                        <span className="review-date">{formatDate(review.created_at)}</span>
                      </div>
                      {review.comment && (
                        <p className="review-comment">{review.comment}</p>
                      )}
                      <p className="review-client">- {review.client_name || 'Anonymous'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bookings-tab">
              {loading ? (
                <div className="loading-state">Loading bookings...</div>
              ) : bookings.length === 0 ? (
                <div className="empty-state">No bookings found</div>
              ) : (
                <div className="bookings-list">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-info">
                        <h4>{booking.service_type}</h4>
                        <p className="booking-client">Client: {booking.client_name}</p>
                        <p className="booking-date">Date: {formatDate(booking.booking_date)}</p>
                      </div>
                      <div className="booking-status">
                        {getStatusBadge(booking.status)}
                        {booking.total_price && (
                          <span className="booking-price">R{booking.total_price}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          {worker.approval_status === 'pending' && (
            <>
              <button className="btn-approve" onClick={() => onApprove(worker)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Approve Worker
              </button>
              <button className="btn-reject" onClick={() => onReject(worker)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reject Worker
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDetailsModal;
