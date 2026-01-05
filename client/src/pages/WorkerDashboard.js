import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { workerAPI, certificationsAPI } from '../services/api';
import PortfolioGallery from '../components/PortfolioGallery';
import ProfileCompletionBanner from '../components/ProfileCompletionBanner';
import Messages from '../components/Messages';
import './WorkerDashboard.css';

const WorkerDashboard = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Handle tab from URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the '#'
    if (hash && hash !== activeTab) {
      setActiveTab(hash);
    } else if (!hash) {
      setActiveTab('overview');
    }
  }, [location.hash]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setActiveTab(hash);
      } else {
        setActiveTab('overview');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Custom setActiveTab wrapper that updates URL hash
  const changeTab = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'overview') {
      // For overview, use replaceState to avoid adding to history
      window.history.replaceState(null, '', window.location.pathname);
    } else {
      // For other tabs, push to history so back button works
      window.history.pushState(null, '', `#${tab}`);
    }
  }, []);
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
  const [bookingsFilter, setBookingsFilter] = useState('all'); // all, active, completed
  const [scheduleFilter, setScheduleFilter] = useState('upcoming'); // upcoming, today, week

  // Reviews data
  const [reviews, setReviews] = useState([]);

  // Earnings data
  const [earningsFilter, setEarningsFilter] = useState('all'); // all, this_month, last_month, this_year
  const [earningsSummary, setEarningsSummary] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
    pendingPayments: 0,
    completedJobs: 0,
  });
  const [earningsTransactions, setEarningsTransactions] = useState([]);

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

  // Contact & Feedback form states
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState({ show: false, message: '', type: '' });
  const [suggestionCategory, setSuggestionCategory] = useState('');
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionStatus, setSuggestionStatus] = useState({ show: false, message: '', type: '' });
  const [submissions, setSubmissions] = useState([]);

  // Welcome video modal state
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchProfile(),
        fetchCertifications(),
        fetchBookings(),
        fetchBookingRequests(), // NEW: Fetch booking requests
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

  // Fetch earnings when filter changes or tab is earnings
  useEffect(() => {
    if (activeTab === 'earnings') {
      fetchEarnings();
    }
  }, [earningsFilter, activeTab]);

  // Show welcome video modal on first visit
  useEffect(() => {
    const hasSeenWelcomeVideo = localStorage.getItem('hasSeenWelcomeVideo');
    if (!hasSeenWelcomeVideo && user) {
      // Small delay to let dashboard load first
      setTimeout(() => {
        setShowWelcomeVideo(true);
      }, 1000);
    }
  }, [user]);

  // Listen for real-time completion response notifications
  useEffect(() => {
    if (!socket || !socket.registerCompletionResponseCallback) {
      return;
    }

    const cleanup = socket.registerCompletionResponseCallback((data) => {
      console.log('Received completion-response notification:', data);
      const { status } = data;

      if (status === 'approved') {
        alert('Client approved the job completion! Payment will be processed.');
      } else if (status === 'rejected') {
        alert('Client rejected the completion request. Please check their feedback.');
      }

      // Refresh bookings and requests to get updated data
      fetchBookings();
      fetchBookingRequests();
    });

    return cleanup;
  }, [socket]);

  // Listen for real-time new message notifications
  useEffect(() => {
    if (!socket || !socket.registerNewMessageCallback) {
      return;
    }

    const cleanup = socket.registerNewMessageCallback((data) => {
      console.log('Received new message notification:', data);
      // You could add a toast notification here if you have a toast system
      // For now, just log it - Messages component will handle the actual message display
    });

    return cleanup;
  }, [socket]);

  // Auto-refresh system for pending items
  useEffect(() => {
    let idleTime = 0;
    let refreshInterval;

    // Track user activity
    const resetIdleTime = () => {
      idleTime = 0;
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', resetIdleTime);
    window.addEventListener('keypress', resetIdleTime);
    window.addEventListener('click', resetIdleTime);
    window.addEventListener('scroll', resetIdleTime);

    // Increment idle time every minute
    const idleInterval = setInterval(() => {
      idleTime++;
    }, 60000); // 1 minute

    // Auto-refresh every 30 seconds if user is active and there are pending items
    refreshInterval = setInterval(async () => {
      if (idleTime < 10) { // Only refresh if user has been active in last 10 minutes
        try {
          // Check if there are pending booking requests or bookings
          const hasPendingRequests = bookingRequests.some(
            req => req.status === 'pending'
          );
          const hasPendingBookings = bookings.some(
            booking => booking.status === 'pending' || booking.status === 'confirmed'
          );

          if (hasPendingRequests || hasPendingBookings) {
            console.log('Auto-refreshing pending items...');
            await fetchBookingRequests();
            await fetchBookings();
          }
        } catch (error) {
          console.error('Auto-refresh error:', error);
        }
      }
    }, 30000); // 30 seconds

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', resetIdleTime);
      window.removeEventListener('keypress', resetIdleTime);
      window.removeEventListener('click', resetIdleTime);
      window.removeEventListener('scroll', resetIdleTime);
      clearInterval(idleInterval);
      clearInterval(refreshInterval);
    };
  }, [bookingRequests, bookings]);

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
        const allBookings = response.data.jobs || [];
        setBookings(allBookings);

        // Calculate stats
        const totalBookings = allBookings.length;
        const activeJobs = allBookings.filter(
          (b) => b.status === 'Confirmed' || b.status === 'In Progress'
        ).length;
        const completedJobs = allBookings.filter(
          (b) => b.status === 'Completed'
        ).length;

        setStats((prev) => ({
          ...prev,
          totalBookings,
          activeJobs,
          completedJobs,
        }));
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  const fetchEarnings = async () => {
    try {
      const [summaryResponse, earningsResponse] = await Promise.all([
        workerAPI.getEarningsSummary(),
        workerAPI.getEarnings(earningsFilter),
      ]);

      if (summaryResponse.data.summary) {
        setEarningsSummary(summaryResponse.data.summary);
        // Update total earnings in stats
        setStats((prev) => ({
          ...prev,
          totalEarnings: summaryResponse.data.summary.total || 0,
        }));
      }

      if (earningsResponse.data.earnings) {
        setEarningsTransactions(earningsResponse.data.earnings);
      }
    } catch (err) {
      console.error('Error fetching earnings:', err);
    }
  };

  // NEW: Fetch booking requests separately (new bookings, reschedules, cancellations)
  const fetchBookingRequests = async () => {
    try {
      const response = await workerAPI.getBookingRequests();
      if (response.data.success) {
        const requests = response.data.requests || [];
        setBookingRequests(requests);

        // Update pending requests count in stats
        setStats((prev) => ({
          ...prev,
          pendingRequests: requests.length,
        }));
      }
    } catch (err) {
      console.error('Error fetching booking requests:', err);
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

  // Handle NEW booking approval/decline
  const handleNewBookingResponse = async (bookingId, action, declineReason = null) => {
    try {
      const response = await workerAPI.respondToNewBooking(bookingId, action, declineReason);
      if (response.data.success) {
        alert(`Booking ${action === 'approve' ? 'approved' : 'declined'}!`);
        await Promise.all([fetchBookings(), fetchBookingRequests()]);
      } else {
        alert(response.data.error || 'Failed to respond to booking');
      }
    } catch (err) {
      console.error('Error responding to booking:', err);
      alert(err.response?.data?.error || 'Failed to respond to booking');
    }
  };

  // Handle reschedule/cancellation request approval/rejection
  const handleRequestResponse = async (requestId, action) => {
    try {
      const response = await workerAPI.respondToRequest(requestId, action);
      if (response.data.success) {
        alert(`Request ${action === 'approve' ? 'approved' : 'rejected'}!`);
        await Promise.all([fetchBookings(), fetchBookingRequests()]);
      } else {
        alert(response.data.error || 'Failed to respond to request');
      }
    } catch (err) {
      console.error('Error responding to request:', err);
      alert(err.response?.data?.error || 'Failed to respond to request');
    }
  };

  // Legacy handler - kept for backwards compatibility
  const handleBookingAction = async (bookingId, action) => {
    // This is now a wrapper that calls the appropriate handler
    await handleNewBookingResponse(bookingId, action);
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

  // Contact & Feedback handlers
  const handleContactSubmit = async (e) => {
    e.preventDefault();

    if (!contactSubject || !contactMessage) {
      setContactStatus({
        show: true,
        message: 'Please fill in all required fields',
        type: 'error'
      });
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/support/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          worker_id: user.id,
          subject: contactSubject,
          message: contactMessage,
        }),
      });

      if (response.ok) {
        setContactStatus({
          show: true,
          message: '✅ Message sent successfully! We\'ll get back to you within 24 hours.',
          type: 'success'
        });
        setContactSubject('');
        setContactMessage('');

        // Add to submissions
        const newSubmission = {
          id: Date.now(),
          type: 'Contact',
          subject: contactSubject,
          date: new Date().toLocaleDateString(),
          status: 'Pending'
        };
        setSubmissions([newSubmission, ...submissions]);

        setTimeout(() => setContactStatus({ show: false, message: '', type: '' }), 5000);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      console.error('Error sending contact message:', err);
      setContactStatus({
        show: true,
        message: '❌ Failed to send message. Please try again.',
        type: 'error'
      });
      setTimeout(() => setContactStatus({ show: false, message: '', type: '' }), 5000);
    }
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();

    if (!suggestionText) {
      setSuggestionStatus({
        show: true,
        message: 'Please describe your suggestion',
        type: 'error'
      });
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/support/suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          worker_id: user.id,
          category: suggestionCategory || 'Other',
          suggestion: suggestionText,
        }),
      });

      if (response.ok) {
        setSuggestionStatus({
          show: true,
          message: '✅ Thank you for your suggestion! We appreciate your feedback.',
          type: 'success'
        });
        setSuggestionCategory('');
        setSuggestionText('');

        // Add to submissions
        const newSubmission = {
          id: Date.now(),
          type: 'Suggestion',
          subject: suggestionCategory || 'Other',
          date: new Date().toLocaleDateString(),
          status: 'Submitted'
        };
        setSubmissions([newSubmission, ...submissions]);

        setTimeout(() => setSuggestionStatus({ show: false, message: '', type: '' }), 5000);
      } else {
        throw new Error('Failed to submit suggestion');
      }
    } catch (err) {
      console.error('Error submitting suggestion:', err);
      setSuggestionStatus({
        show: true,
        message: '❌ Failed to submit suggestion. Please try again.',
        type: 'error'
      });
      setTimeout(() => setSuggestionStatus({ show: false, message: '', type: '' }), 5000);
    }
  };

  const handleCloseWelcomeVideo = () => {
    setShowWelcomeVideo(false);
    localStorage.setItem('hasSeenWelcomeVideo', 'true');
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
          onClick={() => changeTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'profile' ? 'active' : ''}
          onClick={() => {
            changeTab('profile');
            fetchPortfolioPhotos();
          }}
        >
          Profile
          {certifications.filter((c) => c.status === 'pending').length > 0 && (
            <span className="badge">
              {certifications.filter((c) => c.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => changeTab('bookings')}
        >
          Bookings
          {stats.pendingRequests > 0 && (
            <span className="badge">{stats.pendingRequests}</span>
          )}
        </button>
        <button
          className={activeTab === 'reviews' ? 'active' : ''}
          onClick={() => changeTab('reviews')}
        >
          Reviews
        </button>
        <button
          className={activeTab === 'messages' ? 'active' : ''}
          onClick={() => changeTab('messages')}
        >
          Messages
        </button>
        <button
          className={activeTab === 'getting-started' ? 'active' : ''}
          onClick={() => changeTab('getting-started')}
        >
          🎬 Getting Started
        </button>
        <button
          className={activeTab === 'fixxa-tips' ? 'active' : ''}
          onClick={() => changeTab('fixxa-tips')}
        >
          💡 FixxaTips
        </button>
        <button
          className={activeTab === 'rules-guidelines' ? 'active' : ''}
          onClick={() => changeTab('rules-guidelines')}
        >
          📜 Rules & Guidelines
        </button>
        <button
          className={activeTab === 'contact-feedback' ? 'active' : ''}
          onClick={() => changeTab('contact-feedback')}
        >
          📞 Contact & Feedback
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
              onTabChange={setActiveTab}
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
                    {certifications.filter((c) => c.status === 'approved' && c.document_type === 'certification').length >
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
              <h3>Dashboard Overview</h3>
              <div className="stats-grid">
                <div className="stat-card stat-pending">
                  <img src="/images/icons-fixxa/billing_18943497.png" alt="Pending" className="stat-icon-img" />
                  <div className="stat-content">
                    <div className="stat-value">{stats.pendingRequests || 0}</div>
                    <div className="stat-label">Pending Requests</div>
                  </div>
                </div>
                <button
                  className="stat-card stat-active"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBookingsFilter('active');
                    changeTab('bookings');
                  }}
                  type="button"
                >
                  <img src="/images/icons-fixxa/suitcase_1835273.png" alt="Active" className="stat-icon-img" />
                  <div className="stat-content">
                    <div className="stat-value">{stats.activeJobs || 0}</div>
                    <div className="stat-label">Active Jobs</div>
                  </div>
                </button>
                <button
                  className="stat-card stat-completed"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setBookingsFilter('completed');
                    changeTab('bookings');
                  }}
                  type="button"
                >
                  <img src="/images/icons-fixxa/briefcase_9927577.png" alt="Completed" className="stat-icon-img" />
                  <div className="stat-content">
                    <div className="stat-value">{stats.completedJobs || 0}</div>
                    <div className="stat-label">Completed</div>
                  </div>
                </button>
                <button
                  className="stat-card stat-earnings"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeTab('earnings');
                  }}
                  type="button"
                >
                  <img src="/images/icons-fixxa/market_14157550.png" alt="Earnings" className="stat-icon-img" />
                  <div className="stat-content">
                    <div className="stat-value">R{stats.totalEarnings?.toFixed(2) || '0.00'}</div>
                    <div className="stat-label">Total Earnings</div>
                  </div>
                </button>
              </div>
            </section>

            {/* Quick Actions Grid */}
            <section className="quick-actions-section">
              <h3>Quick Actions</h3>
              <div className="quick-actions-grid">
                <button
                  className="action-tile action-bookings"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeTab('bookings');
                  }}
                  type="button"
                >
                  <img src="/images/icons-fixxa/booking_5619606.png" alt="Job Requests" className="action-icon-img" />
                  <span className="action-label">Job Requests</span>
                  {stats.pendingRequests > 0 && (
                    <span className="action-badge">{stats.pendingRequests}</span>
                  )}
                </button>
                <button
                  className="action-tile action-schedule"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeTab('schedule');
                  }}
                  type="button"
                >
                  <img src="/images/icons-fixxa/calendar_16926328.png" alt="Schedule" className="action-icon-img" />
                  <span className="action-label">My Schedule</span>
                </button>
                <button
                  className="action-tile action-portfolio"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeTab('profile');
                  }}
                  type="button"
                >
                  <img src="/images/icons-fixxa/camera_2951182.png" alt="Portfolio" className="action-icon-img" />
                  <span className="action-label">My Portfolio</span>
                </button>
                <button
                  className="action-tile action-messages"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeTab('messages');
                  }}
                  type="button"
                >
                  <img src="/images/icons-fixxa/email_7306809.png" alt="Messages" className="action-icon-img" />
                  <span className="action-label">Messages</span>
                </button>
                <button
                  className="action-tile action-reviews"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    changeTab('reviews');
                  }}
                  type="button"
                >
                  <img src="/images/icons-fixxa/rating_8424553.png" alt="Reviews" className="action-icon-img" />
                  <span className="action-label">My Reviews</span>
                </button>
              </div>
            </section>

            {/* Client Requests (New Bookings, Reschedules, Cancellations) */}
            {bookingRequests.length > 0 && (
              <section className="requests-section">
                <h3>Client Requests ({bookingRequests.length})</h3>
                <div className="requests-list">
                  {bookingRequests.map((request) => {
                    const isNewBooking = request.request_type === 'new_booking';
                    const isReschedule = request.request_type === 'reschedule' || request.request_type === 'pending-reschedule';
                    const isCancellation = request.request_type === 'cancellation';

                    // Parse reschedule data if needed
                    let rescheduleData = {};
                    if (isReschedule && request.completion_notes) {
                      try {
                        rescheduleData = typeof request.completion_notes === 'string'
                          ? JSON.parse(request.completion_notes)
                          : request.completion_notes;
                      } catch (e) {
                        console.error('Failed to parse reschedule data', e);
                      }
                    }

                    return (
                      <div
                        key={request.id}
                        className={`request-card ${
                          isNewBooking ? 'new-booking' : isCancellation ? 'cancellation' : 'reschedule'
                        }`}
                        style={{
                          borderLeft: isNewBooking
                            ? '4px solid #28a745'
                            : isCancellation
                            ? '4px solid #dc3545'
                            : '4px solid #17a2b8',
                        }}
                      >
                        <div className="request-header">
                          <h4>
                            {isNewBooking && '🆕 New Booking Request'}
                            {isReschedule && '📅 Reschedule Request'}
                            {isCancellation && '❌ Cancellation Request'}
                          </h4>
                        </div>
                        <p>
                          <strong>Client:</strong> {request.client_name}
                        </p>
                        <p>
                          <strong>Email:</strong> {request.client_email}
                        </p>
                        <p>
                          <strong>Service:</strong> {request.service || 'Service'}
                        </p>

                        {/* NEW BOOKING - Show requested date/time */}
                        {isNewBooking && (
                          <>
                            <p>
                              <strong>Requested Date:</strong>{' '}
                              {new Date(request.booking_date).toLocaleDateString()}
                            </p>
                            <p>
                              <strong>Requested Time:</strong> {request.booking_time}
                            </p>
                            {request.note && (
                              <p>
                                <strong>Client Note:</strong> <em>{request.note}</em>
                              </p>
                            )}
                          </>
                        )}

                        {/* RESCHEDULE REQUEST - Show current and requested date/time */}
                        {isReschedule && (
                          <>
                            <p>
                              <strong>Current Booking:</strong>{' '}
                              {new Date(request.booking_date).toLocaleDateString()} at{' '}
                              {request.booking_time}
                            </p>
                            <div
                              style={{
                                background: '#e7f3ff',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                margin: '0.5rem 0',
                              }}
                            >
                              <strong>Requested New Date/Time:</strong>
                              <br />
                              {rescheduleData.newDate
                                ? new Date(rescheduleData.newDate).toLocaleDateString()
                                : 'N/A'}{' '}
                              at {rescheduleData.newTime || 'N/A'}
                            </div>
                            {rescheduleData.reason && (
                              <p>
                                <strong>Reason:</strong> {rescheduleData.reason}
                              </p>
                            )}
                          </>
                        )}

                        {/* CANCELLATION REQUEST - Show cancellation reason */}
                        {isCancellation && (
                          <>
                            <p>
                              <strong>Booking Details:</strong>{' '}
                              {new Date(request.booking_date).toLocaleDateString()} at{' '}
                              {request.booking_time}
                            </p>
                            <div
                              style={{
                                background: '#ffe7e7',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                margin: '0.5rem 0',
                              }}
                            >
                              <strong>Cancellation Reason:</strong>{' '}
                              {request.cancellation_reason || 'Not specified'}
                            </div>
                          </>
                        )}

                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                          {isNewBooking ? 'Received' : 'Requested'}:{' '}
                          {new Date(request.created_at).toLocaleString()}
                        </p>

                        <div className="request-actions">
                          {isNewBooking ? (
                            <>
                              <button
                                className="btn-approve"
                                onClick={() =>
                                  handleNewBookingResponse(request.booking_id, 'approve')
                                }
                              >
                                ✓ Approve Booking
                              </button>
                              <button
                                className="btn-decline"
                                onClick={() =>
                                  handleNewBookingResponse(request.booking_id, 'decline')
                                }
                              >
                                ✕ Decline Booking
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-approve"
                                onClick={() => handleRequestResponse(request.id, 'approve')}
                              >
                                {isCancellation ? '✓ Approve Cancellation' : '✓ Approve Reschedule'}
                              </button>
                              <button
                                className="btn-decline"
                                onClick={() => handleRequestResponse(request.id, 'reject')}
                              >
                                ✕ Decline Request
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                  onClick={() => changeTab('reviews')}
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
                  <label>Service Radius (km)</label>
                  <input
                    type="number"
                    name="service_radius"
                    value={profileFormData.service_radius || ''}
                    onChange={handleProfileInputChange}
                    disabled={!profileEditing}
                    placeholder="e.g., 20"
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    How far are you willing to travel for jobs?
                  </small>
                </div>

                <div className="form-group">
                  <label>Secondary Service Areas</label>
                  <input
                    type="text"
                    name="secondary_areas"
                    value={profileFormData.secondary_areas || ''}
                    onChange={handleProfileInputChange}
                    disabled={!profileEditing}
                    placeholder="e.g., Sandton, Midrand, Centurion"
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem' }}>
                    Other suburbs or areas you service (comma-separated)
                  </small>
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

            {/* Certifications Section */}
            <section className="certifications-management" style={{ marginTop: '2rem' }}>
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

            {/* Portfolio Section */}
            <section style={{ marginTop: '2rem' }}>
              <h3>Portfolio</h3>
              <PortfolioGallery
                photos={portfolioPhotos}
                onUpload={handlePortfolioUpload}
                onDelete={handlePortfolioDelete}
              />
            </section>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bookings-tab">
            {/* Show loading state */}
            {loading && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="loading-spinner"></div>
                <p>Loading jobs...</p>
              </div>
            )}

            {/* Client Requests Section - Needs Action */}
            {!loading && bookingRequests.length > 0 && (
              <section className="requests-section" style={{ marginBottom: '2rem' }}>
                <h3>Client Requests ({bookingRequests.length})</h3>
                <p style={{ color: '#666', marginBottom: '1rem' }}>
                  These requests need your response
                </p>
                <div className="requests-list">
                  {bookingRequests.map((request) => {
                    const isNewBooking = request.request_type === 'new_booking';
                    const isReschedule = request.request_type === 'reschedule' || request.request_type === 'pending-reschedule';
                    const isCancellation = request.request_type === 'cancellation';

                    // Parse reschedule data if needed
                    let rescheduleData = {};
                    if (isReschedule && request.completion_notes) {
                      try {
                        rescheduleData = typeof request.completion_notes === 'string'
                          ? JSON.parse(request.completion_notes)
                          : request.completion_notes;
                      } catch (e) {
                        console.error('Failed to parse reschedule data', e);
                      }
                    }

                    return (
                      <div
                        key={request.id}
                        className={`request-card ${
                          isNewBooking ? 'new-booking' : isCancellation ? 'cancellation' : 'reschedule'
                        }`}
                        style={{
                          borderLeft: isNewBooking
                            ? '4px solid #28a745'
                            : isCancellation
                            ? '4px solid #dc3545'
                            : '4px solid #17a2b8',
                        }}
                      >
                        <div className="request-header">
                          <h4>
                            {isNewBooking && '🆕 New Booking Request'}
                            {isReschedule && '📅 Reschedule Request'}
                            {isCancellation && '❌ Cancellation Request'}
                          </h4>
                        </div>
                        <p>
                          <strong>Client:</strong> {request.client_name}
                        </p>
                        <p>
                          <strong>Email:</strong> {request.client_email}
                        </p>
                        <p>
                          <strong>Service:</strong> {request.service || 'Service'}
                        </p>

                        {/* NEW BOOKING - Show requested date/time */}
                        {isNewBooking && (
                          <>
                            <p>
                              <strong>Requested Date:</strong>{' '}
                              {new Date(request.booking_date).toLocaleDateString()}
                            </p>
                            <p>
                              <strong>Requested Time:</strong> {request.booking_time}
                            </p>
                            {request.note && (
                              <p>
                                <strong>Client Note:</strong> <em>{request.note}</em>
                              </p>
                            )}
                          </>
                        )}

                        {/* RESCHEDULE REQUEST - Show current and requested date/time */}
                        {isReschedule && (
                          <>
                            <p>
                              <strong>Current Booking:</strong>{' '}
                              {new Date(request.booking_date).toLocaleDateString()} at{' '}
                              {request.booking_time}
                            </p>
                            <div
                              style={{
                                background: '#e7f3ff',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                margin: '0.5rem 0',
                              }}
                            >
                              <strong>Requested New Date/Time:</strong>
                              <br />
                              {rescheduleData.newDate
                                ? new Date(rescheduleData.newDate).toLocaleDateString()
                                : 'N/A'}{' '}
                              at {rescheduleData.newTime || 'N/A'}
                            </div>
                            {rescheduleData.reason && (
                              <p>
                                <strong>Reason:</strong> {rescheduleData.reason}
                              </p>
                            )}
                          </>
                        )}

                        {/* CANCELLATION REQUEST - Show cancellation reason */}
                        {isCancellation && (
                          <>
                            <p>
                              <strong>Booking Details:</strong>{' '}
                              {new Date(request.booking_date).toLocaleDateString()} at{' '}
                              {request.booking_time}
                            </p>
                            <div
                              style={{
                                background: '#ffe7e7',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                margin: '0.5rem 0',
                              }}
                            >
                              <strong>Cancellation Reason:</strong>{' '}
                              {request.cancellation_reason || 'Not specified'}
                            </div>
                          </>
                        )}

                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                          {isNewBooking ? 'Received' : 'Requested'}:{' '}
                          {new Date(request.created_at).toLocaleString()}
                        </p>

                        <div className="request-actions">
                          {isNewBooking ? (
                            <>
                              <button
                                className="btn-approve"
                                onClick={() =>
                                  handleNewBookingResponse(request.booking_id, 'approve')
                                }
                              >
                                ✓ Approve Booking
                              </button>
                              <button
                                className="btn-decline"
                                onClick={() =>
                                  handleNewBookingResponse(request.booking_id, 'decline')
                                }
                              >
                                ✕ Decline Booking
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-approve"
                                onClick={() => handleRequestResponse(request.id, 'approve')}
                              >
                                {isCancellation ? '✓ Approve Cancellation' : '✓ Approve Reschedule'}
                              </button>
                              <button
                                className="btn-decline"
                                onClick={() => handleRequestResponse(request.id, 'reject')}
                              >
                                ✕ Decline Request
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* My Jobs Section with Filters */}
            {!loading && (
            <section className="my-jobs-section">
              <div className="section-header-with-description">
                <h3>My Jobs ({bookings.length})</h3>
                <p className="section-description">
                  View and manage all your bookings and jobs in one place
                </p>
              </div>

              {/* Filter Chips */}
              <div className="filter-chips">
                <button
                  className={`filter-chip ${bookingsFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setBookingsFilter('all')}
                >
                  All
                  <span className="filter-count">{bookings.length}</span>
                </button>
                <button
                  className={`filter-chip ${bookingsFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setBookingsFilter('active')}
                >
                  Active
                  <span className="filter-count">
                    {bookings.filter(
                      (b) => b.status === 'Confirmed' ||
                             b.status === 'In Progress' ||
                             b.status === 'Awaiting Client Confirmation'
                    ).length}
                  </span>
                </button>
                <button
                  className={`filter-chip ${bookingsFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setBookingsFilter('completed')}
                >
                  Completed
                  <span className="filter-count">
                    {bookings.filter((b) => b.status === 'Completed').length}
                  </span>
                </button>
              </div>

              {/* Jobs Grid */}
              <div className="jobs-grid">
                {(() => {
                  // Filter bookings based on selected filter
                  let filteredBookings = bookings;
                  if (bookingsFilter === 'active') {
                    filteredBookings = bookings.filter(
                      (b) => b.status === 'Confirmed' ||
                             b.status === 'In Progress' ||
                             b.status === 'Awaiting Client Confirmation'
                    );
                  } else if (bookingsFilter === 'completed') {
                    filteredBookings = bookings.filter((b) => b.status === 'Completed');
                  }

                  if (filteredBookings.length === 0) {
                    return (
                      <div className="no-jobs">
                        <div className="no-jobs-icon">📋</div>
                        <p>
                          {bookingsFilter === 'all'
                            ? 'No jobs yet'
                            : `No ${bookingsFilter} jobs`}
                        </p>
                        <p style={{ fontSize: '0.95rem', color: '#999', marginTop: '0.5rem' }}>
                          {bookingsFilter === 'all'
                            ? 'Your bookings and jobs will appear here once clients book your services.'
                            : 'Try viewing all jobs or wait for new bookings.'}
                        </p>
                        {bookingsFilter !== 'all' && (
                          <button
                            className="btn-view-all"
                            onClick={() => setBookingsFilter('all')}
                          >
                            View All Jobs
                          </button>
                        )}
                      </div>
                    );
                  }

                  return filteredBookings.map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="job-card-header">
                        <h4 className="job-service">
                          {job.service || job.service_type || 'Service'}
                        </h4>
                        <span
                          className={`job-status-badge status-${job.status?.toLowerCase().replace(' ', '-')}`}
                        >
                          {job.status}
                        </span>
                      </div>

                      <div className="job-card-body">
                        <p className="job-client">
                          <strong>Client:</strong> {job.client_name}
                        </p>

                        {job.booking_date && (
                          <p className="job-date">
                            <strong>📅 Date:</strong>{' '}
                            {new Date(job.booking_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        )}

                        {job.booking_time && (
                          <p className="job-time">
                            <strong>🕐 Time:</strong> {job.booking_time}
                          </p>
                        )}

                        {job.note && (
                          <p className="job-note">
                            <strong>Note:</strong> {job.note}
                          </p>
                        )}

                        {(job.booking_amount || job.price) && (
                          <p className="job-price">
                            <strong>💰 Amount:</strong> R{Number(job.booking_amount || job.price || 0).toFixed(2)}
                          </p>
                        )}
                      </div>

                      <div className="job-card-footer">
                        <button
                          className="btn-message-job"
                          onClick={() => changeTab('messages')}
                        >
                          💬 Message Client
                        </button>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </section>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="schedule-tab">
            {/* Show loading state */}
            {loading && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="loading-spinner"></div>
                <p>Loading schedule...</p>
              </div>
            )}

            {/* My Schedule Section with Filters */}
            {!loading && (
            <section className="my-schedule-section">
              <div className="section-header-with-description">
                <h3>My Schedule</h3>
                <p className="section-description">
                  View your upcoming jobs and manage your schedule
                </p>
              </div>

              {/* Filter Chips */}
              <div className="filter-chips">
                <button
                  className={`filter-chip ${scheduleFilter === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setScheduleFilter('upcoming')}
                >
                  Upcoming
                  <span className="filter-count">
                    {bookings.filter(
                      (b) => {
                        const bookingDate = new Date(b.booking_date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return (
                          (b.status === 'Confirmed' || b.status === 'In Progress') &&
                          bookingDate >= today
                        );
                      }
                    ).length}
                  </span>
                </button>
                <button
                  className={`filter-chip ${scheduleFilter === 'today' ? 'active' : ''}`}
                  onClick={() => setScheduleFilter('today')}
                >
                  Today
                  <span className="filter-count">
                    {bookings.filter(
                      (b) => {
                        const bookingDate = new Date(b.booking_date);
                        const today = new Date();
                        return (
                          (b.status === 'Confirmed' || b.status === 'In Progress') &&
                          bookingDate.toDateString() === today.toDateString()
                        );
                      }
                    ).length}
                  </span>
                </button>
                <button
                  className={`filter-chip ${scheduleFilter === 'week' ? 'active' : ''}`}
                  onClick={() => setScheduleFilter('week')}
                >
                  This Week
                  <span className="filter-count">
                    {bookings.filter(
                      (b) => {
                        const bookingDate = new Date(b.booking_date);
                        const today = new Date();
                        const weekFromNow = new Date();
                        weekFromNow.setDate(today.getDate() + 7);
                        return (
                          (b.status === 'Confirmed' || b.status === 'In Progress') &&
                          bookingDate >= today &&
                          bookingDate <= weekFromNow
                        );
                      }
                    ).length}
                  </span>
                </button>
              </div>

              {/* Schedule Grid */}
              <div className="jobs-grid">
                {(() => {
                  // Filter bookings based on selected schedule filter
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  let filteredBookings = bookings.filter(
                    (b) => b.status === 'Confirmed' || b.status === 'In Progress'
                  );

                  if (scheduleFilter === 'upcoming') {
                    filteredBookings = filteredBookings.filter((b) => {
                      const bookingDate = new Date(b.booking_date);
                      return bookingDate >= today;
                    });
                  } else if (scheduleFilter === 'today') {
                    filteredBookings = filteredBookings.filter((b) => {
                      const bookingDate = new Date(b.booking_date);
                      return bookingDate.toDateString() === today.toDateString();
                    });
                  } else if (scheduleFilter === 'week') {
                    const weekFromNow = new Date();
                    weekFromNow.setDate(today.getDate() + 7);
                    filteredBookings = filteredBookings.filter((b) => {
                      const bookingDate = new Date(b.booking_date);
                      return bookingDate >= today && bookingDate <= weekFromNow;
                    });
                  }

                  // Sort by date and time
                  filteredBookings.sort((a, b) => {
                    const dateA = new Date(a.booking_date);
                    const dateB = new Date(b.booking_date);
                    if (dateA.getTime() !== dateB.getTime()) {
                      return dateA - dateB;
                    }
                    // If same date, sort by time
                    return (a.booking_time || '').localeCompare(b.booking_time || '');
                  });

                  if (filteredBookings.length === 0) {
                    return (
                      <div className="no-jobs">
                        <div className="no-jobs-icon">📅</div>
                        <p>
                          {scheduleFilter === 'upcoming'
                            ? 'No upcoming jobs'
                            : scheduleFilter === 'today'
                            ? 'No jobs scheduled for today'
                            : 'No jobs this week'}
                        </p>
                        <p style={{ fontSize: '0.95rem', color: '#999', marginTop: '0.5rem' }}>
                          {scheduleFilter === 'upcoming'
                            ? 'Your upcoming confirmed jobs will appear here.'
                            : scheduleFilter === 'today'
                            ? 'You have no jobs scheduled for today. Check your upcoming schedule.'
                            : 'You have no jobs scheduled for this week.'}
                        </p>
                        {scheduleFilter !== 'upcoming' && (
                          <button
                            className="btn-view-all"
                            onClick={() => setScheduleFilter('upcoming')}
                          >
                            View All Upcoming
                          </button>
                        )}
                      </div>
                    );
                  }

                  return filteredBookings.map((job) => {
                    const jobDate = new Date(job.booking_date);
                    const isToday = jobDate.toDateString() === new Date().toDateString();
                    const isTomorrow = jobDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                    return (
                      <div key={job.id} className="job-card schedule-job-card">
                        <div className="job-card-header">
                          <h4 className="job-service">
                            {job.service || job.service_type || 'Service'}
                          </h4>
                          <span
                            className={`job-status-badge status-${job.status?.toLowerCase().replace(' ', '-')}`}
                          >
                            {job.status}
                          </span>
                        </div>

                        <div className="job-card-body">
                          <p className="job-client">
                            <strong>Client:</strong> {job.client_name}
                          </p>

                          {job.booking_date && (
                            <p className="job-date" style={{ fontSize: '1.05rem', fontWeight: '600', color: isToday ? '#007bff' : '#333' }}>
                              <strong>📅 {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : 'Date'}:</strong>{' '}
                              {new Date(job.booking_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          )}

                          {job.booking_time && (
                            <p className="job-time" style={{ fontSize: '1.05rem', fontWeight: '600' }}>
                              <strong>🕐 Time:</strong> {job.booking_time}
                            </p>
                          )}

                          {job.location && (
                            <p className="job-location">
                              <strong>📍 Location:</strong> {job.location}
                            </p>
                          )}

                          {job.note && (
                            <p className="job-note">
                              <strong>Note:</strong> {job.note}
                            </p>
                          )}

                          {(job.booking_amount || job.price) && (
                            <p className="job-price">
                              <strong>💰 Amount:</strong> R{Number(job.booking_amount || job.price || 0).toFixed(2)}
                            </p>
                          )}
                        </div>

                        <div className="job-card-footer">
                          <button
                            className="btn-message-job"
                            onClick={() => changeTab('messages')}
                          >
                            💬 Message Client
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </section>
            )}
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="earnings-tab">
            {/* Show loading state */}
            {loading && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="loading-spinner"></div>
                <p>Loading earnings...</p>
              </div>
            )}

            {!loading && (
              <>
                {/* Summary Section */}
                <section className="earnings-summary-section">
                  <div className="section-header-with-description">
                    <h3>Earnings Overview</h3>
                    <p className="section-description">
                      {earningsTransactions.length} transaction{earningsTransactions.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Main Summary Card */}
                  <div className="main-earnings-card">
                    <div className="earnings-label">Total Earnings</div>
                    <div className="earnings-amount">R{(earningsSummary.total || 0).toFixed(2)}</div>
                    <div className="earnings-subtext">
                      From {earningsSummary.completedJobs || 0} completed job{earningsSummary.completedJobs !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Summary Grid */}
                  <div className="earnings-summary-grid">
                    <div className="earnings-summary-card">
                      <div className="summary-card-label">This Month</div>
                      <div className="summary-card-value">R{(earningsSummary.thisMonth || 0).toFixed(2)}</div>
                    </div>
                    <div className="earnings-summary-card">
                      <div className="summary-card-label">Last Month</div>
                      <div className="summary-card-value">R{(earningsSummary.lastMonth || 0).toFixed(2)}</div>
                    </div>
                    <div className="earnings-summary-card">
                      <div className="summary-card-label">This Year</div>
                      <div className="summary-card-value">R{(earningsSummary.thisYear || 0).toFixed(2)}</div>
                    </div>
                    <div className="earnings-summary-card pending-card">
                      <div className="summary-card-label">Pending</div>
                      <div className="summary-card-value">R{(earningsSummary.pendingPayments || 0).toFixed(2)}</div>
                    </div>
                  </div>
                </section>

                {/* Filter Section */}
                <section className="earnings-filter-section">
                  <div className="filter-chips">
                    <button
                      className={`filter-chip ${earningsFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setEarningsFilter('all')}
                    >
                      All Time
                    </button>
                    <button
                      className={`filter-chip ${earningsFilter === 'this_month' ? 'active' : ''}`}
                      onClick={() => setEarningsFilter('this_month')}
                    >
                      This Month
                    </button>
                    <button
                      className={`filter-chip ${earningsFilter === 'last_month' ? 'active' : ''}`}
                      onClick={() => setEarningsFilter('last_month')}
                    >
                      Last Month
                    </button>
                    <button
                      className={`filter-chip ${earningsFilter === 'this_year' ? 'active' : ''}`}
                      onClick={() => setEarningsFilter('this_year')}
                    >
                      This Year
                    </button>
                  </div>
                </section>

                {/* Transaction History */}
                <section className="earnings-transactions-section">
                  <h3>Transaction History</h3>

                  {earningsTransactions.length === 0 ? (
                    <div className="no-earnings">
                      <div className="no-earnings-icon">💰</div>
                      <p>No earnings yet</p>
                      <p style={{ fontSize: '0.95rem', color: '#999', marginTop: '0.5rem' }}>
                        {earningsFilter === 'this_month'
                          ? 'No earnings this month'
                          : earningsFilter === 'last_month'
                          ? 'No earnings last month'
                          : earningsFilter === 'this_year'
                          ? 'No earnings this year'
                          : 'Complete jobs to start earning'}
                      </p>
                    </div>
                  ) : (
                    <div className="earnings-list">
                      {earningsTransactions.map((earning) => {
                        const getStatusColor = (status) => {
                          switch (status?.toLowerCase()) {
                            case 'paid':
                            case 'completed':
                              return '#28a745';
                            case 'pending':
                              return '#ffc107';
                            case 'processing':
                              return '#17a2b8';
                            default:
                              return '#6c757d';
                          }
                        };

                        return (
                          <div key={earning.id} className="earning-card">
                            <div className="earning-header">
                              <div className="earning-info">
                                <h4 className="earning-service">{earning.service_type || 'Service'}</h4>
                                <p className="earning-client">Client: {earning.client_name || 'N/A'}</p>
                                <p className="earning-date">
                                  {new Date(earning.completed_date || earning.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                              <div className="earning-amount-section">
                                <div className="earning-amount">R{Number(earning.amount || 0).toFixed(2)}</div>
                                <span
                                  className="earning-status-badge"
                                  style={{ backgroundColor: getStatusColor(earning.status) }}
                                >
                                  {earning.status || 'Paid'}
                                </span>
                              </div>
                            </div>
                            {earning.description && (
                              <p className="earning-description">{earning.description}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
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

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="messages-tab">
            <Messages />
          </div>
        )}

        {/* Getting Started Tab */}
        {activeTab === 'getting-started' && (
          <div className="getting-started-tab">
            <h1>🎬 Getting Started with Fixxa</h1>

            {/* Welcome Banner */}
            <div className="welcome-banner">
              <h3>👋 Welcome to Fixxa!</h3>
              <p>
                Watch this video to learn how to use the Fixxa platform, manage your bookings,
                communicate with clients, and grow your business. This tutorial covers everything
                you need to know to get started and succeed on Fixxa.
              </p>
            </div>

            {/* Video Section */}
            <section className="video-section">
              <h3>📺 How to Get Started with Fixxa</h3>

              <div className="video-container">
                <iframe
                  src="https://www.youtube.com/embed/eloSnb-dKRE?si=sd9JQ-3nwaHfDRgG"
                  title="Fixxa Tutorial - How to Get Started"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>

              <p className="video-tip">
                💡 <strong>Tip:</strong> Watch this video whenever you need help navigating the platform
              </p>
            </section>

            {/* Quick Tips Section */}
            <section className="quick-tips-section">
              <h3>🚀 Quick Tips for Success</h3>
              <ul className="tips-list">
                <li>
                  <strong>Complete Your Profile:</strong> Add a professional bio, experience,
                  and certifications to attract more clients
                </li>
                <li>
                  <strong>Upload Portfolio Photos:</strong> Showcase your best work to build
                  trust with potential clients
                </li>
                <li>
                  <strong>Respond Quickly:</strong> Reply to booking requests within 24 hours
                  to maintain a high acceptance rate
                </li>
                <li>
                  <strong>Use Professional Communication:</strong> Always be courteous and
                  professional in your messages
                </li>
                <li>
                  <strong>Send Detailed Quotes:</strong> Break down costs clearly and keep
                  receipts for materials
                </li>
                <li>
                  <strong>Ask for Reviews:</strong> Encourage satisfied clients to leave
                  reviews to boost your profile
                </li>
              </ul>
            </section>

            {/* Need Help Section */}
            <section className="help-section">
              <h3>❓ Need Help?</h3>
              <p>
                If you have questions or need assistance, our support team is here to help you succeed.
              </p>
              <button
                className="btn-contact"
                onClick={() => window.location.href = 'mailto:support@fixxa.co.za'}
              >
                Contact Support
              </button>
            </section>
          </div>
        )}

        {/* FixxaTips Tab */}
        {activeTab === 'fixxa-tips' && (
          <div className="fixxa-tips-tab">
            <h1>💡 FixxaTips: Get the Best Out of Fixxa</h1>

            {/* Intro Banner */}
            <div className="tips-intro-banner">
              <h3>🚀 Maximize Your Success</h3>
              <p>
                Follow these proven tips to attract more clients, earn better reviews,
                and grow your business on Fixxa!
              </p>
            </div>

            {/* Tip 1: Keep Your Profile Polished */}
            <section className="tip-card tip-green">
              <h3>
                <span className="tip-icon">🏆</span>
                Tip 1: Keep Your Profile Polished
              </h3>
              <p className="tip-impact">
                <strong>Profiles with clear photos, professional descriptions, and verified badges get 3x more bookings.</strong>
              </p>
              <p className="tip-description">
                Update your profile photo, add a compelling bio describing your skills, upload portfolio
                images of your best work, and keep your certifications current. A complete profile builds trust!
              </p>
            </section>

            {/* Tip 2: Choose the Right Suburbs */}
            <section className="tip-card tip-blue">
              <h3>
                <span className="tip-icon">📍</span>
                Tip 2: Choose the Right Suburbs
              </h3>
              <p className="tip-impact">
                <strong>List areas you actually want to work in — clients prefer local pros who can arrive quickly.</strong>
              </p>
              <p className="tip-description">
                Be specific about your service areas. Clients search by location and choose professionals nearby.
                Update your primary and secondary service areas to match where you're willing to travel.
              </p>
            </section>

            {/* Tip 3: Respond Fast */}
            <section className="tip-card tip-yellow">
              <h3>
                <span className="tip-icon">⚡</span>
                Tip 3: Respond Fast
              </h3>
              <p className="tip-impact">
                <strong>When job requests come in, speed matters!</strong> Clients often pick the first few pros who reply.
              </p>
              <p className="tip-description">
                Turn on push notifications, check the app regularly, and respond within minutes when possible.
                A quick "I'm available and interested!" can win you the job before competitors even see it.
              </p>
            </section>

            {/* Tip 4: Communicate Clearly */}
            <section className="tip-card tip-purple">
              <h3>
                <span className="tip-icon">💬</span>
                Tip 4: Communicate Clearly
              </h3>
              <p className="tip-impact">
                <strong>Keep messages polite and professional.</strong>
              </p>
              <div className="example-message">
                <p className="example-label">Example Message:</p>
                <p className="example-text">
                  "Hi there! Thanks for reaching out. I can assist with that tomorrow morning. Does 9am work for you?"
                </p>
              </div>
              <p className="tip-description">
                Be friendly, confirm details, ask questions if anything is unclear, and always follow up.
                Good communication builds confidence and leads to repeat business.
              </p>
            </section>

            {/* Tip 5: Collect Reviews */}
            <section className="tip-card tip-orange">
              <h3>
                <span className="tip-icon">⭐</span>
                Tip 5: Collect Reviews
              </h3>
              <p className="tip-impact">
                <strong>After each job, kindly ask your client to leave a review.</strong>
              </p>
              <p className="tip-description">
                Positive reviews boost your ranking and make future clients confident to hire you.
                A simple "If you're happy with my work, I'd really appreciate a review!" goes a long way.
                Reviews are your best marketing tool.
              </p>
            </section>

            {/* Tip 6: Go the Extra Mile */}
            <section className="tip-card tip-cyan">
              <h3>
                <span className="tip-icon">🔧</span>
                Tip 6: Go the Extra Mile
              </h3>
              <p className="tip-impact">
                <strong>A simple thank-you, clean workspace, or small gesture goes a long way.</strong>
              </p>
              <p className="tip-description">
                Happy clients bring repeat work — and referrals. Clean up after yourself, arrive on time,
                exceed expectations, and treat every job like it matters. Word-of-mouth is powerful on Fixxa!
              </p>
            </section>

            {/* Tip 7: Stay Active */}
            <section className="tip-card tip-light-green">
              <h3>
                <span className="tip-icon">🚀</span>
                Tip 7: Stay Active
              </h3>
              <p className="tip-impact">
                <strong>Log in regularly, update your profile, and keep your calendar accurate.</strong>
              </p>
              <p className="tip-description">
                The more active you are, the more Fixxa promotes you in search results. Set your availability
                correctly, respond to messages promptly, and stay engaged. Active professionals get more
                visibility and more jobs!
              </p>
            </section>

            {/* Bonus Tip */}
            <section className="bonus-tip">
              <h3>
                <span className="tip-icon">✨</span>
                Bonus Tip: Build Your Reputation
              </h3>
              <p>
                <strong>Consistency is key!</strong> Follow these tips regularly, deliver quality work, and watch
                your bookings grow. The top-rated professionals on Fixxa didn't get there overnight — they earned
                it through great service, one job at a time. You can too! 🎯
              </p>
            </section>

            {/* Call to Action */}
            <section className="tips-cta">
              <p className="cta-text">
                <strong>Ready to put these tips into action?</strong>
              </p>
              <div className="cta-buttons">
                <button
                  className="btn-primary-cta"
                  onClick={() => changeTab('profile')}
                >
                  Update My Profile
                </button>
                <button
                  className="btn-secondary-cta"
                  onClick={() => changeTab('overview')}
                >
                  Back to Dashboard
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Rules & Guidelines Tab */}
        {activeTab === 'rules-guidelines' && (
          <div className="rules-guidelines-tab">
            <h1>📜 Platform Rules & Guidelines</h1>

            {/* Important Notice Banner */}
            <div className="rules-notice-banner">
              <h3>⚠️ Important Notice</h3>
              <p>
                These rules protect you, our clients, and the integrity of the Fixxa platform. Violations may result in account suspension or permanent removal from the platform. Please read carefully and comply with all guidelines.
              </p>
            </div>

            {/* Communication Rules */}
            <section className="rule-section">
              <h3 className="rule-heading rule-danger">🚫 Prohibited: Sharing Contact Information</h3>
              <div className="rule-card rule-card-danger">
                <h4>You MUST NOT share or request:</h4>
                <ul className="rule-list">
                  <li>Phone numbers (yours or theirs)</li>
                  <li>Email addresses</li>
                  <li>WhatsApp, Telegram, or other messaging app contacts</li>
                  <li>Social media profiles (Facebook, Instagram, etc.)</li>
                  <li>Physical addresses before booking approval</li>
                </ul>
                <div className="rule-warning-box">
                  <strong>⚠️ Warning:</strong>
                  <p>
                    All messages are monitored. Sharing contact info or screenshots containing contact details will result in immediate account suspension.
                  </p>
                </div>
              </div>
              <p className="rule-explanation">
                ✅ <strong>Why?</strong> Keeping communication on-platform protects both parties, ensures quality service, and allows us to help resolve disputes.
              </p>
            </section>

            {/* Payment Guidelines */}
            <section className="rule-section">
              <h3 className="rule-heading rule-success">💳 Payment Guidelines & Best Practices</h3>
              <div className="rule-card rule-card-success">
                <h4>✅ Accepted Payment Methods:</h4>
                <ul className="rule-list">
                  <li><strong>Bank Transfer (EFT) - RECOMMENDED</strong> - Safest option with clear payment trail</li>
                  <li>Cash - Only upon job completion and with receipt</li>
                  <li>Mobile payment apps (SnapScan, Zapper, etc.)</li>
                </ul>

                <div className="rule-important-box">
                  <strong>⚠️ IMPORTANT - Always Provide Receipts:</strong>
                  <p>
                    <strong>You MUST provide a receipt for every payment received.</strong> This protects both you and the client. Include: Date, service description, amount paid, and your contact details.
                  </p>
                </div>

                <h4 style={{marginTop: '1rem'}}>✅ Payment Best Practices:</h4>
                <ul className="rule-list">
                  <li>Discuss and agree on pricing BEFORE starting any work</li>
                  <li>For large jobs, a deposit (30-50%) is acceptable</li>
                  <li>Collect final payment only after work is completed to client's satisfaction</li>
                  <li>Keep your own records of all payments received</li>
                  <li>If a client disputes payment, report it through the Fixxa platform</li>
                </ul>
              </div>

              <div className="rule-danger-box">
                <strong>🚫 Never Accept:</strong>
                <p>
                  Cryptocurrency, gift cards, or suspicious payment methods. If a client requests unusual payment methods, report it to Fixxa support immediately.
                </p>
              </div>

              <p className="rule-explanation">
                ✅ <strong>Why these guidelines?</strong> Following safe payment practices protects your earnings, builds trust with clients, and helps resolve disputes if they occur.
              </p>
            </section>

            {/* Professional Conduct */}
            <section className="rule-section">
              <h3 className="rule-heading rule-success">✅ Required: Professional Conduct</h3>
              <div className="rule-card rule-card-success">
                <h4>You MUST:</h4>
                <ul className="rule-list">
                  <li>✅ Respond to messages within 24 hours</li>
                  <li>✅ Provide accurate availability and pricing information</li>
                  <li>✅ Show up on time for confirmed bookings</li>
                  <li>✅ Complete jobs to the best of your ability</li>
                  <li>✅ Be respectful and professional at all times</li>
                  <li>✅ Report any issues or disputes through the platform</li>
                  <li>✅ Update your profile with accurate qualifications</li>
                  <li>✅ Upload legitimate certifications and credentials</li>
                </ul>
              </div>
            </section>

            {/* Booking & Scheduling Rules */}
            <section className="rule-section">
              <h3 className="rule-heading rule-info">📅 Booking & Scheduling Guidelines</h3>
              <div className="rule-card rule-card-info">
                <ul className="rule-list">
                  <li><strong>Accept/Decline Promptly:</strong> Respond to booking requests within 24 hours</li>
                  <li><strong>No Last-Minute Cancellations:</strong> Canceling less than 12 hours before a booking may affect your rating</li>
                  <li><strong>Reschedule Requests:</strong> Use the platform's reschedule feature, don't arrange outside</li>
                  <li><strong>Availability Updates:</strong> Keep your schedule current to avoid double bookings</li>
                  <li><strong>No-Shows:</strong> Failing to show up without notice can result in account suspension</li>
                </ul>
              </div>
            </section>

            {/* Image & Content Guidelines */}
            <section className="rule-section">
              <h3 className="rule-heading rule-secondary">📸 Image & Content Guidelines</h3>
              <div className="rule-card rule-card-secondary">
                <h4>Profile Photos & Portfolio:</h4>
                <ul className="rule-list">
                  <li>❌ No screenshots containing contact information</li>
                  <li>❌ No inappropriate, offensive, or misleading images</li>
                  <li>✅ Use professional photos of your actual work</li>
                  <li>✅ Ensure photos are clear and well-lit</li>
                  <li>✅ Only upload work you personally completed</li>
                </ul>
                <div className="rule-important-box">
                  <strong>Note:</strong>
                  <p>
                    Workers cannot send images to clients (security measure). Clients can share job photos with you.
                  </p>
                </div>
              </div>
            </section>

            {/* Verification & Certification Rules */}
            <section className="rule-section">
              <h3 className="rule-heading rule-purple">🎓 Verification & Certification Rules</h3>
              <div className="rule-card rule-card-purple">
                <ul className="rule-list">
                  <li><strong>No Fake Certificates:</strong> Only upload genuine, verifiable credentials</li>
                  <li><strong>Accurate Information:</strong> All profile information must be truthful</li>
                  <li><strong>Verification Process:</strong> Submit required documents promptly for verification</li>
                  <li><strong>Update Expired Credentials:</strong> Keep certifications current</li>
                </ul>
                <div className="rule-danger-box">
                  <strong>⚠️ Serious Violation:</strong>
                  <p>
                    Submitting fake certifications or credentials will result in immediate permanent ban and potential legal action.
                  </p>
                </div>
              </div>
            </section>

            {/* Dispute Resolution */}
            <section className="rule-section">
              <h3 className="rule-heading rule-warning">⚖️ Dispute Resolution</h3>
              <div className="rule-card rule-card-warning">
                <p style={{marginTop: 0}}><strong>If you have a problem with a client or booking:</strong></p>
                <ul className="rule-list">
                  <li>✅ Contact admin support through the "Contact & Feedback" tab</li>
                  <li>✅ Provide screenshots of messages (if relevant)</li>
                  <li>✅ Explain the issue clearly and professionally</li>
                  <li>❌ Do NOT contact the client outside the platform</li>
                  <li>❌ Do NOT leave negative public comments</li>
                  <li>❌ Do NOT retaliate or harass the client</li>
                </ul>
              </div>
            </section>

            {/* Consequences Section */}
            <section className="consequences-section">
              <h3>🚨 Consequences of Rule Violations</h3>
              <div className="consequences-content">
                <div className="consequence-level">
                  <h4>First Offense:</h4>
                  <ul>
                    <li>⚠️ Written warning</li>
                    <li>⚠️ 7-day account suspension</li>
                    <li>⚠️ Visibility reduction in search results</li>
                  </ul>
                </div>

                <div className="consequence-level">
                  <h4>Second Offense:</h4>
                  <ul>
                    <li>🚫 30-day account suspension</li>
                    <li>🚫 Loss of verification status</li>
                    <li>🚫 Pending earnings held for review</li>
                  </ul>
                </div>

                <div className="consequence-level">
                  <h4>Third Offense / Serious Violations:</h4>
                  <ul>
                    <li>❌ Permanent account termination</li>
                    <li>❌ Forfeiture of all pending earnings</li>
                    <li>❌ Ban from re-registering on Fixxa</li>
                    <li>❌ Potential legal action (for fraud or serious misconduct)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Acknowledgment Section */}
            <section className="acknowledgment-section">
              <h3>✅ Acknowledgment</h3>
              <p>
                By using the Fixxa platform, you acknowledge that you have read, understood, and agree to comply with all rules and guidelines outlined above. These rules are in place to create a safe, fair, and professional environment for everyone.
              </p>
              <p className="last-updated">
                Last updated: January 2025
              </p>
            </section>
          </div>
        )}

        {/* Contact & Feedback Tab */}
        {activeTab === 'contact-feedback' && (
          <div className="contact-feedback-tab">
            <h1>📞 Contact & Feedback</h1>

            {/* Contact Admin Section */}
            <section className="contact-section">
              <h3>📞 Contact Admin Support</h3>
              <p className="section-description">
                Have a question, issue, or need help? Send us a message and we'll get back to you as soon as possible.
              </p>

              <form onSubmit={handleContactSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="contactSubject">Subject *</label>
                  <select
                    id="contactSubject"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    required
                    className="form-select"
                  >
                    <option value="">-- Select a topic --</option>
                    <option value="Account Issue">Account Issue</option>
                    <option value="Payment/Billing Question">Payment/Billing Question</option>
                    <option value="Booking Problem">Booking Problem</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Profile/Verification Help">Profile/Verification Help</option>
                    <option value="Client Dispute">Client Dispute</option>
                    <option value="General Question">General Question</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="contactMessage">Message *</label>
                  <textarea
                    id="contactMessage"
                    rows="6"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    className="form-textarea"
                    placeholder="Please describe your question or issue in detail..."
                  />
                  <small className="form-hint">Be as specific as possible so we can help you quickly</small>
                </div>

                <button type="submit" className="btn-submit btn-submit-contact">
                  📤 Send Message to Admin
                </button>
              </form>

              {contactStatus.show && (
                <div className={`status-message status-${contactStatus.type}`}>
                  {contactStatus.message}
                </div>
              )}
            </section>

            {/* Feature Suggestions Section */}
            <section className="suggestions-section">
              <h3>💡 Suggest a Feature or Improvement</h3>
              <p className="section-description">
                We're constantly improving Fixxa! Share your ideas for new features or improvements you'd like to see.
              </p>

              <form onSubmit={handleSuggestionSubmit} className="suggestion-form">
                <div className="form-group">
                  <label htmlFor="suggestionCategory">Feature Category</label>
                  <select
                    id="suggestionCategory"
                    value={suggestionCategory}
                    onChange={(e) => setSuggestionCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="">-- Optional: Select category --</option>
                    <option value="Booking System">Booking System</option>
                    <option value="Messaging">Messaging</option>
                    <option value="Profile/Portfolio">Profile/Portfolio</option>
                    <option value="Payments">Payments</option>
                    <option value="Search/Discovery">Search/Discovery</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="Notifications">Notifications</option>
                    <option value="Analytics/Reports">Analytics/Reports</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="suggestionText">Your Suggestion *</label>
                  <textarea
                    id="suggestionText"
                    rows="6"
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    required
                    className="form-textarea"
                    placeholder="Describe your feature idea or improvement suggestion..."
                  />
                  <small className="form-hint">What problem would this solve? How would it help you?</small>
                </div>

                <button type="submit" className="btn-submit btn-submit-suggestion">
                  💡 Submit Suggestion
                </button>
              </form>

              {suggestionStatus.show && (
                <div className={`status-message status-${suggestionStatus.type}`}>
                  {suggestionStatus.message}
                </div>
              )}
            </section>

            {/* Recent Submissions Section */}
            <section className="submissions-section">
              <h3>📝 Your Recent Submissions</h3>
              <p className="section-description">Track your support tickets and feature suggestions</p>

              <div className="submissions-list">
                {submissions.length === 0 ? (
                  <div className="no-submissions">
                    <p>No submissions yet</p>
                    <small>Your contact messages and suggestions will appear here</small>
                  </div>
                ) : (
                  submissions.map((submission) => (
                    <div key={submission.id} className="submission-card">
                      <div className="submission-header">
                        <span className={`submission-type type-${submission.type.toLowerCase()}`}>
                          {submission.type}
                        </span>
                        <span className="submission-date">{submission.date}</span>
                      </div>
                      <div className="submission-body">
                        <strong>{submission.subject}</strong>
                      </div>
                      <div className="submission-footer">
                        <span className={`submission-status status-${submission.status.toLowerCase()}`}>
                          {submission.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Welcome Video Modal - First Time Only */}
      {showWelcomeVideo && (
        <div className="welcome-video-modal">
          <div className="welcome-video-content">
            <h2>🎬 Welcome to Fixxa!</h2>
            <p>
              Before you dive in, take a few minutes to watch this helpful tutorial on how to use
              the platform, manage bookings, and grow your business on Fixxa.
            </p>

            <div className="welcome-video-container">
              <iframe
                src="https://www.youtube.com/embed/eloSnb-dKRE?si=sd9JQ-3nwaHfDRgG"
                title="Fixxa Tutorial - How to Get Started"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            <p className="welcome-video-tip">
              💡 You can always access this video from the <strong>Getting Started</strong> section in the side menu.
            </p>

            <button className="btn-welcome-close" onClick={handleCloseWelcomeVideo}>
              Got It, Let's Get Started!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
