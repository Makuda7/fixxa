import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

const Settings = () => {
  console.log('Settings component loaded - v2.0');
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: ''
  });
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('/images/default-profile.svg');

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState('');

  // Location state
  const [locationEnabled, setLocationEnabled] = useState(false);

  // Notification preferences state
  const [notifications, setNotifications] = useState({
    emailMessages: true,
    emailBookings: true,
    emailCompletions: true,
    emailReschedule: true,
    emailPromotions: false,
    smsEnabled: false
  });

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
    loadNotificationPreferences();
    loadLocationSettings();
  }, [user]);

  const loadProfileData = async () => {
    try {
      // Use worker profile endpoint for workers
      const endpoint = user?.type === 'worker' ? '/api/workers/profile' : '/api/user/profile';
      console.log('Loading profile from:', endpoint, 'User type:', user?.type);
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      console.log('Profile data received:', data);
      if (data.success) {
        // For workers, the data is in data.profile, for clients it's in data.user
        const profile = user?.type === 'worker' ? data.profile : data.user;
        console.log('Extracted profile data:', profile);

        if (profile) {
          setProfileData({
            fullName: profile.name || '',
            phone: profile.phone || '',
            address: profile.address || profile.area || '',
            city: profile.city || '',
            postalCode: profile.postal_code || ''
          });
          if (profile.profile_picture || profile.profile_pic) {
            setProfilePicPreview(profile.profile_picture || profile.profile_pic);
          }
          console.log('Profile data state updated successfully');
        } else {
          console.error('Profile is null or undefined');
        }
      } else {
        console.error('API response success is false:', data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadNotificationPreferences = () => {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
  };

  const loadLocationSettings = () => {
    const enabled = localStorage.getItem('locationEnabled') === 'true';
    setLocationEnabled(enabled);
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image must be less than 5MB', 'error');
        return;
      }
      setProfilePic(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    console.log('Profile submit clicked', profileData);

    try {
      const formData = new FormData();
      formData.append('name', profileData.fullName);
      formData.append('phone', profileData.phone);
      formData.append('address', profileData.address);
      formData.append('city', profileData.city);
      formData.append('postal_code', profileData.postalCode);
      if (profilePic) {
        formData.append('profile_pic', profilePic);
      }

      console.log('Sending profile update request...');
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        body: formData,
        credentials: 'include'
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers.get('content-type'));

      const responseText = await res.text();
      console.log('Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response:', data);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned invalid response');
      }

      if (data.success) {
        showNotification('Profile updated successfully!');
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      showNotification(error.message, 'error');
    }
  };

  const calculatePasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10 && /[0-9]/.test(password) && /[a-zA-Z]/.test(password)) return 'medium';
    if (password.length >= 10 && /[0-9]/.test(password) && /[a-zA-Z]/.test(password) && /[^a-zA-Z0-9]/.test(password)) return 'strong';
    return 'medium';
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });
    if (name === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification('Passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showNotification('Password must be at least 8 characters', 'error');
      return;
    }

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        showNotification('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordStrength('');
      } else {
        throw new Error(data.error || 'Failed to change password');
      }
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const handleLocationToggle = () => {
    const newValue = !locationEnabled;
    setLocationEnabled(newValue);
    localStorage.setItem('locationEnabled', newValue.toString());

    if (newValue) {
      navigator.geolocation.getCurrentPosition(
        () => showNotification('Location enabled successfully!'),
        () => showNotification('Failed to access location', 'error')
      );
    } else {
      localStorage.removeItem('userLocation');
      showNotification('Location disabled');
    }
  };

  const handleNotificationChange = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem('notificationPreferences', JSON.stringify(updated));
    showNotification('Notification preferences updated!');
  };

  const handleDataExport = async () => {
    try {
      const res = await fetch('/api/user/export-data', {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fixxa-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showNotification('Your data has been exported successfully!');
    } catch (error) {
      showNotification('Failed to export data: ' + error.message, 'error');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.\n\n' +
      'All your data including:\n' +
      '• Profile information\n' +
      '• Booking history\n' +
      '• Messages\n' +
      '• Reviews\n\n' +
      'will be permanently deleted.'
    );

    if (!confirmed) return;

    const password = window.prompt('Please enter your password to confirm account deletion:');

    if (!password) {
      showNotification('Account deletion cancelled', 'info');
      return;
    }

    const finalConfirm = window.confirm(
      'FINAL WARNING: This will permanently delete your account and all associated data.\n\n' +
      'Type your email to confirm: ' + (user?.email || '')
    );

    if (!finalConfirm) {
      showNotification('Account deletion cancelled', 'info');
      return;
    }

    try {
      const res = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        showNotification('Your account has been deleted. Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  return (
    <div className="settings-page">
      {/* Mobile Sidebar Toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setShowMobileSidebar(!showMobileSidebar)}
      >
        ☰ Menu
      </button>

      {/* Settings Sidebar */}
      <nav className={`settings-sidebar ${showMobileSidebar ? 'show' : ''}`}>
        <a
          className={activeSection === 'profile' ? 'active' : ''}
          onClick={() => { setActiveSection('profile'); setShowMobileSidebar(false); }}
        >
          <span>👤</span> Profile
        </a>
        <a
          className={activeSection === 'security' ? 'active' : ''}
          onClick={() => { setActiveSection('security'); setShowMobileSidebar(false); }}
        >
          <span>🔒</span> Security
        </a>
        <a
          className={activeSection === 'location' ? 'active' : ''}
          onClick={() => { setActiveSection('location'); setShowMobileSidebar(false); }}
        >
          <span><img src="/images/icons-fixxa/travel.png" alt="Location" style={{ width: '18px', height: '18px', verticalAlign: 'middle' }} /></span> Location
        </a>
        <a
          className={activeSection === 'notifications' ? 'active' : ''}
          onClick={() => { setActiveSection('notifications'); setShowMobileSidebar(false); }}
        >
          <span>🔔</span> Notifications
        </a>
        <a
          className={activeSection === 'privacy' ? 'active' : ''}
          onClick={() => { setActiveSection('privacy'); setShowMobileSidebar(false); }}
        >
          <span>🛡️</span> Privacy & Data
        </a>
      </nav>

      {/* Main Settings Content */}
      <main className="settings-main">
        <div className="breadcrumb">
          <Link to={user?.type === 'worker' ? '/worker-dashboard' : '/client-dashboard'}>
            ← Back to Dashboard
          </Link>
        </div>

        <div className="page-header">
          <h1>Account Settings</h1>
          <p>Manage your profile, security, and preferences</p>
        </div>

        {/* Profile Section */}
        {activeSection === 'profile' && (
          <section className="settings-section">
            <h2>Profile Information</h2>

            <div className="profile-pic-upload">
              <img src={profilePicPreview} alt="Profile" className="profile-pic-preview" />
              <div>
                <label className="upload-btn">
                  Choose New Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePicChange}
                    style={{ display: 'none' }}
                  />
                </label>
                <small>JPG, PNG or GIF. Max 5MB.</small>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
                <small>Used for booking confirmations and important updates</small>
              </div>

              <div className="form-group">
                <label htmlFor="address">Street Address</label>
                <input
                  type="text"
                  id="address"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  value={profileData.city}
                  onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  placeholder="Your city"
                />
              </div>

              <div className="form-group">
                <label htmlFor="postalCode">Postal Code</label>
                <input
                  type="text"
                  id="postalCode"
                  value={profileData.postalCode}
                  onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
                  placeholder="12345"
                />
              </div>

              <button type="submit" className="btn-primary">
                Save Profile Changes
              </button>
            </form>
          </section>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <section className="settings-section">
            <h2>Account Security</h2>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
              />
              <small>Contact support to change your email address</small>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  required
                />
                <small>Must be at least 8 characters with letters and numbers</small>
                {passwordStrength && (
                  <div className="password-strength-container">
                    <div className="password-strength">
                      <div className={`password-strength-bar ${passwordStrength}`}></div>
                    </div>
                    <span className={`password-strength-label ${passwordStrength}`}>
                      {passwordStrength === 'weak' && '⚠️ Weak'}
                      {passwordStrength === 'medium' && '✓ Medium'}
                      {passwordStrength === 'strong' && '✓✓ Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button type="submit" className="btn-primary">
                Change Password
              </button>
            </form>
          </section>
        )}

        {/* Location Section */}
        {activeSection === 'location' && (
          <section className="settings-section">
            <h2>Location & Privacy</h2>

            <div className="form-group">
              <label>Location Services</label>
              <div className="toggle-container">
                <input
                  type="checkbox"
                  id="locationToggle"
                  className="toggle-switch"
                  checked={locationEnabled}
                  onChange={handleLocationToggle}
                />
                <label htmlFor="locationToggle" className="toggle-label">
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">
                  {locationEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <small>Allow Fixxa to access your location to find nearby professionals</small>
            </div>
          </section>
        )}

        {/* Notifications Section */}
        {activeSection === 'notifications' && (
          <section className="settings-section">
            <h2>Notification Preferences</h2>
            <p style={{ marginBottom: '1rem', color: '#666' }}>Choose how you want to be notified</p>

            <h3>Email Notifications</h3>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="emailMessages"
                checked={notifications.emailMessages}
                onChange={() => handleNotificationChange('emailMessages')}
              />
              <label htmlFor="emailMessages">New messages from professionals</label>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="emailBookings"
                checked={notifications.emailBookings}
                onChange={() => handleNotificationChange('emailBookings')}
              />
              <label htmlFor="emailBookings">Booking confirmations and updates</label>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="emailCompletions"
                checked={notifications.emailCompletions}
                onChange={() => handleNotificationChange('emailCompletions')}
              />
              <label htmlFor="emailCompletions">Job completion requests</label>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="emailReschedule"
                checked={notifications.emailReschedule}
                onChange={() => handleNotificationChange('emailReschedule')}
              />
              <label htmlFor="emailReschedule">Reschedule and cancellation responses</label>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="emailPromotions"
                checked={notifications.emailPromotions}
                onChange={() => handleNotificationChange('emailPromotions')}
              />
              <label htmlFor="emailPromotions">Promotional offers and tips</label>
            </div>

            <h3>SMS Notifications</h3>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="smsEnabled"
                checked={notifications.smsEnabled}
                onChange={() => handleNotificationChange('smsEnabled')}
              />
              <label htmlFor="smsEnabled">Enable SMS notifications for urgent updates</label>
            </div>
          </section>
        )}

        {/* Privacy & Data Section */}
        {activeSection === 'privacy' && (
          <section className="settings-section">
            <h2>Privacy & Data Management</h2>
            <p style={{ marginBottom: '2rem', color: '#666' }}>
              Manage your data and privacy settings in compliance with POPIA regulations
            </p>

            {/* Data Export */}
            <div className="privacy-card">
              <div className="privacy-card-icon">📦</div>
              <div className="privacy-card-content">
                <h3>Export Your Data</h3>
                <p>
                  Download a copy of all your personal data including profile information,
                  booking history, messages, and reviews in JSON format.
                </p>
                <button onClick={handleDataExport} className="btn-secondary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export My Data
                </button>
              </div>
            </div>

            {/* POPIA Information */}
            <div className="privacy-card info">
              <div className="privacy-card-icon">ℹ️</div>
              <div className="privacy-card-content">
                <h3>Your Privacy Rights</h3>
                <p>Under POPIA (Protection of Personal Information Act), you have the right to:</p>
                <ul>
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing of your information</li>
                  <li>Lodge a complaint with the Information Regulator</li>
                </ul>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                  For privacy concerns, contact: <a href="mailto:privacy@fixxa.co.za">privacy@fixxa.co.za</a>
                </p>
              </div>
            </div>

            {/* Account Deletion */}
            <div className="privacy-card danger">
              <div className="privacy-card-icon">⚠️</div>
              <div className="privacy-card-content">
                <h3>Delete Account</h3>
                <p>
                  Permanently delete your account and all associated data. This action cannot be undone.
                  You will lose access to:
                </p>
                <ul>
                  <li>Your profile and personal information</li>
                  <li>All booking history and records</li>
                  <li>Messages and conversations</li>
                  <li>Reviews you've given or received</li>
                </ul>
                <button onClick={handleDeleteAccount} className="btn-danger">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  Delete My Account
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Notification Toast */}
      {notification.show && (
        <div className={`notification ${notification.type} show`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default Settings;
