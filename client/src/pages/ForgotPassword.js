import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

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
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/forgot-password`, {
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
          text: data.message || 'If that email is registered, a password reset link has been sent.',
          type: 'success',
        });
        setEmailSent(true);
      } else {
        setMessage({
          text: data.error || 'An error occurred. Please try again.',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setMessage({
        text: 'Network error. Please check your connection and try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    // Reuse the same submit logic
    await handleSubmit(new Event('submit'));
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        {/* Header */}
        <div className="forgot-password-header">
          <h1>Reset Password</h1>
          <p className="forgot-password-subtitle">
            {emailSent
              ? 'Check your email'
              : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {/* Success State */}
        {emailSent ? (
          <div className="email-sent-state">
            <div className="success-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Email Sent!</h2>
            <p className="success-message">
              We've sent a password reset link to <strong>{email}</strong>.
              <br />
              Please check your inbox and spam folder.
            </p>
            <div className="email-instructions">
              <p>The reset link will expire in 24 hours.</p>
              <p>If you don't receive the email within a few minutes:</p>
              <ul>
                <li>Check your spam or junk folder</li>
                <li>Make sure you entered the correct email address</li>
                <li>Try resending the email</li>
              </ul>
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
          <>
            {/* Message Display */}
            {message.text && (
              <div className={`message ${message.type}`}>
                <span className="message-icon">
                  {message.type === 'success' ? '✓' : '⚠'}
                </span>
                {message.text}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="forgot-password-form">
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
                  Enter the email address associated with your account
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
                  'Send Reset Link'
                )}
              </button>
            </form>
          </>
        )}

        {/* Footer Links */}
        <div className="forgot-password-footer">
          <div className="divider">
            <span>or</span>
          </div>
          <div className="footer-links">
            <Link to="/login" className="link-secondary">
              ← Back to Login
            </Link>
            <span className="separator">•</span>
            <Link to="/resend-verification" className="link-secondary">
              Resend Verification Email
            </Link>
          </div>
          <div className="help-text">
            <p>
              Need help? <Link to="/contact">Contact Support</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
