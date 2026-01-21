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
                {/* Mobile-only nav links */}
                <div className="mobile-nav-links">
                  <Link to="/" onClick={closeDropdown}>Find Service</Link>
                  <Link to="/about" onClick={closeDropdown}>About Us</Link>
                  <Link to="/join" onClick={closeDropdown}>Join Our Team</Link>
                  <div className="menu-divider"></div>
                </div>

                {!isAuthenticated ? (
                  <>
                    <Link to="/login" className="menu-login-link" onClick={closeDropdown}>
                      Log in / Register
                    </Link>
                    <div className="menu-divider"></div>
                    <Link to="/contact" onClick={closeDropdown}>Contact Us</Link>
                    <Link to="/faq" onClick={closeDropdown}>FAQ</Link>
                    <Link to="/support" onClick={closeDropdown}>Feedback</Link>
                    <Link to="/terms" onClick={closeDropdown}>Terms and Conditions</Link>
                    <Link to="/safety" onClick={closeDropdown}>Safety and Security</Link>
                    <Link to="/privacy" onClick={closeDropdown}>Privacy Policy</Link>
                  </>
                ) : (
                  <>
                    <Link to={user?.type === 'professional' ? '/worker-dashboard' : '/client-dashboard'} onClick={closeDropdown}>
                      <img src="/images/icons-fixxa/home_13317809.png" alt="Dashboard" style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '6px' }} />
                      Dashboard
                    </Link>
                    <Link to={user?.type === 'professional' ? '/worker-dashboard#messages' : '/messages'} className="menu-link-with-badge" onClick={closeDropdown}>
                      <img src="/images/icons-fixxa/speech-bubble_159778.png" alt="Messages" style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '6px' }} />
                      Messages
                      {unreadCount > 0 && (
                        <span className="menu-notification-badge">{unreadCount}</span>
                      )}
                    </Link>
                    <Link to={user?.type === 'professional' ? '/worker-dashboard#profile' : '/client-dashboard'} onClick={closeDropdown}>
                      Profile
                    </Link>
                    <Link to="/settings" onClick={closeDropdown}>
                      <img src="/images/icons-fixxa/setting_5736401.png" alt="Settings" style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '6px' }} />
                      Settings
                    </Link>
                    <div className="menu-divider"></div>

                    {/* Worker-specific menu items */}
                    {user?.type === 'professional' ? (
                      <>
                        <Link to="/worker-dashboard?tab=getting-started" onClick={closeDropdown}>🎬 Getting Started</Link>
                        <Link to="/worker-dashboard?tab=fixxa-tips" onClick={closeDropdown}>
                          <img src="/images/icons-fixxa/lightbulb_857433.png" alt="Tips" style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '6px' }} />
                          FixxaTips
                        </Link>
                        <Link to="/worker-dashboard?tab=rules-guidelines" onClick={closeDropdown}>📜 Rules & Guidelines</Link>
                        <Link to="/worker-dashboard?tab=contact-feedback" onClick={closeDropdown}>
                          <img src="/images/icons-fixxa/phone-call_3059446.png" alt="Contact" style={{ width: '16px', height: '16px', verticalAlign: 'middle', marginRight: '6px' }} />
                          Contact & Feedback
                        </Link>
                      </>
                    ) : (
                      /* Client menu items */
                      <>
                        <Link to="/contact" onClick={closeDropdown}>Contact Us</Link>
                        <Link to="/faq" onClick={closeDropdown}>FAQ</Link>
                        <Link to="/support" onClick={closeDropdown}>Feedback</Link>
                        <Link to="/terms" onClick={closeDropdown}>Terms and Conditions</Link>
                        <Link to="/safety" onClick={closeDropdown}>Safety and Security</Link>
                        <Link to="/privacy" onClick={closeDropdown}>Privacy Policy</Link>
                      </>
                    )}

                    <div className="menu-divider"></div>
                    <button className="menu-logout-link" onClick={handleLogout}>
                      Log out
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
