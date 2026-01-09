import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Auto-redirect countdown
  useEffect(() => {
    if (!autoRedirect) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, autoRedirect]);

  const handleStayOnPage = () => {
    setAutoRedirect(false);
  };

  // Suggest helpful links based on user status
  const getQuickLinks = () => {
    if (isAuthenticated) {
      if (user?.type === 'professional') {
        return [
          { to: '/worker-dashboard', label: 'My Dashboard', icon: '📊' },
          { to: '/messages', label: 'Messages', icon: '✉️' },
          { to: '/settings', label: 'Settings', icon: '⚙️' },
        ];
      } else {
        return [
          { to: '/client-dashboard', label: 'My Dashboard', icon: '📊' },
          { to: '/service', label: 'Find Services', icon: '🔍' },
          { to: '/messages', label: 'Messages', icon: '✉️' },
        ];
      }
    } else {
      return [
        { to: '/service', label: 'Browse Services', icon: '🔍' },
        { to: '/login', label: 'Login', icon: '🔐' },
        { to: '/register', label: 'Sign Up', icon: '✨' },
      ];
    }
  };

  const popularPages = [
    { to: '/', label: 'Home', icon: '🏠' },
    { to: '/about', label: 'About Us', icon: 'ℹ️' },
    { to: '/contact', label: 'Contact', icon: <img src="/images/icons-fixxa/phone-call_3059446.png" alt="Contact" style={{ width: '20px', height: '20px' }} /> },
    { to: '/faq', label: 'FAQ', icon: '❓' },
  ];

  return (
    <div className="notfound-container">
      <div className="notfound-content">
        {/* 404 Animation */}
        <div className="error-animation">
          <div className="error-code">
            <span className="four">4</span>
            <span className="zero">
              <svg viewBox="0 0 100 100" className="magnifying-glass">
                <circle cx="40" cy="40" r="25" fill="none" stroke="currentColor" strokeWidth="4" />
                <line x1="58" y1="58" x2="75" y2="75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="four">4</span>
          </div>
        </div>

        {/* Main Message */}
        <div className="error-message">
          <h1>Page Not Found</h1>
          <p className="error-description">
            Oops! The page you're looking for seems to have wandered off.
            <br />
            It might have been moved, deleted, or never existed.
          </p>
        </div>

        {/* Auto-redirect Notice */}
        {autoRedirect && (
          <div className="auto-redirect-notice">
            <div className="countdown-circle">
              <svg className="countdown-svg" viewBox="0 0 100 100">
                <circle
                  className="countdown-bg"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="8"
                />
                <circle
                  className="countdown-progress"
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#228b22"
                  strokeWidth="8"
                  strokeDasharray={`${(countdown / 10) * 283} 283`}
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="50"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="countdown-text"
                >
                  {countdown}
                </text>
              </svg>
            </div>
            <p>
              Redirecting to home in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
            <button className="btn-cancel-redirect" onClick={handleStayOnPage}>
              Stay on this page
            </button>
          </div>
        )}

        {/* Quick Links */}
        <div className="quick-links-section">
          <h2>Quick Links</h2>
          <div className="links-grid">
            {getQuickLinks().map((link, index) => (
              <Link key={index} to={link.to} className="quick-link-card">
                <span className="link-icon">{link.icon}</span>
                <span className="link-label">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Pages */}
        <div className="popular-pages-section">
          <h3>Popular Pages</h3>
          <div className="popular-links">
            {popularPages.map((page, index) => (
              <Link key={index} to={page.to} className="popular-link">
                <span className="page-icon">{page.icon}</span>
                {page.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Search Suggestion */}
        <div className="search-suggestion">
          <p>Looking for something specific?</p>
          <Link to="/service" className="btn-search">
            🔍 Browse All Services
          </Link>
        </div>

        {/* Main CTA */}
        <div className="main-actions">
          <Link to="/" className="btn-primary">
            🏠 Back to Home
          </Link>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            ← Go Back
          </button>
        </div>

        {/* Help Section */}
        <div className="help-section">
          <p className="help-text">
            Still can't find what you're looking for?
          </p>
          <div className="help-links">
            <Link to="/contact">Contact Support</Link>
            <span className="separator">•</span>
            <Link to="/faq">View FAQ</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
