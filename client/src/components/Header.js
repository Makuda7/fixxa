import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!isAuthenticated) return;

      try {
        const response = await fetch('/api/messages/unread-count', {
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

    fetchUnreadCount();
  }, [isAuthenticated]);

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
          <img src="/images/fixxa-logo.png" alt="Fixxa Logo" />
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

      {/* Desktop Navigation Links */}
      <nav className="nav-links desktop-nav">
        <Link to="/">Find Service</Link>
        <Link to="/about">About Us</Link>
        <Link to="/join">Join Our Team</Link>

        {!isAuthenticated ? (
          <Link to="/login" className="login-link">Log in / Register</Link>
        ) : (
          <>
            {/* Messages Icon */}
            <Link to="/messages" className="inbox-icon-link" title="Messages">
              <span className="inbox-icon">✉️</span>
              {unreadCount > 0 && (
                <span className="inbox-notification-dot"></span>
              )}
            </Link>
          </>
        )}
      </nav>

      {/* Mobile Burger Menu */}
      <div className={`mobile-menu ${showMobileMenu ? 'mobile-active' : ''}`}>
        <div className="mobile-menu-header">
          {isAuthenticated && (
            <div className="mobile-user-greeting">
              <div className="user-avatar">
                {(user?.name || 'User').charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || 'User'}</span>
                <span className="user-type">{user?.type === 'professional' ? 'Professional' : 'Client'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mobile-menu-links">
          <Link to="/" onClick={closeMobileMenu}>
            <span className="menu-icon">🏠</span>
            Find Service
          </Link>
          <Link to="/about" onClick={closeMobileMenu}>
            <span className="menu-icon">ℹ️</span>
            About Us
          </Link>
          <Link to="/join" onClick={closeMobileMenu}>
            <span className="menu-icon">👷</span>
            Join Our Team
          </Link>

          {isAuthenticated ? (
            <>
              <div className="menu-divider"></div>
              <Link to="/messages" onClick={closeMobileMenu}>
                <span className="menu-icon">✉️</span>
                Messages
                {unreadCount > 0 && (
                  <span className="menu-notification-badge">{unreadCount}</span>
                )}
              </Link>
              <Link
                to={user?.type === 'professional' ? '/worker-dashboard' : '/client-dashboard'}
                onClick={closeMobileMenu}
              >
                <span className="menu-icon">👤</span>
                Profile
              </Link>
              <Link to="/settings" onClick={closeMobileMenu}>
                <span className="menu-icon">⚙️</span>
                Settings
              </Link>
              <div className="menu-divider"></div>
              <button className="menu-logout-btn" onClick={handleLogout}>
                <span className="menu-icon">🚪</span>
                Log out
              </button>
            </>
          ) : (
            <>
              <div className="menu-divider"></div>
              <Link to="/login" className="menu-login-btn" onClick={closeMobileMenu}>
                Log in / Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
