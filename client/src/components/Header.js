import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      // Fetch unread message count
      fetchUnreadCount();
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/messages/unread-count', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src="/images/fixxa-logo-new.png" alt="Fixxa Logo" />
        </Link>
      </div>

      <nav className="nav-links">
        <Link to="/">Find Service</Link>
        <Link to="/about">About Us</Link>
        <Link to="/join">Join Our Team</Link>

        {!isAuthenticated ? (
          <Link to="/login" className="login-link">Log in / Register</Link>
        ) : (
          <>
            {/* Inbox Icon */}
            <Link to="/messages" className="inbox-icon-link" title="Messages">
              <span className="inbox-icon">✉️</span>
              {unreadCount > 0 && (
                <span className="inbox-notification-dot"></span>
              )}
            </Link>

            {/* User Menu */}
            <div className={`user-menu ${showUserMenu ? 'show' : ''}`}>
              <button
                className="user-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {user?.name || 'User'} ▼
              </button>
              <div className="user-dropdown">
                <Link to="/settings">Settings</Link>
                <Link to="/profile">Profile</Link>
                <Link to="/messages" style={{ position: 'relative' }}>
                  Messages
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </Link>
                <button onClick={handleLogout} style={{ color: 'red', textAlign: 'left', width: '100%', border: 'none', background: 'none', cursor: 'pointer', padding: '8px' }}>
                  Log out
                </button>
              </div>
            </div>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
