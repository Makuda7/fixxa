import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import StarRating from '../components/StarRating';
import Toast from '../components/Toast';
import FileUpload from '../components/FileUpload';
import io from 'socket.io-client';
import './ClientDashboard.css';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [completionRequests, setCompletionRequests] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [approvalRating, setApprovalRating] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showEditReviewModal, setShowEditReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRatings, setReviewRatings] = useState({
    overall: 0,
    quality: 0,
    punctuality: 0,
    communication: 0,
    value: 0
  });
  const [toasts, setToasts] = useState([]);

  // Phase 5: Advanced features
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showNewReviewModal, setShowNewReviewModal] = useState(false);
  const [serviceAddress, setServiceAddress] = useState('');
  const [submittingAddress, setSubmittingAddress] = useState(false);
  const [showRejectQuoteModal, setShowRejectQuoteModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [quoteRejectionReason, setQuoteRejectionReason] = useState('');
  const [submittingQuoteAction, setSubmittingQuoteAction] = useState(false);
  const [reviewPhotos, setReviewPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [recentInquiries, setRecentInquiries] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Socket.io connection for real-time updates
  useEffect(() => {
    if (!user) return;

    // Connect to Socket.io server
    const socketUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    socketRef.current = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    // Join client room
    socket.on('connect', () => {
      console.log('Socket.io connected');
      socket.emit('join', { userId: user.id, userType: 'client' });
    });

    // Listen for new messages
    socket.on('newMessage', (data) => {
      console.log('New message received:', data);
      showToast(`New message from ${data.senderName}`, 'info');
      fetchUnreadCount();
    });

    // Listen for booking updates
    socket.on('bookingUpdate', (data) => {
      console.log('Booking update:', data);
      showToast(`Booking ${data.status}: ${data.message}`, 'info');
      fetchBookings();
    });

    // Listen for new completion requests
    socket.on('newCompletionRequest', (data) => {
      console.log('New completion request:', data);
      showToast(`${data.workerName} has submitted a completion request`, 'success');
      fetchCompletionRequests();
      fetchBookings();
    });

    // Listen for quote updates
    socket.on('quoteUpdate', (data) => {
      console.log('Quote update:', data);
      showToast(`Quote received: R${data.amount}`, 'info');
      fetchBookings();
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchBookings(),
        fetchUnreadCount(),
        fetchCompletionRequests(),
        fetchReviews(),
        fetchRecentInquiries()
      ]);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      setBookings(response.data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/messages/client/unread-count');
      setUnreadCount(response.data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
      // Silently fail - endpoint may not exist
    }
  };

  const fetchCompletionRequests = async () => {
    try {
      const response = await api.get('/completion/client/completion-requests');
      setCompletionRequests(response.data.requests || []);
    } catch (err) {
      console.error('Failed to fetch completion requests:', err);
      // Silently fail - endpoint may not exist yet
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews/my-reviews');
      setReviews(response.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      // Silently fail - endpoint may not exist yet
    }
  };

  const fetchRecentInquiries = async () => {
    try {
      const response = await api.get('/messages');
      const messages = response.data || [];

      // Group messages by professional
      const conversations = {};
      messages.forEach(msg => {
        const key = msg.professional_id || 'unknown';
        if (!conversations[key]) {
          conversations[key] = {
            professional_id: msg.professional_id,
            professional_name: msg.professional_name || 'Professional',
            messages: []
          };
        }
        conversations[key].messages.push(msg);
      });

      // Convert to array and get last 3 messages for each conversation
      const conversationsArray = Object.values(conversations).map(conv => ({
        ...conv,
        recentMessages: conv.messages.slice(-3)
      }));

      setRecentInquiries(conversationsArray);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      // Silently fail - not critical
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled',
      'reschedule_pending': 'status-reschedule',
      'cancellation_pending': 'status-cancellation'
    };
    return statusMap[status?.toLowerCase()] || 'status-default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  const handleOpenApprovalModal = (request) => {
    setSelectedRequest(request);
    setApprovalRating(0);
    setShowApprovalModal(true);
  };

  const handleOpenRejectionModal = (request) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const handleOpenPhotoModal = (photos, index = 0) => {
    setSelectedPhotos(photos);
    setCurrentPhotoIndex(index);
    setShowPhotoModal(true);
  };

  const handleApproveCompletion = async () => {
    if (approvalRating === 0) {
      alert('Please provide a rating before approving');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/completion/client/completion-requests/${selectedRequest.id}/respond`, {
        action: 'approve',
        rating: approvalRating,
        comments: '' // Optional comments
      });

      setShowApprovalModal(false);
      setSelectedRequest(null);
      setApprovalRating(0);
      showToast('Job completion approved successfully!', 'success');

      // Refresh data
      await fetchCompletionRequests();
      await fetchBookings();
      await fetchReviews();
    } catch (err) {
      console.error('Failed to approve completion:', err);
      alert('Failed to approve completion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectCompletion = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    if (rejectionReason.length < 10) {
      alert('Please provide more detailed feedback (at least 10 characters)');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/completion/client/completion-requests/${selectedRequest.id}/respond`, {
        action: 'reject',
        feedback: rejectionReason
      });

      setShowRejectionModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      showToast('Feedback sent to professional', 'info');

      // Refresh data
      await fetchCompletionRequests();
      await fetchBookings();
    } catch (err) {
      console.error('Failed to reject completion:', err);
      alert('Failed to reject completion. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModals = () => {
    setShowApprovalModal(false);
    setShowRejectionModal(false);
    setShowPhotoModal(false);
    setSelectedRequest(null);
    setSelectedPhotos([]);
    setCurrentPhotoIndex(0);
    setApprovalRating(0);
    setRejectionReason('');
  };

  const handleNextPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev < selectedPhotos.length - 1 ? prev + 1 : 0
    );
  };

  const handlePrevPhoto = () => {
    setCurrentPhotoIndex((prev) =>
      prev > 0 ? prev - 1 : selectedPhotos.length - 1
    );
  };

  const handleOpenEditReview = (review) => {
    setSelectedReview(review);
    setReviewText(review.review_text || '');
    setReviewRatings({
      overall: review.overall_rating || 0,
      quality: review.quality_rating || 0,
      punctuality: review.punctuality_rating || 0,
      communication: review.communication_rating || 0,
      value: review.value_rating || 0
    });
    setReviewPhotos(review.photos || []);
    setShowEditReviewModal(true);
  };

  const handleUpdateReview = async () => {
    if (!reviewText.trim()) {
      alert('Please provide a review comment');
      return;
    }

    if (reviewRatings.overall === 0) {
      alert('Please provide an overall rating');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/reviews/${selectedReview.id}`, {
        review_text: reviewText,
        overall_rating: reviewRatings.overall,
        quality_rating: reviewRatings.quality,
        punctuality_rating: reviewRatings.punctuality,
        communication_rating: reviewRatings.communication,
        value_rating: reviewRatings.value
      });

      setShowEditReviewModal(false);
      setSelectedReview(null);
      setReviewText('');
      setReviewRatings({
        overall: 0,
        quality: 0,
        punctuality: 0,
        communication: 0,
        value: 0
      });

      // Refresh reviews
      await fetchReviews();
    } catch (err) {
      console.error('Failed to update review:', err);
      alert('Failed to update review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseReviewModal = () => {
    setShowEditReviewModal(false);
    setSelectedReview(null);
    setReviewText('');
    setReviewRatings({
      overall: 0,
      quality: 0,
      punctuality: 0,
      communication: 0,
      value: 0
    });
    setReviewPhotos([]);
  };

  const handleAddPhotoClick = () => {
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedReview) {
      showToast('No review selected', 'error');
      return;
    }

    // Validate photo count
    if (reviewPhotos.length >= 5) {
      showToast('Maximum 5 photos allowed', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await api.post(`/reviews/${selectedReview.id}/upload-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        showToast('Photo added successfully', 'success');
        setReviewPhotos(response.data.allPhotos || []);
        // Update selectedReview with new photos
        setSelectedReview({
          ...selectedReview,
          photos: response.data.allPhotos || []
        });
      } else {
        showToast(response.data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error('Failed to upload photo:', err);
      showToast(err.response?.data?.error || 'Error uploading photo', 'error');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async (photoUrl) => {
    if (!selectedReview) return;
    if (!window.confirm('Remove this photo?')) return;

    try {
      const response = await api.delete(`/reviews/${selectedReview.id}/photos`, {
        data: { photoUrl }
      });

      if (response.data.success) {
        showToast('Photo removed', 'success');
        setReviewPhotos(response.data.photos || []);
        // Update selectedReview with remaining photos
        setSelectedReview({
          ...selectedReview,
          photos: response.data.photos || []
        });
      } else {
        showToast(response.data.error || 'Failed to remove photo', 'error');
      }
    } catch (err) {
      console.error('Failed to remove photo:', err);
      showToast(err.response?.data?.error || 'Error removing photo', 'error');
    }
  };

  // Phase 5: Booking details and actions
  const handleOpenBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setServiceAddress(''); // Reset address field when opening modal
    setShowBookingDetailsModal(true);
  };

  const handleCloseBookingDetails = () => {
    setShowBookingDetailsModal(false);
    setSelectedBooking(null);
  };

  const handleOpenCancelModal = (booking) => {
    setSelectedBooking(booking);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      showToast('Please provide a cancellation reason', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.delete(`/bookings/${selectedBooking.id}`);

      showToast('Booking cancelled successfully', 'success');
      setShowCancelModal(false);
      setCancelReason('');
      await fetchBookings();
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      const errorMsg = err.response?.data?.error || 'Failed to cancel booking';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRescheduleModal = (booking) => {
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

    setSubmitting(true);
    try {
      await api.post(`/bookings/${selectedBooking.id}/reschedule`, {
        bookingDate: rescheduleDate,
        bookingTime: rescheduleTime,
        reason: rescheduleReason
      });

      showToast('Reschedule request submitted successfully', 'success');
      setShowRescheduleModal(false);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      await fetchBookings();
    } catch (err) {
      console.error('Failed to reschedule booking:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit reschedule request';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseAllModals = () => {
    setShowCancelModal(false);
    setShowRescheduleModal(false);
    setShowBookingDetailsModal(false);
    setShowNewReviewModal(false);
    setSelectedBooking(null);
    setCancelReason('');
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleReason('');
  };

  const handleOpenNewReviewModal = (booking) => {
    setSelectedBooking(booking);
    setReviewText('');
    setReviewRatings({
      overall: 0,
      quality: 0,
      punctuality: 0,
      communication: 0,
      value: 0
    });
    setShowNewReviewModal(true);
    setShowBookingDetailsModal(false);
  };

  const handleSubmitNewReview = async () => {
    if (!reviewText.trim()) {
      showToast('Please write a review', 'error');
      return;
    }

    if (reviewRatings.overall === 0) {
      showToast('Please provide an overall rating', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/reviews/${selectedBooking.worker_id}/bookings/${selectedBooking.id}`, {
        review_text: reviewText,
        overall_rating: reviewRatings.overall,
        quality_rating: reviewRatings.quality,
        punctuality_rating: reviewRatings.punctuality,
        communication_rating: reviewRatings.communication,
        value_rating: reviewRatings.value
      });

      showToast('Review submitted successfully!', 'success');
      setShowNewReviewModal(false);
      setReviewText('');
      setReviewRatings({
        overall: 0,
        quality: 0,
        punctuality: 0,
        communication: 0,
        value: 0
      });
      await fetchReviews();
    } catch (err) {
      console.error('Failed to submit review:', err);
      showToast(err.response?.data?.error || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitServiceAddress = async () => {
    if (!serviceAddress.trim()) {
      showToast('Please enter your service address', 'error');
      return;
    }

    if (serviceAddress.length < 10) {
      showToast('Please provide a complete address with street, suburb, and city', 'error');
      return;
    }

    setSubmittingAddress(true);
    try {
      await api.post(`/bookings/${selectedBooking.id}/submit-address`, {
        service_address: serviceAddress
      });

      showToast('✅ Service address shared with professional!', 'success');
      setServiceAddress('');

      // Refresh bookings to show updated address
      await fetchBookings();

      // Update selectedBooking with new address
      setSelectedBooking({
        ...selectedBooking,
        service_address: serviceAddress,
        service_address_provided_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to submit address:', err);
      showToast(err.response?.data?.error || 'Failed to submit address', 'error');
    } finally {
      setSubmittingAddress(false);
    }
  };

  const handleAcceptQuote = async (quote, booking) => {
    if (!window.confirm('Accept this quote? The job will be confirmed.')) {
      return;
    }

    setSubmittingQuoteAction(true);
    try {
      const response = await api.post(`/quotes/${quote.id}/accept`);

      if (response.data.success) {
        showToast('✅ Quote accepted! Booking confirmed.', 'success');

        // Refresh bookings to show updated quote status
        await fetchBookings();

        // Update selectedBooking if modal is open
        if (selectedBooking && selectedBooking.id === booking.id) {
          setSelectedBooking({
            ...selectedBooking,
            quote: {
              ...quote,
              status: 'accepted'
            },
            status: 'confirmed'
          });
        }
      } else {
        showToast(response.data.error || 'Failed to accept quote', 'error');
      }
    } catch (err) {
      console.error('Failed to accept quote:', err);
      showToast(err.response?.data?.error || 'Failed to accept quote', 'error');
    } finally {
      setSubmittingQuoteAction(false);
    }
  };

  const handleOpenRejectQuoteModal = (quote, booking) => {
    setSelectedQuote({ quote, booking });
    setQuoteRejectionReason('');
    setShowRejectQuoteModal(true);
  };

  const handleRejectQuote = async () => {
    if (!quoteRejectionReason.trim()) {
      showToast('Please provide a reason for declining the quote', 'error');
      return;
    }

    setSubmittingQuoteAction(true);
    try {
      const response = await api.post(`/quotes/${selectedQuote.quote.id}/reject`, {
        reason: quoteRejectionReason
      });

      if (response.data.success) {
        showToast('Quote declined', 'success');

        // Refresh bookings to show updated quote status
        await fetchBookings();

        // Update selectedBooking if modal is open
        if (selectedBooking && selectedBooking.id === selectedQuote.booking.id) {
          setSelectedBooking({
            ...selectedBooking,
            quote: {
              ...selectedQuote.quote,
              status: 'rejected'
            }
          });
        }

        // Close modal
        setShowRejectQuoteModal(false);
        setSelectedQuote(null);
        setQuoteRejectionReason('');
      } else {
        showToast(response.data.error || 'Failed to decline quote', 'error');
      }
    } catch (err) {
      console.error('Failed to reject quote:', err);
      showToast(err.response?.data?.error || 'Failed to decline quote', 'error');
    } finally {
      setSubmittingQuoteAction(false);
    }
  };

  const handleCloseRejectQuoteModal = () => {
    setShowRejectQuoteModal(false);
    setSelectedQuote(null);
    setQuoteRejectionReason('');
  };

  if (loading) {
    return (
      <div className="client-dashboard">
        <div className="loading-container">
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-info">
          <div className="profile-avatar">
            <img
              src={user?.profile_picture || '/images/default-profile.svg'}
              alt={user?.name}
              onError={(e) => e.target.src = '/images/default-profile.svg'}
            />
          </div>
          <div className="profile-details">
            <h2>Welcome, {user?.name}</h2>
            <p className="profile-email">{user?.email}</p>
            <p className="member-since">Member since {formatDate(user?.created_at)}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      {/* Dashboard Tiles */}
      <div className="tiles-container">
        <Link to="/messages" className="tile">
          <span className="tile-icon">💬</span>
          <h3>Messages</h3>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </Link>

        <Link to="/settings" className="tile">
          <span className="tile-icon">⚙️</span>
          <h3>Settings</h3>
        </Link>

        <Link to="/job-history" className="tile">
          <span className="tile-icon">📋</span>
          <h3>Job History</h3>
        </Link>

        <div className="tile tile-disabled">
          <span className="tile-icon">⭐</span>
          <h3>Reviews</h3>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Completion Requests Section */}
      {completionRequests.length > 0 && (
        <div className="completion-requests-section">
          <h3>Job Completion Approvals</h3>
          <p className="section-subtitle">
            Review and approve completed work from your professionals
          </p>
          <div className="completion-requests-list">
            {completionRequests.map((request) => (
              <div key={request.id} className="completion-request-card">
                <div className="completion-header">
                  <div className="completion-title">
                    <h4>{request.service_type || 'Service Completion'}</h4>
                    <p className="worker-name">Completed by {request.worker_name}</p>
                  </div>
                  <span className="completion-date">
                    {formatDate(request.completion_date)}
                  </span>
                </div>

                {request.completion_notes && (
                  <div className="completion-notes">
                    <strong>Worker's Notes:</strong>
                    <p>{request.completion_notes}</p>
                  </div>
                )}

                {request.completion_photos && request.completion_photos.length > 0 && (
                  <div className="completion-photos">
                    <strong>Completion Photos:</strong>
                    <div className="photo-grid">
                      {request.completion_photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Completion ${index + 1}`}
                          onClick={() => handleOpenPhotoModal(request.completion_photos, index)}
                          className="completion-photo-thumbnail"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="completion-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleOpenApprovalModal(request)}
                  >
                    ✓ Approve & Rate
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleOpenRejectionModal(request)}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings Section */}
      <div className="bookings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Recent Bookings</h3>
          {bookings.length > 3 && (
            <Link to="/job-history" style={{ color: 'var(--fixxa-primary)', textDecoration: 'none', fontWeight: 600 }}>
              View All ({bookings.length})
            </Link>
          )}
        </div>
        {bookings.length === 0 ? (
          <div className="empty-state">
            <p>You haven't made any bookings yet.</p>
            <Link to="/service" className="btn-primary">
              Find a Professional
            </Link>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.slice(0, 3).map((booking) => {
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
                    <span className="label">Date:</span>
                    <span className="value">{formatDate(booking.booking_date)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Time:</span>
                    <span className="value">{formatTime(booking.booking_time)}</span>
                  </div>
                  {booking.booking_amount && (
                    <div className="detail-row">
                      <span className="label">Amount:</span>
                      <span className="value">R {booking.booking_amount}</span>
                    </div>
                  )}
                  {booking.description && (
                    <div className="detail-row">
                      <span className="label">Description:</span>
                      <span className="value">{booking.description}</span>
                    </div>
                  )}
                </div>

                {/* Address Required Alert */}
                {(booking.status === 'confirmed' || booking.status === 'Confirmed') && !booking.service_address && (
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    marginTop: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>📍</span>
                    <span style={{ fontSize: '0.9rem', color: '#856404', fontWeight: 500 }}>
                      Service address required - Click "View Details" to provide
                    </span>
                  </div>
                )}

                {/* Quote Display */}
                {booking.quote && (
                  <div style={{
                    background: booking.quote.status === 'pending' ? '#e3f2fd' : booking.quote.status === 'accepted' ? '#d4edda' : '#f8d7da',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginTop: '0.75rem',
                    borderLeft: `4px solid ${booking.quote.status === 'pending' ? '#2196F3' : booking.quote.status === 'accepted' ? '#28a745' : '#dc3545'}`
                  }}>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      color: booking.quote.status === 'pending' ? '#0d47a1' : booking.quote.status === 'accepted' ? '#155724' : '#721c24',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      💰 Quote {booking.quote.status === 'accepted' ? 'Accepted' : booking.quote.status === 'rejected' ? 'Declined' : 'Received'}
                    </h4>

                    {/* Line Items */}
                    {booking.quote.line_items && Array.isArray(booking.quote.line_items) && booking.quote.line_items.length > 0 && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        {booking.quote.line_items.map((item, index) => (
                          <div key={index} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.3rem',
                            fontSize: '0.9rem'
                          }}>
                            <span>{item.description}</span>
                            <span><strong>R {parseFloat(item.amount).toFixed(2)}</strong></span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Total */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '0.5rem',
                      marginTop: '0.5rem',
                      borderTop: `2px solid ${booking.quote.status === 'pending' ? '#2196F3' : booking.quote.status === 'accepted' ? '#28a745' : '#dc3545'}`,
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}>
                      <span>Total:</span>
                      <span>R {parseFloat(booking.quote.total_amount).toFixed(2)}</span>
                    </div>

                    {/* Payment Methods */}
                    {booking.quote.payment_methods && booking.quote.payment_methods.length > 0 && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                        <strong>Payment:</strong> {booking.quote.payment_methods.map(pm => pm.toUpperCase()).join(', ')}
                      </p>
                    )}

                    {/* Notes */}
                    {booking.quote.notes && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        "{booking.quote.notes}"
                      </p>
                    )}

                    {/* Valid Until */}
                    {booking.quote.status === 'pending' && booking.quote.valid_until && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                        Valid until: {formatDate(booking.quote.valid_until)}
                      </p>
                    )}

                    {/* Quote Actions */}
                    {booking.quote.status === 'pending' && (
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        marginTop: '0.75rem'
                      }}>
                        <button
                          onClick={() => handleAcceptQuote(booking.quote, booking)}
                          disabled={submittingQuoteAction}
                          style={{
                            flex: 1,
                            padding: '0.5rem 1rem',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: submittingQuoteAction ? 'not-allowed' : 'pointer',
                            opacity: submittingQuoteAction ? 0.6 : 1
                          }}
                        >
                          ✅ Accept Quote
                        </button>
                        <button
                          onClick={() => handleOpenRejectQuoteModal(booking.quote, booking)}
                          disabled={submittingQuoteAction}
                          style={{
                            flex: 1,
                            padding: '0.5rem 1rem',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: submittingQuoteAction ? 'not-allowed' : 'pointer',
                            opacity: submittingQuoteAction ? 0.6 : 1
                          }}
                        >
                          ❌ Decline Quote
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Actions */}
                <div className="booking-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => handleOpenBookingDetails(booking)}
                  >
                    View Details
                  </button>

                  {(booking.status === 'pending' || booking.status === 'confirmed') && (
                    <>
                      <button
                        className="btn-warning"
                        onClick={() => handleOpenRescheduleModal(booking)}
                      >
                        Reschedule
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleOpenCancelModal(booking)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <div className="reviews-section">
          <h3>Your Reviews</h3>
          <p className="section-subtitle">
            Manage and edit your reviews for completed services
          </p>
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="review-title">
                    <h4>{review.service_type || 'Service Review'}</h4>
                    <p className="worker-name">Review for {review.worker_name}</p>
                  </div>
                  <div className="review-meta">
                    <StarRating
                      rating={review.overall_rating}
                      readonly={true}
                      size="small"
                      showValue={true}
                    />
                    <span className="review-date">{formatDate(review.created_at)}</span>
                  </div>
                </div>

                <div className="review-text">
                  <p>{review.review_text}</p>
                </div>

                {(review.quality_rating || review.punctuality_rating || review.communication_rating || review.value_rating) && (
                  <div className="review-breakdown">
                    <strong>Detailed Ratings:</strong>
                    <div className="rating-breakdown-grid">
                      {review.quality_rating > 0 && (
                        <div className="breakdown-item">
                          <StarRating
                            rating={review.quality_rating}
                            readonly={true}
                            size="small"
                            label="Quality:"
                          />
                        </div>
                      )}
                      {review.punctuality_rating > 0 && (
                        <div className="breakdown-item">
                          <StarRating
                            rating={review.punctuality_rating}
                            readonly={true}
                            size="small"
                            label="Punctuality:"
                          />
                        </div>
                      )}
                      {review.communication_rating > 0 && (
                        <div className="breakdown-item">
                          <StarRating
                            rating={review.communication_rating}
                            readonly={true}
                            size="small"
                            label="Communication:"
                          />
                        </div>
                      )}
                      {review.value_rating > 0 && (
                        <div className="breakdown-item">
                          <StarRating
                            rating={review.value_rating}
                            readonly={true}
                            size="small"
                            label="Value:"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="review-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => handleOpenEditReview(review)}
                  >
                    ✎ Edit Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Inquiries Section */}
      <div className="inquiries-section" style={{ marginTop: '2rem' }}>
        <h3>Your Recent Inquiries</h3>
        <p className="section-subtitle">
          Recent conversations with professionals
        </p>
        <div className="inquiries-list">
          {recentInquiries.length > 0 ? (
            recentInquiries.map((conversation, index) => (
              <div
                key={conversation.professional_id || index}
                className="conversation-group"
                style={{
                  marginBottom: '1.5rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '1rem',
                  background: '#fafafa'
                }}
              >
                <h4 style={{ margin: '0 0 0.5rem', color: 'forestgreen' }}>
                  Conversation with {conversation.professional_name}
                </h4>
                <div className="messages-container" style={{ marginBottom: '1rem' }}>
                  {conversation.recentMessages.map((msg, msgIndex) => (
                    <div
                      key={msgIndex}
                      className={`inquiry-card ${msg.sender_type === 'client' ? 'client' : 'professional'}`}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        borderRadius: '6px',
                        background: msg.sender_type === 'client' ? '#e3f2fd' : '#f1f8e9',
                        borderLeft: `4px solid ${msg.sender_type === 'client' ? '#2196F3' : '#8bc34a'}`
                      }}
                    >
                      <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>
                        {msg.sender_type === 'client' ? 'You' : conversation.professional_name}:
                      </p>
                      <p style={{ margin: '0 0 0.25rem' }}>{msg.content}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#666' }}>
                        <small>{formatDate(msg.created_at)}</small>
                      </p>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <button
                    className="btn-primary"
                    onClick={() => navigate('/messages')}
                    style={{
                      background: 'forestgreen',
                      color: 'white',
                      textDecoration: 'none',
                      padding: '0.5rem 1.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Continue Conversation
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <p>No inquiries yet.</p>
              <p>Browse our services and connect with professionals to get started!</p>
              <button
                className="btn-primary"
                onClick={() => navigate('/')}
                style={{
                  background: 'forestgreen',
                  color: 'white',
                  marginTop: '1rem',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Find Services
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Approve Job Completion</h3>
              <button className="modal-close" onClick={handleCloseModals}>×</button>
            </div>
            <div className="modal-body">
              <div className="approval-details">
                <p><strong>Service:</strong> {selectedRequest.service_type}</p>
                <p><strong>Worker:</strong> {selectedRequest.worker_name}</p>
                <p><strong>Completed:</strong> {formatDate(selectedRequest.completion_date)}</p>
              </div>

              <div className="rating-section">
                <h4>How would you rate this service?</h4>
                <StarRating
                  rating={approvalRating}
                  onRatingChange={setApprovalRating}
                  size="large"
                  showValue={true}
                />
                <p className="rating-hint">
                  Your rating helps other clients find quality professionals
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCloseModals}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-approve"
                onClick={handleApproveCompletion}
                disabled={submitting || approvalRating === 0}
              >
                {submitting ? 'Approving...' : 'Approve & Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedRequest && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reject Job Completion</h3>
              <button className="modal-close" onClick={handleCloseModals}>×</button>
            </div>
            <div className="modal-body">
              <div className="rejection-details">
                <p><strong>Service:</strong> {selectedRequest.service_type}</p>
                <p><strong>Worker:</strong> {selectedRequest.worker_name}</p>
              </div>

              <div className="feedback-section">
                <h4>Please explain why you're rejecting this completion:</h4>
                <textarea
                  className="feedback-textarea"
                  placeholder="Describe what needs to be fixed or improved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={5}
                  disabled={submitting}
                />
                <p className="feedback-hint">
                  Your feedback will be sent to the worker so they can address the issues
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCloseModals}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-reject"
                onClick={handleRejectCompletion}
                disabled={submitting || !rejectionReason.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {showPhotoModal && selectedPhotos.length > 0 && (
        <div className="modal-overlay photo-modal" onClick={handleCloseModals}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={handleCloseModals}>×</button>
            <button className="photo-nav photo-prev" onClick={handlePrevPhoto}>‹</button>
            <img
              src={selectedPhotos[currentPhotoIndex]}
              alt={`Completion photo ${currentPhotoIndex + 1}`}
              className="photo-modal-image"
            />
            <button className="photo-nav photo-next" onClick={handleNextPhoto}>›</button>
            <div className="photo-counter">
              {currentPhotoIndex + 1} / {selectedPhotos.length}
            </div>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {showEditReviewModal && selectedReview && (
        <div className="modal-overlay" onClick={handleCloseReviewModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Your Review</h3>
              <button className="modal-close" onClick={handleCloseReviewModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-review-details">
                <p><strong>Service:</strong> {selectedReview.service_type}</p>
                <p><strong>Professional:</strong> {selectedReview.worker_name}</p>
              </div>

              <div className="rating-section">
                <h4>Overall Rating</h4>
                <StarRating
                  rating={reviewRatings.overall}
                  onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, overall: rating })}
                  size="large"
                  showValue={true}
                />
              </div>

              <div className="multi-rating-section">
                <h4>Detailed Ratings (Optional)</h4>
                <div className="multi-rating-grid">
                  <StarRating
                    rating={reviewRatings.quality}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, quality: rating })}
                    size="medium"
                    label="Quality of Work:"
                  />
                  <StarRating
                    rating={reviewRatings.punctuality}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, punctuality: rating })}
                    size="medium"
                    label="Punctuality:"
                  />
                  <StarRating
                    rating={reviewRatings.communication}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, communication: rating })}
                    size="medium"
                    label="Communication:"
                  />
                  <StarRating
                    rating={reviewRatings.value}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, value: rating })}
                    size="medium"
                    label="Value for Money:"
                  />
                </div>
              </div>

              <div className="review-text-section">
                <h4>Your Review</h4>
                <textarea
                  className="review-textarea"
                  placeholder="Share your experience with this professional..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={6}
                  disabled={submitting}
                />
                <p className="review-hint">
                  Help other clients by sharing specific details about your experience
                </p>
              </div>

              {/* Photo Upload Section */}
              <div className="edit-photo-section" style={{ marginTop: '1.5rem' }}>
                <h4>Photos</h4>

                {/* Safety Guidelines */}
                <div style={{
                  background: '#fff3cd',
                  borderLeft: '4px solid #ffc107',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  margin: '0.5rem 0',
                  fontSize: '0.85rem'
                }}>
                  <strong style={{ color: '#856404' }}>Photo Safety Guidelines:</strong>
                  <ul style={{
                    margin: '0.25rem 0 0',
                    paddingLeft: '1.5rem',
                    color: '#856404',
                    lineHeight: 1.4
                  }}>
                    <li>Only photograph work areas</li>
                    <li>Avoid personal documents or sensitive information</li>
                    <li>Don't include faces without consent</li>
                    <li>Avoid addresses and valuables</li>
                  </ul>
                </div>

                {/* Photo Grid */}
                {reviewPhotos.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '1rem',
                    margin: '1rem 0'
                  }}>
                    {reviewPhotos.map((photo, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#f8f9fa',
                        border: '2px solid #e9ecef'
                      }}>
                        <img
                          src={photo}
                          alt={`Review ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <button
                          onClick={() => handleRemovePhoto(photo)}
                          disabled={uploadingPhoto}
                          style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            background: 'rgba(220, 53, 69, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            fontSize: '1.5rem',
                            lineHeight: 1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                          title="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />

                {/* Add Photo Button */}
                <button
                  onClick={handleAddPhotoClick}
                  disabled={uploadingPhoto || reviewPhotos.length >= 5}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1.5rem',
                    background: 'white',
                    color: '#667eea',
                    border: '2px dashed #667eea',
                    borderRadius: '8px',
                    cursor: uploadingPhoto || reviewPhotos.length >= 5 ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    opacity: uploadingPhoto || reviewPhotos.length >= 5 ? 0.5 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {uploadingPhoto ? 'Uploading...' : reviewPhotos.length >= 5 ? 'Maximum 5 photos reached' : '+ Add Photo'}
                </button>

                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
                  Max 5 photos, 5MB each
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCloseReviewModal}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdateReview}
                disabled={submitting || !reviewText.trim() || reviewRatings.overall === 0}
              >
                {submitting ? 'Updating...' : 'Update Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {showBookingDetailsModal && selectedBooking && (
        <div className="modal-overlay" onClick={handleCloseBookingDetails}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Booking Details</h3>
              <button className="modal-close" onClick={handleCloseBookingDetails}>×</button>
            </div>
            <div className="modal-body">
              <div className="booking-details-grid">
                <div className="detail-section">
                  <h4>Service Information</h4>
                  <div className="detail-item">
                    <span className="label">Service Type:</span>
                    <span className="value">{selectedBooking.service_type}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Professional:</span>
                    <span className="value">{selectedBooking.worker_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${getStatusBadgeClass(selectedBooking.status)}`}>
                      {selectedBooking.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Schedule</h4>
                  <div className="detail-item">
                    <span className="label">Date:</span>
                    <span className="value">{formatDate(selectedBooking.booking_date)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Time:</span>
                    <span className="value">{formatTime(selectedBooking.booking_time)}</span>
                  </div>
                  {selectedBooking.booking_amount && (
                    <div className="detail-item">
                      <span className="label">Amount:</span>
                      <span className="value">R {selectedBooking.booking_amount}</span>
                    </div>
                  )}
                </div>

                {selectedBooking.description && (
                  <div className="detail-section full-width">
                    <h4>Description</h4>
                    <p>{selectedBooking.description}</p>
                  </div>
                )}

                {selectedBooking.worker_notes && (
                  <div className="detail-section full-width">
                    <h4>Professional's Notes</h4>
                    <p>{selectedBooking.worker_notes}</p>
                  </div>
                )}

                {/* Quote Section in Modal */}
                {selectedBooking.quote && (
                  <div className="detail-section full-width">
                    <div style={{
                      background: selectedBooking.quote.status === 'pending' ? '#e3f2fd' : selectedBooking.quote.status === 'accepted' ? '#d4edda' : '#f8d7da',
                      padding: '1.5rem',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${selectedBooking.quote.status === 'pending' ? '#2196F3' : selectedBooking.quote.status === 'accepted' ? '#28a745' : '#dc3545'}`,
                      marginTop: '1rem'
                    }}>
                      <h4 style={{
                        margin: '0 0 1rem 0',
                        color: selectedBooking.quote.status === 'pending' ? '#0d47a1' : selectedBooking.quote.status === 'accepted' ? '#155724' : '#721c24'
                      }}>
                        💰 Quote {selectedBooking.quote.status === 'accepted' ? 'Accepted' : selectedBooking.quote.status === 'rejected' ? 'Declined' : 'Details'}
                      </h4>

                      {/* Line Items */}
                      {selectedBooking.quote.line_items && Array.isArray(selectedBooking.quote.line_items) && selectedBooking.quote.line_items.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          {selectedBooking.quote.line_items.map((item, index) => (
                            <div key={index} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '0.5rem',
                              fontSize: '1rem'
                            }}>
                              <span>{item.description}</span>
                              <span><strong>R {parseFloat(item.amount).toFixed(2)}</strong></span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Total */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingTop: '1rem',
                        marginTop: '1rem',
                        borderTop: `2px solid ${selectedBooking.quote.status === 'pending' ? '#2196F3' : selectedBooking.quote.status === 'accepted' ? '#28a745' : '#dc3545'}`,
                        fontSize: '1.25rem',
                        fontWeight: 'bold'
                      }}>
                        <span>Total:</span>
                        <span>R {parseFloat(selectedBooking.quote.total_amount).toFixed(2)}</span>
                      </div>

                      {/* Payment Methods */}
                      {selectedBooking.quote.payment_methods && selectedBooking.quote.payment_methods.length > 0 && (
                        <p style={{ margin: '1rem 0 0 0', fontSize: '0.95rem' }}>
                          <strong>Payment Methods:</strong> {selectedBooking.quote.payment_methods.map(pm => pm.toUpperCase()).join(', ')}
                        </p>
                      )}

                      {/* Notes */}
                      {selectedBooking.quote.notes && (
                        <p style={{ margin: '1rem 0 0 0', fontSize: '0.95rem', fontStyle: 'italic', padding: '0.75rem', background: 'rgba(255,255,255,0.5)', borderRadius: '6px' }}>
                          "{selectedBooking.quote.notes}"
                        </p>
                      )}

                      {/* Valid Until */}
                      {selectedBooking.quote.status === 'pending' && selectedBooking.quote.valid_until && (
                        <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                          Valid until: {formatDate(selectedBooking.quote.valid_until)}
                        </p>
                      )}

                      {/* Quote Actions in Modal */}
                      {selectedBooking.quote.status === 'pending' && (
                        <div style={{
                          display: 'flex',
                          gap: '1rem',
                          marginTop: '1.5rem'
                        }}>
                          <button
                            onClick={() => handleAcceptQuote(selectedBooking.quote, selectedBooking)}
                            disabled={submittingQuoteAction}
                            style={{
                              flex: 1,
                              padding: '0.75rem 1.5rem',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '1rem',
                              fontWeight: 600,
                              cursor: submittingQuoteAction ? 'not-allowed' : 'pointer',
                              opacity: submittingQuoteAction ? 0.6 : 1
                            }}
                          >
                            ✅ Accept Quote
                          </button>
                          <button
                            onClick={() => handleOpenRejectQuoteModal(selectedBooking.quote, selectedBooking)}
                            disabled={submittingQuoteAction}
                            style={{
                              flex: 1,
                              padding: '0.75rem 1.5rem',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '1rem',
                              fontWeight: 600,
                              cursor: submittingQuoteAction ? 'not-allowed' : 'pointer',
                              opacity: submittingQuoteAction ? 0.6 : 1
                            }}
                          >
                            ❌ Decline Quote
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Service Address Section */}
                {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'Confirmed') && !selectedBooking.service_address && (
                  <div className="detail-section full-width address-required-section">
                    <div style={{
                      background: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderLeft: '4px solid #ffc107',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      marginTop: '1rem'
                    }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📍 Service Address Required
                      </h4>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#856404' }}>
                        Please provide your service address so the professional can arrive for the job.
                      </p>
                      <textarea
                        className="form-input"
                        placeholder="Enter your full service address (street, suburb, city, postal code)"
                        value={serviceAddress}
                        onChange={(e) => setServiceAddress(e.target.value)}
                        rows={3}
                        disabled={submittingAddress}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '2px solid #ffc107',
                          borderRadius: '6px',
                          fontSize: '0.95rem',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                      <button
                        onClick={handleSubmitServiceAddress}
                        disabled={submittingAddress || !serviceAddress.trim()}
                        style={{
                          width: '100%',
                          marginTop: '0.75rem',
                          padding: '0.75rem 1.5rem',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: submittingAddress ? 'not-allowed' : 'pointer',
                          opacity: submittingAddress || !serviceAddress.trim() ? 0.6 : 1,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {submittingAddress ? 'Sharing Address...' : '✅ Share Address with Professional'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Address Confirmation Display */}
                {selectedBooking.service_address && (
                  <div className="detail-section full-width address-confirmed-section">
                    <div style={{
                      background: '#d4edda',
                      border: '1px solid #28a745',
                      borderLeft: '4px solid #28a745',
                      borderRadius: '8px',
                      padding: '1.5rem',
                      marginTop: '1rem'
                    }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#155724', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ✅ Service Address Shared
                      </h4>
                      <p style={{ margin: '0', fontSize: '0.9rem', color: '#155724' }}>
                        <strong>Address:</strong> {selectedBooking.service_address}
                      </p>
                      {selectedBooking.service_address_provided_at && (
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>
                          Shared on {formatDate(selectedBooking.service_address_provided_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedBooking && selectedBooking.status === 'Completed' && (
                <button
                  className="btn-primary"
                  onClick={() => handleOpenNewReviewModal(selectedBooking)}
                  style={{ marginRight: 'auto' }}
                >
                  Leave a Review
                </button>
              )}
              <button className="btn-secondary" onClick={handleCloseBookingDetails}>
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
              <h3>Cancel Booking</h3>
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
                <select
                  className="form-input"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    background: 'white',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  <option value="">Select cancellation reason</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Schedule conflict">Schedule conflict</option>
                  <option value="Financial constraints">Financial constraints</option>
                  <option value="Found alternative service">Found alternative service</option>
                  <option value="No longer needed">No longer needed</option>
                  <option value="Other">Other</option>
                </select>
                <p className="feedback-hint" style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
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
              <h3>Reschedule Booking</h3>
              <button className="modal-close" onClick={handleCloseAllModals}>×</button>
            </div>
            <div className="modal-body">
              <div className="reschedule-info">
                <p><strong>Current Schedule:</strong></p>
                <p>Date: {formatDate(selectedBooking.booking_date)}</p>
                <p>Time: {formatTime(selectedBooking.booking_time)}</p>
              </div>

              <div className="reschedule-policy-notice" style={{
                background: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '8px',
                padding: '1rem',
                margin: '1rem 0'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#1565c0' }}>📅 Reschedule Policy</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#1565c0' }}>
                  <strong>Important:</strong> Reschedule requests must be made at least <strong>48 hours</strong> before your booking time.
                  The professional must approve your reschedule request before it takes effect.
                </p>
              </div>

              <div className="reschedule-form">
                <h4>New Schedule</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="reschedule-date">New Date</label>
                    <input
                      id="reschedule-date"
                      type="date"
                      className="form-input"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="reschedule-time">New Time</label>
                    <input
                      id="reschedule-time"
                      type="time"
                      className="form-input"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reschedule-reason">Reason for Rescheduling</label>
                  <textarea
                    id="reschedule-reason"
                    className="feedback-textarea"
                    placeholder="Please explain why you need to reschedule..."
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    rows={4}
                    disabled={submitting}
                  />
                  <p className="feedback-hint">
                    Your reschedule request will be sent to the professional for approval
                  </p>
                </div>
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

      {/* New Review Modal */}
      {showNewReviewModal && selectedBooking && (
        <div className="modal-overlay" onClick={handleCloseAllModals}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Leave a Review</h3>
              <button className="modal-close" onClick={handleCloseAllModals}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-review-details">
                <p><strong>Service:</strong> {selectedBooking.service_type}</p>
                <p><strong>Professional:</strong> {selectedBooking.worker_name}</p>
                <p><strong>Date:</strong> {formatDate(selectedBooking.booking_date)}</p>
              </div>

              <div className="multi-rating-section">
                <h4>Rate Your Experience</h4>
                <div className="multi-rating-grid">
                  <StarRating
                    label="Overall Rating"
                    rating={reviewRatings.overall}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, overall: rating })}
                  />
                  <StarRating
                    label="Quality of Work"
                    rating={reviewRatings.quality}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, quality: rating })}
                  />
                  <StarRating
                    label="Punctuality"
                    rating={reviewRatings.punctuality}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, punctuality: rating })}
                  />
                  <StarRating
                    label="Communication"
                    rating={reviewRatings.communication}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, communication: rating })}
                  />
                  <StarRating
                    label="Value for Money"
                    rating={reviewRatings.value}
                    onRatingChange={(rating) => setReviewRatings({ ...reviewRatings, value: rating })}
                  />
                </div>
              </div>

              <div className="review-text-section">
                <h4>Your Review</h4>
                <textarea
                  className="review-textarea"
                  placeholder="Share your experience with this professional..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={6}
                  disabled={submitting}
                />
                <p className="review-hint">
                  Your review helps other clients make informed decisions
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
                className="btn-primary"
                onClick={handleSubmitNewReview}
                disabled={submitting || !reviewText.trim() || reviewRatings.overall === 0}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Quote Modal */}
      {showRejectQuoteModal && selectedQuote && (
        <div className="modal-overlay" onClick={handleCloseRejectQuoteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Decline Quote</h3>
              <button className="modal-close" onClick={handleCloseRejectQuoteModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="rejection-details">
                <p><strong>Professional:</strong> {selectedQuote.booking.worker_name}</p>
                <p><strong>Service:</strong> {selectedQuote.booking.service_type}</p>
                <p><strong>Quote Amount:</strong> R {parseFloat(selectedQuote.quote.total_amount).toFixed(2)}</p>
              </div>

              <div className="feedback-section" style={{ marginTop: '1.5rem' }}>
                <h4>Why are you declining this quote?</h4>
                <textarea
                  className="feedback-textarea"
                  placeholder="Please explain your reason (e.g., price too high, found another service, changed requirements)..."
                  value={quoteRejectionReason}
                  onChange={(e) => setQuoteRejectionReason(e.target.value)}
                  rows={5}
                  disabled={submittingQuoteAction}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #ccc',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                <p className="feedback-hint" style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                  Your feedback helps professionals improve their services
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={handleCloseRejectQuoteModal}
                disabled={submittingQuoteAction}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={handleRejectQuote}
                disabled={submittingQuoteAction || !quoteRejectionReason.trim()}
                style={{
                  opacity: submittingQuoteAction || !quoteRejectionReason.trim() ? 0.6 : 1
                }}
              >
                {submittingQuoteAction ? 'Declining...' : 'Decline Quote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ClientDashboard;
