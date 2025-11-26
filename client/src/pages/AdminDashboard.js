import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Overview stats
  const [stats, setStats] = useState({
    totalProfessionals: 0,
    activeProfessionals: 0,
    verifiedProfessionals: 0,
    totalClients: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    inProgressBookings: 0
  });

  // Pending Workers
  const [pendingWorkers, setPendingWorkers] = useState([]);
  const [pendingWorkersBadge, setPendingWorkersBadge] = useState(0);

  // Profile Updates
  const [profileUpdates, setProfileUpdates] = useState([]);
  const [profileUpdatesBadge, setProfileUpdatesBadge] = useState(0);
  const [profileUpdatesFilter, setProfileUpdatesFilter] = useState('pending');

  // Certifications
  const [certifications, setCertifications] = useState([]);
  const [certificationsBadge, setCertificationsBadge] = useState(0);
  const [certFilter, setCertFilter] = useState('pending');
  const [selectedCert, setSelectedCert] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // Support Messages
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportBadge, setSupportBadge] = useState(0);
  const [supportFilter, setSupportFilter] = useState('pending');

  // Suggestions
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsBadge, setSuggestionsBadge] = useState(0);
  const [suggestionsFilter, setSuggestionsFilter] = useState('pending');

  // Professionals
  const [professionals, setProfessionals] = useState([]);

  // Clients
  const [clients, setClients] = useState([]);

  // Bookings
  const [recentBookings, setRecentBookings] = useState([]);

  // Settings
  const [settings, setSettings] = useState({
    vacationMode: false
  });

  // Modals
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentRejectingWorkerId, setCurrentRejectingWorkerId] = useState(null);
  const [showWorkerDetailModal, setShowWorkerDetailModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);

  useEffect(() => {
    // Check if user is admin using the isAdmin flag from backend
    if (!user || user.isAdmin !== true) {
      navigate('/');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'pending-workers') loadPendingWorkers();
    if (activeTab === 'profile-updates') loadProfileUpdates();
    if (activeTab === 'certifications') loadCertifications();
    if (activeTab === 'support') loadSupportMessages();
    if (activeTab === 'suggestions') loadSuggestions();
    if (activeTab === 'workers') loadProfessionals();
    if (activeTab === 'clients') loadClients();
    if (activeTab === 'settings') loadSettings();
  }, [activeTab, profileUpdatesFilter, certFilter, supportFilter, suggestionsFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRecentBookings(),
        loadBadgeCounts()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showMessage('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/admin/stats', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadBadgeCounts = async () => {
    try {
      // Load pending workers count
      const pendingWorkersRes = await fetch('/admin/pending-workers', { credentials: 'include' });
      const pendingWorkersData = await pendingWorkersRes.json();
      if (pendingWorkersData.success) {
        setPendingWorkersBadge(pendingWorkersData.workers.length);
      }

      // Load pending certifications count
      const certsRes = await fetch('/certifications/admin/all?status=pending', { credentials: 'include' });
      const certsData = await certsRes.json();
      if (certsData.success) {
        setCertificationsBadge(certsData.certifications.length);
      }

      // Load pending profile updates count
      const updatesRes = await fetch('/admin/profile-updates?status=pending', { credentials: 'include' });
      const updatesData = await updatesRes.json();
      if (updatesData.success) {
        setProfileUpdatesBadge(updatesData.updates.length);
      }

      // Load pending support messages count
      const supportRes = await fetch('/admin/support-messages?status=pending', { credentials: 'include' });
      const supportData = await supportRes.json();
      if (supportData.success) {
        setSupportBadge(supportData.messages.length);
      }

      // Load pending suggestions count
      const suggestionsRes = await fetch('/admin/feature-suggestions?status=pending', { credentials: 'include' });
      const suggestionsData = await suggestionsRes.json();
      if (suggestionsData.success) {
        setSuggestionsBadge(suggestionsData.suggestions.length);
      }
    } catch (error) {
      console.error('Error loading badge counts:', error);
    }
  };

  const loadRecentBookings = async () => {
    try {
      const response = await fetch('/admin/recent-bookings?limit=10', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setRecentBookings(data.bookings);
      }
    } catch (error) {
      console.error('Error loading recent bookings:', error);
    }
  };

  const loadPendingWorkers = async () => {
    try {
      const response = await fetch('/admin/pending-workers', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setPendingWorkers(data.workers);
        setPendingWorkersBadge(data.workers.length);
      }
    } catch (error) {
      console.error('Error loading pending workers:', error);
    }
  };

  const loadProfileUpdates = async () => {
    try {
      const url = profileUpdatesFilter === 'all'
        ? '/admin/profile-updates'
        : `/admin/profile-updates?status=${profileUpdatesFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setProfileUpdates(data.updates);
      }
    } catch (error) {
      console.error('Error loading profile updates:', error);
    }
  };

  const loadCertifications = async () => {
    try {
      const url = certFilter === 'all'
        ? '/certifications/admin/all'
        : `/certifications/admin/all?status=${certFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setCertifications(data.certifications);
      }
    } catch (error) {
      console.error('Error loading certifications:', error);
    }
  };

  const loadSupportMessages = async () => {
    try {
      const url = supportFilter === 'all'
        ? '/admin/support-messages'
        : `/admin/support-messages?status=${supportFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSupportMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading support messages:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const url = suggestionsFilter === 'all'
        ? '/admin/feature-suggestions'
        : `/admin/feature-suggestions?status=${suggestionsFilter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const loadProfessionals = async () => {
    try {
      const response = await fetch('/admin/professionals', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setProfessionals(data.professionals);
      }
    } catch (error) {
      console.error('Error loading professionals:', error);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch('/admin/clients', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/admin/settings', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    showMessage('Dashboard refreshed', 'success');
    setRefreshing(false);
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  const approveWorker = async (workerId) => {
    try {
      const response = await fetch(`/admin/approve-worker/${workerId}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message || 'Worker approved successfully', 'success');
        await loadPendingWorkers();
        await loadStats();
      } else {
        showMessage(data.error || 'Failed to approve worker', 'error');
      }
    } catch (error) {
      console.error('Error approving worker:', error);
      showMessage('Error approving worker', 'error');
    }
  };

  const openRejectModal = (workerId) => {
    setCurrentRejectingWorkerId(workerId);
    setRejectionReason('');
    setShowRejectionModal(true);
  };

  const rejectWorker = async () => {
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      showMessage('Please provide a detailed reason (minimum 10 characters)', 'error');
      return;
    }

    try {
      const response = await fetch(`/admin/reject-worker/${currentRejectingWorkerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason })
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message || 'Worker rejected', 'success');
        setShowRejectionModal(false);
        setRejectionReason('');
        setCurrentRejectingWorkerId(null);
        await loadPendingWorkers();
        await loadStats();
      } else {
        showMessage(data.error || 'Failed to reject worker', 'error');
      }
    } catch (error) {
      console.error('Error rejecting worker:', error);
      showMessage('Error rejecting worker', 'error');
    }
  };

  const approveCertification = async (certId) => {
    if (!window.confirm('Approve this certification? The professional will receive a verified badge.')) return;

    try {
      const response = await fetch(`/certifications/admin/approve/${certId}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message || 'Certification approved successfully', 'success');
        await loadCertifications();
        await loadProfessionals();
        await loadStats();
        setShowCertModal(false);
      } else {
        showMessage(data.error || 'Failed to approve certification', 'error');
      }
    } catch (error) {
      console.error('Error approving certification:', error);
      showMessage('Error approving certification', 'error');
    }
  };

  const rejectCertification = async (certId) => {
    const reason = window.prompt('Reason for rejection (optional):');
    if (reason === null) return;

    try {
      const response = await fetch(`/certifications/admin/reject/${certId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Certification rejected', 'success');
        await loadCertifications();
        setShowCertModal(false);
      } else {
        showMessage(data.error || 'Failed to reject certification', 'error');
      }
    } catch (error) {
      console.error('Error rejecting certification:', error);
      showMessage('Error rejecting certification', 'error');
    }
  };

  const reviewProfileUpdate = async (updateId, status) => {
    try {
      const response = await fetch(`/admin/profile-updates/${updateId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        showMessage(`Profile update ${status}`, 'success');
        await loadProfileUpdates();
      } else {
        showMessage(data.error || `Failed to ${status} update`, 'error');
      }
    } catch (error) {
      console.error('Error reviewing profile update:', error);
      showMessage('Error reviewing profile update', 'error');
    }
  };

  const resolveSupportMessage = async (messageId) => {
    try {
      const response = await fetch(`/admin/support-messages/${messageId}/resolve`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Support message marked as resolved', 'success');
        await loadSupportMessages();
        await loadBadgeCounts();
      } else {
        showMessage(data.error || 'Failed to resolve message', 'error');
      }
    } catch (error) {
      console.error('Error resolving support message:', error);
      showMessage('Error resolving support message', 'error');
    }
  };

  const reviewSuggestion = async (suggestionId, status) => {
    try {
      const response = await fetch(`/admin/feature-suggestions/${suggestionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (data.success) {
        showMessage(`Suggestion ${status}`, 'success');
        await loadSuggestions();
        await loadBadgeCounts();
      } else {
        showMessage(data.error || `Failed to ${status} suggestion`, 'error');
      }
    } catch (error) {
      console.error('Error reviewing suggestion:', error);
      showMessage('Error reviewing suggestion', 'error');
    }
  };

  const toggleProfessional = async (id) => {
    try {
      const response = await fetch(`/admin/toggle-professional/${id}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message, 'success');
        await loadProfessionals();
      } else {
        showMessage(data.error || 'Failed to toggle professional', 'error');
      }
    } catch (error) {
      console.error('Error toggling professional:', error);
      showMessage('Error toggling professional', 'error');
    }
  };

  const toggleVerified = async (workerId) => {
    try {
      const response = await fetch(`/admin/toggle-verified/${workerId}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage(data.message, 'success');
        await loadProfessionals();
        await loadStats();
      } else {
        showMessage(data.error || 'Failed to toggle verification', 'error');
      }
    } catch (error) {
      console.error('Error toggling verification:', error);
      showMessage('Error toggling verification', 'error');
    }
  };

  const toggleVacationMode = async () => {
    try {
      const newValue = !settings.vacationMode;
      const response = await fetch('/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vacationMode: newValue })
      });
      const data = await response.json();
      if (data.success) {
        setSettings({ ...settings, vacationMode: newValue });
        showMessage(`Vacation mode ${newValue ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showMessage(data.error || 'Failed to update settings', 'error');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      showMessage('Error updating settings', 'error');
    }
  };

  const testEmail = async () => {
    try {
      const response = await fetch('/admin/test-email', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Test email sent successfully! Check your inbox.', 'success');
      } else {
        showMessage(data.error || 'Failed to send test email', 'error');
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      showMessage('Error sending test email', 'error');
    }
  };

  const syncDatabaseSchema = async () => {
    if (!window.confirm('This will add missing columns to the production database. Continue?')) return;

    try {
      const response = await fetch('/admin/sync-database-schema', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        showMessage('Database schema synchronized successfully', 'success');
      } else {
        showMessage(data.error || 'Failed to sync database schema', 'error');
      }
    } catch (error) {
      console.error('Error syncing database schema:', error);
      showMessage('Error syncing database schema', 'error');
    }
  };

  const viewCertification = (cert) => {
    setSelectedCert(cert);
    setShowCertModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && activeTab === 'overview') {
    return (
      <div className="admin-dashboard">
        <div className="loading-overlay show">
          <div className="loading-spinner">
            <div>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Loading Overlay */}
      {refreshing && (
        <div className="loading-overlay show">
          <div className="loading-spinner">
            <div>Loading...</div>
          </div>
        </div>
      )}

      <div className="admin-container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>Fixxa Admin Dashboard</h1>
            <p>Manage your platform, view analytics, and control settings</p>
          </div>
          <div className="dashboard-header-right">
            <div className="user-email">{user?.email}</div>
            <button
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`message show ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`nav-tab ${activeTab === 'pending-workers' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending-workers')}
          >
            Pending Workers
            {pendingWorkersBadge > 0 && (
              <span className="badge">{pendingWorkersBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'profile-updates' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile-updates')}
          >
            Profile Updates
            {profileUpdatesBadge > 0 && (
              <span className="badge">{profileUpdatesBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'certifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('certifications')}
          >
            Certifications
            {certificationsBadge > 0 && (
              <span className="badge">{certificationsBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'support' ? 'active' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            Worker Support
            {supportBadge > 0 && (
              <span className="badge">{supportBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'suggestions' ? 'active' : ''}`}
            onClick={() => setActiveTab('suggestions')}
          >
            Feature Suggestions
            {suggestionsBadge > 0 && (
              <span className="badge">{suggestionsBadge}</span>
            )}
          </button>
          <button
            className={`nav-tab ${activeTab === 'workers' ? 'active' : ''}`}
            onClick={() => setActiveTab('workers')}
          >
            Professionals
          </button>
          <button
            className={`nav-tab ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            Clients
          </button>
          <button
            className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="tab-content active">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{stats.totalProfessionals || 0}</div>
                <div className="stat-label">Total Professionals</div>
                <div className="stat-subtext">
                  {stats.activeProfessionals || 0} active | {stats.verifiedProfessionals || 0} verified
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalClients || 0}</div>
                <div className="stat-label">Registered Clients</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalBookings || 0}</div>
                <div className="stat-label">Total Bookings</div>
                <div className="stat-subtext">{stats.pendingBookings || 0} pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.completedBookings || 0}</div>
                <div className="stat-label">Completed Jobs</div>
                <div className="stat-subtext">{stats.inProgressBookings || 0} in progress</div>
              </div>
            </div>

            {/* Website Analytics Section */}
            <div className="table-section" style={{ marginTop: '2rem' }}>
              <h3>Website Analytics</h3>
              <p style={{ color: '#666' }}>Track your website traffic and visitor behavior</p>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginTop: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#2d5016' }}>View Full Analytics</h4>
                <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  Access your complete Google Analytics dashboard for detailed insights, user demographics, traffic sources, and more.
                </p>
                <a
                  href="https://analytics.google.com/analytics/web/#/p467208493/reports/intelligenthome"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-block', textDecoration: 'none' }}
                >
                  Open Google Analytics Dashboard
                </a>
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    <strong>Property ID:</strong> G-48NETTXMR5<br />
                    <strong>Tracking Status:</strong> <span style={{ color: '#28a745', fontWeight: 600 }}>Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="table-section">
              <h3>Recent Bookings</h3>
              <p style={{ color: '#666' }}>Last 10 bookings on the platform</p>
              {recentBookings.length === 0 ? (
                <div className="no-data">No bookings yet</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Client</th>
                      <th>Worker</th>
                      <th>Service</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map(booking => (
                      <tr key={booking.id}>
                        <td>{booking.id}</td>
                        <td>{booking.client_name}</td>
                        <td>{booking.worker_name}</td>
                        <td>{booking.service_type}</td>
                        <td>{formatDate(booking.booking_date)}</td>
                        <td>
                          <span className={`status-badge status-${booking.status}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td>R{booking.total_price || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Pending Workers Tab */}
        {activeTab === 'pending-workers' && (
          <div className="tab-content active">
            <div className="table-section">
              <h3>Pending Worker Applications</h3>
              <p>Review and approve professionals who want to join Fixxa</p>

              {pendingWorkers.length === 0 ? (
                <div className="no-data">No pending applications</div>
              ) : (
                <div className="worker-grid">
                  {pendingWorkers.map(worker => (
                    <div key={worker.id} className="worker-card">
                      <div className="worker-header">
                        <div className="worker-info">
                          <h4>
                            {worker.email_verified ? '✓ ' : '⚠️ '}
                            {worker.name}
                            {!worker.email_verified && (
                              <span style={{ color: '#ff9800', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                Email Not Verified
                              </span>
                            )}
                          </h4>
                          <p>{worker.email} {worker.phone && `• ${worker.phone}`}</p>
                          <p><strong>Speciality:</strong> {worker.speciality}</p>
                          {worker.address && (
                            <p><strong>Location:</strong> {worker.address}, {worker.city}</p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.85rem', color: '#666' }}>
                            Applied: {formatDate(worker.created_at)}
                          </p>
                          {worker.cert_count > 0 && (
                            <p style={{ fontSize: '0.85rem', color: '#666' }}>
                              {worker.approved_cert_count}/{worker.cert_count} certs approved
                            </p>
                          )}
                        </div>
                      </div>

                      {worker.bio && (
                        <div style={{ margin: '1rem 0', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                          <strong>Bio:</strong>
                          <p style={{ margin: '0.5rem 0 0 0' }}>{worker.bio}</p>
                        </div>
                      )}

                      <div className="cert-actions">
                        <button
                          className="btn btn-success"
                          onClick={() => approveWorker(worker.id)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => openRejectModal(worker.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile Updates Tab */}
        {activeTab === 'profile-updates' && (
          <div className="tab-content active">
            <div style={{ background: '#fff3cd', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>Worker Profile Activity Tracker</h4>
              <p style={{ margin: 0, color: '#856404', fontSize: '0.9rem' }}>
                Track all profile changes made by workers. Review updates to ensure accuracy and verify new information added by professionals.
              </p>
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${profileUpdatesFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setProfileUpdatesFilter('pending')}
              >
                Pending Review
              </button>
              <button
                className={`filter-tab ${profileUpdatesFilter === 'reviewed' ? 'active' : ''}`}
                onClick={() => setProfileUpdatesFilter('reviewed')}
              >
                Reviewed
              </button>
              <button
                className={`filter-tab ${profileUpdatesFilter === 'all' ? 'active' : ''}`}
                onClick={() => setProfileUpdatesFilter('all')}
              >
                All
              </button>
            </div>

            {profileUpdates.length === 0 ? (
              <div className="no-data">No profile updates found</div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {profileUpdates.map(update => (
                  <div key={update.id} className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#2d5016' }}>{update.worker_name}</h4>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                          {update.worker_email} • {formatDate(update.changed_at)}
                        </p>
                      </div>
                      <span className={`status-badge status-${update.review_status || 'pending'}`}>
                        {update.review_status || 'Pending'}
                      </span>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}><strong>Field:</strong> {update.field_name}</p>
                      <p style={{ margin: '0.5rem 0' }}><strong>Old Value:</strong> {update.old_value || 'None'}</p>
                      <p style={{ margin: '0.5rem 0 0 0' }}><strong>New Value:</strong> {update.new_value}</p>
                    </div>
                    {update.review_status === 'pending' && (
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-success"
                          onClick={() => reviewProfileUpdate(update.id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => reviewProfileUpdate(update.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === 'certifications' && (
          <div className="tab-content active">
            <div className="table-section">
              <h3>Certification Management</h3>
              <p>Review and approve professional certifications</p>

              <div style={{ margin: '1rem 0', display: 'flex', gap: '0.5rem' }}>
                <button
                  className={`btn ${certFilter === 'pending' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setCertFilter('pending')}
                >
                  Pending
                </button>
                <button
                  className={`btn ${certFilter === 'approved' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setCertFilter('approved')}
                >
                  Approved
                </button>
                <button
                  className={`btn ${certFilter === 'rejected' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setCertFilter('rejected')}
                >
                  Rejected
                </button>
                <button
                  className={`btn ${certFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-small`}
                  onClick={() => setCertFilter('all')}
                >
                  All
                </button>
              </div>

              {certifications.length === 0 ? (
                <div className="no-data">No certifications found</div>
              ) : (
                <div className="cert-grid">
                  {certifications.map(cert => (
                    <div key={cert.id} className={`cert-card ${cert.status.toLowerCase()}`}>
                      <div className="cert-header">
                        <div className="cert-info">
                          <h4>
                            {cert.worker_name}
                            {cert.is_verified && <span className="verified-badge">✓ Verified</span>}
                          </h4>
                          <p>{cert.worker_email}</p>
                          <p><strong>{cert.speciality}</strong></p>
                        </div>
                        <span className={`status-badge status-${cert.status.toLowerCase()}`}>
                          {cert.status}
                        </span>
                      </div>

                      <div className="cert-details">
                        <p><strong>Document:</strong> {cert.document_name || 'Certification'}</p>
                        <p><strong>Uploaded:</strong> {formatDate(cert.uploaded_at)}</p>
                        <p><strong>Reviewed:</strong> {cert.reviewed_at ? formatDate(cert.reviewed_at) : 'Not reviewed'}</p>
                        {cert.reviewed_by_email && (
                          <p><strong>Reviewed By:</strong> {cert.reviewed_by_email}</p>
                        )}
                      </div>

                      <div className="cert-actions">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => viewCertification(cert)}
                        >
                          View Document
                        </button>
                        {cert.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-success btn-small"
                              onClick={() => approveCertification(cert.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => rejectCertification(cert.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Support Messages Tab */}
        {activeTab === 'support' && (
          <div className="tab-content active">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${supportFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setSupportFilter('pending')}
              >
                Pending
              </button>
              <button
                className={`filter-tab ${supportFilter === 'responded' ? 'active' : ''}`}
                onClick={() => setSupportFilter('responded')}
              >
                Responded
              </button>
              <button
                className={`filter-tab ${supportFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSupportFilter('all')}
              >
                All
              </button>
            </div>

            {supportMessages.length === 0 ? (
              <div className="no-data">No support messages found</div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {supportMessages.map(msg => (
                  <div key={msg.id} className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#2d5016' }}>{msg.subject}</h4>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                          From: <strong>{msg.worker_name}</strong> ({msg.worker_email})
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.85rem' }}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`status-badge status-${msg.status === 'pending' ? 'pending' : 'completed'}`}>
                        {msg.status}
                      </span>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
                    </div>
                    {msg.status === 'pending' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => resolveSupportMessage(msg.id)}
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="tab-content active">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${suggestionsFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setSuggestionsFilter('pending')}
              >
                Pending Review
              </button>
              <button
                className={`filter-tab ${suggestionsFilter === 'reviewed' ? 'active' : ''}`}
                onClick={() => setSuggestionsFilter('reviewed')}
              >
                Reviewed
              </button>
              <button
                className={`filter-tab ${suggestionsFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSuggestionsFilter('all')}
              >
                All
              </button>
            </div>

            {suggestions.length === 0 ? (
              <div className="no-data">No suggestions found</div>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {suggestions.map(sug => (
                  <div key={sug.id} className="card" style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#17a2b8' }}>{sug.category || 'General'}</h4>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                          From: <strong>{sug.worker_name}</strong> ({sug.worker_email})
                        </p>
                        <p style={{ margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.85rem' }}>
                          {new Date(sug.created_at).toLocaleString()}
                        </p>
                      </div>
                      <span className={`status-badge status-${sug.status === 'pending' ? 'pending' : 'completed'}`}>
                        {sug.status}
                      </span>
                    </div>
                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{sug.suggestion}</p>
                    </div>
                    {sug.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-success"
                          onClick={() => reviewSuggestion(sug.id, 'reviewed')}
                        >
                          Mark as Reviewed
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => reviewSuggestion(sug.id, 'rejected')}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Professionals Tab */}
        {activeTab === 'workers' && (
          <div className="tab-content active">
            <div className="table-section">
              <h3>Professional Management</h3>
              <p>View and manage all registered professionals on the platform</p>

              {professionals.length === 0 ? (
                <div className="no-data">No professionals found</div>
              ) : (
                <div className="worker-grid">
                  {professionals.map(worker => (
                    <div
                      key={worker.id}
                      className={`worker-card ${worker.availability === 'unavailable' ? 'unavailable' : ''}`}
                    >
                      <div className="worker-header">
                        <div className="worker-info">
                          <h4>
                            {worker.name}
                            {worker.is_verified && <span className="verified-badge">✓ Verified</span>}
                          </h4>
                          <p>{worker.email}</p>
                          <p><strong>{worker.speciality}</strong></p>
                        </div>
                        <span className={`status-badge status-${worker.availability}`}>
                          {worker.availability}
                        </span>
                      </div>

                      <div className="worker-stats">
                        <div className="worker-stat">
                          <div className="worker-stat-number">{worker.total_jobs || 0}</div>
                          <div className="worker-stat-label">Jobs</div>
                        </div>
                        <div className="worker-stat">
                          <div className="worker-stat-number">{worker.avg_rating || 0}</div>
                          <div className="worker-stat-label">Rating</div>
                        </div>
                        <div className="worker-stat">
                          <div className="worker-stat-number">{worker.review_count || 0}</div>
                          <div className="worker-stat-label">Reviews</div>
                        </div>
                      </div>

                      <div className="cert-actions">
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => toggleProfessional(worker.id)}
                        >
                          {worker.availability === 'available' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => toggleVerified(worker.id)}
                        >
                          {worker.is_verified ? 'Unverify' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="tab-content active">
            <div className="table-section">
              <h3>Client Management</h3>
              <p>View all registered clients on the platform</p>

              {clients.length === 0 ? (
                <div className="no-data">No clients found</div>
              ) : (
                <div className="clients-grid">
                  {clients.map(client => (
                    <div key={client.id} className="client-card">
                      <h4>{client.name}</h4>
                      <div className="client-info">
                        <p>{client.email}</p>
                        {client.phone && <p>Phone: {client.phone}</p>}
                        <p>Joined: {formatDate(client.created_at)}</p>
                      </div>
                      <div className="client-stats">
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2d5016' }}>
                            {client.total_bookings || 0}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>Bookings</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="tab-content active">
            <div className="settings-section">
              <h3>Platform Settings</h3>
              <div className="setting-item">
                <div className="setting-label">
                  <strong>Vacation Mode</strong>
                  <span>Temporarily disable new bookings across the entire platform</span>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.vacationMode}
                    onChange={toggleVacationMode}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-section" style={{ marginTop: '2rem' }}>
              <h3>Email System</h3>
              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <div className="setting-label">
                  <strong>Test Email Delivery</strong>
                  <span>Send a test email to verify SendGrid is working correctly</span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={testEmail}
                >
                  Send Test Email to My Inbox
                </button>
              </div>
            </div>

            <div className="settings-section" style={{ marginTop: '2rem' }}>
              <h3>Database Management</h3>
              <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                <div className="setting-label">
                  <strong>Synchronize Database Schema</strong>
                  <span style={{ color: '#dc3545', fontWeight: 600 }}>
                    CAUTION: This will add missing columns to the production database
                  </span>
                  <span style={{ display: 'block', marginTop: '0.5rem' }}>
                    This fixes all the "column does not exist" errors by adding missing database columns. Safe to run multiple times.
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={syncDatabaseSchema}
                >
                  Run Schema Sync
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Certification Modal */}
      {showCertModal && selectedCert && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Certification Preview</h3>
              <button className="modal-close" onClick={() => setShowCertModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {selectedCert.file_type?.includes('pdf') || selectedCert.document_url?.includes('.pdf') ? (
                <div>
                  <p><strong>Worker:</strong> {selectedCert.worker_name}</p>
                  <p><strong>Document:</strong> {selectedCert.document_name}</p>
                  <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <a
                      href={selectedCert.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ textAlign: 'center' }}
                    >
                      Open PDF in New Tab
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <img
                    src={selectedCert.document_url}
                    alt="Certification"
                    className="cert-preview"
                    style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', margin: '1rem 0' }}
                  />
                  <p><strong>Worker:</strong> {selectedCert.worker_name}</p>
                  <p><strong>Document:</strong> {selectedCert.document_name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="modal show">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reject Worker Application</h3>
              <button className="modal-close" onClick={() => setShowRejectionModal(false)}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                Provide a detailed reason for rejecting this application. The worker will be notified.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="5"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  fontFamily: 'inherit'
                }}
                placeholder="Enter rejection reason (minimum 10 characters)..."
              />
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRejectionModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={rejectWorker}
                >
                  Reject Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
