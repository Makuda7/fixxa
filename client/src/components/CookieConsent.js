import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, cannot be disabled
    functional: true,
    analytics: true,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after a short delay for better UX
      setTimeout(() => {
        setShowBanner(true);
      }, 1000);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
      } catch (e) {
        console.error('Failed to parse cookie consent:', e);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    savePreferences(allAccepted);
  };

  const handleRejectOptional = () => {
    const minimalConsent = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    savePreferences(minimalConsent);
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs) => {
    localStorage.setItem('cookieConsent', JSON.stringify(prefs));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowBanner(false);
    setShowPreferences(false);

    // Trigger any analytics/marketing scripts based on consent
    if (window.gtag && prefs.analytics) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
  };

  const handlePreferenceChange = (key) => {
    if (key === 'necessary') return; // Cannot disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="cookie-consent-banner">
        <div className="cookie-consent-content">
          <div className="cookie-icon">🍪</div>
          <div className="cookie-text">
            <h3>We value your privacy</h3>
            <p>
              We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
              By clicking "Accept All", you consent to our use of cookies.{' '}
              <Link to="/privacy" className="cookie-link">Learn more</Link>
            </p>
          </div>
          <div className="cookie-actions">
            <button onClick={() => setShowPreferences(true)} className="btn-preferences">
              Customize
            </button>
            <button onClick={handleRejectOptional} className="btn-reject">
              Reject Optional
            </button>
            <button onClick={handleAcceptAll} className="btn-accept">
              Accept All
            </button>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="cookie-preferences-overlay" onClick={() => setShowPreferences(false)}>
          <div className="cookie-preferences-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preferences-header">
              <h2>Cookie Preferences</h2>
              <button
                className="close-preferences"
                onClick={() => setShowPreferences(false)}
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="preferences-body">
              <p className="preferences-description">
                We use cookies to improve your experience on our platform. You can choose which types of cookies to allow below.
              </p>

              {/* Necessary Cookies */}
              <div className="cookie-category">
                <div className="category-header">
                  <div className="category-info">
                    <h3>
                      Necessary Cookies
                      <span className="always-active">Always Active</span>
                    </h3>
                    <p>
                      These cookies are essential for the website to function properly. They enable core functionality
                      such as security, network management, and accessibility.
                    </p>
                  </div>
                  <label className="cookie-toggle disabled">
                    <input
                      type="checkbox"
                      checked={preferences.necessary}
                      disabled
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="cookie-category">
                <div className="category-header">
                  <div className="category-info">
                    <h3>Functional Cookies</h3>
                    <p>
                      These cookies enable personalized features like remembering your preferences,
                      saved searches, and language settings.
                    </p>
                  </div>
                  <label className="cookie-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={() => handlePreferenceChange('functional')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="cookie-category">
                <div className="category-header">
                  <div className="category-info">
                    <h3>Analytics Cookies</h3>
                    <p>
                      These cookies help us understand how visitors interact with our website by collecting
                      and reporting information anonymously.
                    </p>
                  </div>
                  <label className="cookie-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => handlePreferenceChange('analytics')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="cookie-category">
                <div className="category-header">
                  <div className="category-info">
                    <h3>Marketing Cookies</h3>
                    <p>
                      These cookies are used to track visitors across websites to display relevant
                      and engaging advertisements.
                    </p>
                  </div>
                  <label className="cookie-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={() => handlePreferenceChange('marketing')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="preferences-footer-note">
                <p>
                  For more information about how we use cookies and process your data,
                  please read our <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms of Service</Link>.
                </p>
              </div>
            </div>

            <div className="preferences-footer">
              <button onClick={handleRejectOptional} className="btn-reject-footer">
                Reject Optional
              </button>
              <button onClick={handleSavePreferences} className="btn-save-preferences">
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;
