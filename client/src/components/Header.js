import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
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
    setShowUserDropdown(false);
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

        {!isAuthenticated ? (
          <Link to="/login" className="login-link">Log in / Register</Link>
        ) : (
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
            <button className="logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
