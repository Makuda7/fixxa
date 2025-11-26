import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ResendVerification.css';

const ResendVerification = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [emailSent, setEmailSent] = useState(false);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setIsAlreadyVerified(false);

    // Basic validation
    if (!email) {
      setMessage({ text: 'Please enter your email address', type: 'error' });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage({ text: 'Please enter a valid email address', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          text: data.message || 'Verification email sent! Please check your inbox.',
          type: 'success',
        });
        setEmailSent(true);
      } else {
        // Check if already verified
        if (data.error?.includes('already verified')) {
          setIsAlreadyVerified(true);
          setMessage({
            text: data.error,
            type: 'info',
          });
        } else {
          setMessage({
            text: data.error || 'An error occurred. Please try again.',
            type: 'error',
          });
        }
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage({
        text: 'Network error. Please check your connection and try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setEmailSent(false);
    await handleSubmit(new Event('submit'));
  };

  return (
    <div className="resend-verification-container">
      <div className="resend-verification-card">
        {/* Header */}
        <div className="resend-verification-header">
          <div className="header-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h1>Resend Verification Email</h1>
          <p className="resend-verification-subtitle">
            {emailSent
              ? 'Verification email sent!'
              : 'Enter your email to receive a new verification link'}
          </p>
        </div>

        {/* Already Verified State */}
        {isAlreadyVerified ? (
          <div className="already-verified-state">
            <div className="verified-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Already Verified!</h2>
            <p className="verified-message">
              Good news! Your email <strong>{email}</strong> is already verified.
              <br />
              You can log in to your account now.
            </p>
            <div className="verified-actions">
              <Link to="/login" className="btn-primary">
                Go to Login
              </Link>
            </div>
          </div>
        ) : emailSent ? (
          /* Email Sent State */
          <div className="email-sent-state">
            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Email Sent!</h2>
            <p className="success-message">
              We've sent a verification link to <strong>{email}</strong>.
              <br />
              Please check your inbox and spam folder.
            </p>

            <div className="email-instructions">
              <h3>Next Steps:</h3>
              <ol>
                <li>Open your email inbox</li>
                <li>Look for an email from Fixxa</li>
                <li>Click the verification link</li>
                <li>Return to login</li>
              </ol>

              <div className="help-section">
                <p className="help-title">Didn't receive the email?</p>
                <ul className="help-list">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes for the email to arrive</li>
                  <li>Try resending the email</li>
                </ul>
              </div>
            </div>

            <button
              type="button"
              className="btn-resend"
              onClick={handleResend}
              disabled={loading}
            >
              {loading ? 'Resending...' : 'Resend Email'}
            </button>
          </div>
        ) : (
          /* Form State */
          <>
            {/* Message Display */}
            {message.text && (
              <div className={`message ${message.type}`}>
                <span className="message-icon">
                  {message.type === 'success' ? '✓' : message.type === 'info' ? 'ℹ' : '⚠'}
                </span>
                {message.text}
              </div>
            )}

            {/* Why verify section */}
            <div className="why-verify-section">
              <h3>Why verify your email?</h3>
              <ul>
                <li>
                  <span className="check-icon">✓</span>
                  Secure your account
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  Receive important notifications
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  Access all platform features
                </li>
                <li>
                  <span className="check-icon">✓</span>
                  Build trust with other users
                </li>
              </ul>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="resend-verification-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  disabled={loading}
                  autoFocus
                  required
                />
                <small className="form-hint">
                  Enter the email address you used to register
                </small>
              </div>

              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : (
                  'Send Verification Email'
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="help-text">
              <p>
                <strong>Note:</strong> If you registered recently, please check your email first.
                The verification link is valid for 24 hours.
              </p>
            </div>
          </>
        )}

        {/* Footer Links */}
        <div className="resend-verification-footer">
          <div className="divider">
            <span>or</span>
          </div>
          <div className="footer-links">
            <Link to="/login" className="link-secondary">
              ← Back to Login
            </Link>
            <span className="separator">•</span>
            <Link to="/register" className="link-secondary">
              Create New Account
            </Link>
          </div>
          <div className="support-section">
            <p>
              Still having trouble? <Link to="/contact">Contact Support</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResendVerification;
