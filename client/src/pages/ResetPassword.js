import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import './ResetPassword.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [tokenValid, setTokenValid] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
  const [resetSuccess, setResetSuccess] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    // Check if token exists
    if (!token) {
      setTokenValid(false);
      setMessage({
        text: 'Invalid or missing reset token. Please request a new password reset link.',
        type: 'error',
      });
    }
  }, [token]);

  // Password strength calculator
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, text: '', color: '' });
      return;
    }

    let score = 0;
    let text = '';
    let color = '';

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Complexity checks
    if (/[a-z]/.test(password)) score += 1; // lowercase
    if (/[A-Z]/.test(password)) score += 1; // uppercase
    if (/[0-9]/.test(password)) score += 1; // numbers
    if (/[^a-zA-Z0-9]/.test(password)) score += 1; // special chars

    // Determine strength
    if (score <= 2) {
      text = 'Weak';
      color = '#dc3545';
    } else if (score <= 4) {
      text = 'Fair';
      color = '#ffc107';
    } else if (score <= 5) {
      text = 'Good';
      color = '#17a2b8';
    } else {
      text = 'Strong';
      color = '#28a745';
    }

    setPasswordStrength({ score, text, color });
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // Validation
    if (!password || !confirmPassword) {
      setMessage({ text: 'Please fill in all fields', type: 'error' });
      return;
    }

    if (password.length < 8) {
      setMessage({ text: 'Password must be at least 8 characters long', type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: 'Passwords do not match', type: 'error' });
      return;
    }

    if (passwordStrength.score < 3) {
      setMessage({
        text: 'Password is too weak. Please use a stronger password with a mix of letters, numbers, and symbols.',
        type: 'error',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          text: data.message || 'Password reset successful! You can now log in with your new password.',
          type: 'success',
        });
        setResetSuccess(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setMessage({
          text: data.error || 'Failed to reset password. The link may have expired.',
          type: 'error',
        });

        // If token expired, mark as invalid
        if (data.error?.includes('expired') || data.error?.includes('invalid')) {
          setTokenValid(false);
        }
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setMessage({
        text: 'Network error. Please check your connection and try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // If token is invalid, show error state
  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="error-state">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Invalid Reset Link</h2>
            <p className="error-message">
              This password reset link is invalid or has expired.
              <br />
              Reset links are only valid for 24 hours.
            </p>
            <div className="error-actions">
              <Link to="/forgot-password" className="btn-primary">
                Request New Reset Link
              </Link>
              <Link to="/login" className="btn-secondary">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="success-state">
            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2>Password Reset Successful!</h2>
            <p className="success-message">
              Your password has been changed successfully.
              <br />
              Redirecting you to login...
            </p>
            <div className="redirect-info">
              <div className="spinner"></div>
              <p>You'll be redirected in a moment, or click below to login now.</p>
              <Link to="/login" className="btn-primary">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        {/* Header */}
        <div className="reset-password-header">
          <h1>Set New Password</h1>
          <p className="reset-password-subtitle">
            Enter your new password below
          </p>
        </div>

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
        <form onSubmit={handleSubmit} className="reset-password-form">
          {/* New Password */}
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                disabled={loading}
                autoFocus
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(passwordStrength.score / 6) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  ></div>
                </div>
                <span
                  className="strength-text"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.text}
                </span>
              </div>
            )}

            <small className="form-hint">
              Use at least 8 characters with a mix of letters, numbers, and symbols
            </small>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {/* Match Indicator */}
            {confirmPassword && (
              <div className="password-match">
                {password === confirmPassword ? (
                  <span className="match-success">✓ Passwords match</span>
                ) : (
                  <span className="match-error">✗ Passwords do not match</span>
                )}
              </div>
            )}
          </div>

          {/* Security Tips */}
          <div className="security-tips">
            <p className="tips-title">Password Requirements:</p>
            <ul>
              <li className={password.length >= 8 ? 'valid' : ''}>
                At least 8 characters
              </li>
              <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'valid' : ''}>
                Mix of uppercase and lowercase letters
              </li>
              <li className={/[0-9]/.test(password) ? 'valid' : ''}>
                At least one number
              </li>
              <li className={/[^a-zA-Z0-9]/.test(password) ? 'valid' : ''}>
                At least one special character (!@#$%^&*)
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-submit"
            disabled={loading || password !== confirmPassword || passwordStrength.score < 3}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="reset-password-footer">
          <div className="footer-links">
            <Link to="/login" className="link-secondary">
              ← Back to Login
            </Link>
            <span className="separator">•</span>
            <Link to="/forgot-password" className="link-secondary">
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
