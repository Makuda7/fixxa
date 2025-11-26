import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      // TODO: Fetch unread message count when endpoint is implemented
      // fetchUnreadCount();
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
      // Silently fail - endpoint may not exist yet
      console.log('Unread count endpoint not available');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setShowMobileMenu(false);
  };

  const closeMobileMenu = () => {
    setShowMobileMenu(false);
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src="/images/fixxa-logo-new.png" alt="Fixxa Logo" />
        </Link>
      </div>

      {/* Burger Menu Button */}
      <button
        className={`burger-menu ${showMobileMenu ? 'active' : ''}`}
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay" onClick={closeMobileMenu}></div>
      )}

      {/* Navigation Links - Desktop & Mobile */}
      <nav className={`nav-links ${showMobileMenu ? 'mobile-active' : ''}`}>
        <Link to="/" onClick={closeMobileMenu}>Find Service</Link>
        <Link to="/about" onClick={closeMobileMenu}>About Us</Link>
        <Link to="/join" onClick={closeMobileMenu}>Join Our Team</Link>

        {!isAuthenticated ? (
          <Link to="/login" className="login-link" onClick={closeMobileMenu}>Log in / Register</Link>
        ) : (
          <>
            {/* Inbox Icon */}
            <Link to="/messages" className="inbox-icon-link" title="Messages" onClick={closeMobileMenu}>
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
                <Link to="/settings" onClick={closeMobileMenu}>Settings</Link>
                <button
                  onClick={() => {
                    console.log('Profile clicked, user type:', user?.type);
                    if (user?.type === 'professional') {
                      // Workers use React dashboard
                      console.log('Redirecting to: /worker-dashboard');
                      navigate('/worker-dashboard');
                    } else {
                      // Clients use React dashboard
                      console.log('Redirecting to: /client-dashboard');
                      navigate('/client-dashboard');
                    }
                    closeMobileMenu();
                  }}
                  style={{ textAlign: 'left', width: '100%', border: 'none', background: 'none', cursor: 'pointer', padding: '8px' }}
                >
                  Profile
                </button>
                <Link to="/messages" style={{ position: 'relative' }} onClick={closeMobileMenu}>
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
