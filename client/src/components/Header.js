import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
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
    setShowMenuDropdown(false);
  };

  const closeDropdown = () => {
    setShowMenuDropdown(false);
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src="/images/fixxa-logo.png" alt="Fixxa Logo" />
        </Link>
      </div>

      <nav className="nav-links">
        <Link to="/">Find Service</Link>
        <Link to="/about">About Us</Link>
        <Link to="/join">Join Our Team</Link>

        {isAuthenticated && (
          <>
            <Link to="/messages" className="nav-link-with-badge">
              Messages
              {unreadCount > 0 && (
                <span className="nav-notification-badge">{unreadCount}</span>
              )}
            </Link>
            <Link to={user?.type === 'professional' ? '/worker-dashboard' : '/client-dashboard'}>
              Profile
            </Link>
            <Link to="/settings">Settings</Link>
          </>
        )}

        {/* Menu Dropdown */}
        <div className="menu-dropdown-container">
          <button
            className="menu-icon-btn"
            onClick={() => setShowMenuDropdown(!showMenuDropdown)}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {showMenuDropdown && (
            <>
              <div className="menu-overlay" onClick={closeDropdown}></div>
              <div className="menu-dropdown">
                {!isAuthenticated ? (
                  <Link to="/login" className="menu-login-link" onClick={closeDropdown}>
                    Log in / Register
                  </Link>
                ) : (
                  <button className="menu-logout-link" onClick={handleLogout}>
                    Log out
                  </button>
                )}
                <div className="menu-divider"></div>
                <Link to="/contact" onClick={closeDropdown}>Contact Us</Link>
                <Link to="/faq" onClick={closeDropdown}>FAQ</Link>
                <Link to="/support" onClick={closeDropdown}>Feedback</Link>
                <Link to="/terms" onClick={closeDropdown}>Terms and Conditions</Link>
                <Link to="/safety" onClick={closeDropdown}>Safety and Security</Link>
                <Link to="/privacy" onClick={closeDropdown}>Privacy Policy</Link>
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
