import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => {
    // Check for error in sessionStorage on mount
    const savedError = sessionStorage.getItem('loginError');
    if (savedError) {
      sessionStorage.removeItem('loginError');
      return savedError;
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');

    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);
      console.log('Login result in component:', result);
      console.log('Redirect URL:', result.redirect);
      console.log('User:', result.user);

      if (result.success) {
        // Clear error on success
        setError('');
        // Use the redirect URL from the backend (handles admin, professional, client)
        if (result.redirect) {
          console.log('Has redirect, checking value:', result.redirect);
          // Convert HTML routes to React routes
          if (result.redirect === '/admin.html') {
            console.log('Redirecting to /admin');
            // Use window.location for admin to force full page reload with updated session
            window.location.href = '/admin';
          } else if (result.redirect === '/worker-dashboard') {
            console.log('Redirecting to /worker-dashboard');
            navigate('/worker-dashboard');
          } else if (result.redirect === '/client-dashboard') {
            console.log('Redirecting to /client-dashboard');
            navigate('/client-dashboard');
          } else {
            console.log('Redirecting to:', result.redirect);
            navigate(result.redirect);
          }
        } else {
          console.log('No redirect in result, using fallback');
          // Fallback based on user type
          const userType = result.user?.type;
          console.log('User type:', userType);
          if (userType === 'professional') {
            navigate('/worker-dashboard');
          } else if (userType === 'client') {
            navigate('/client-dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        // Save error to sessionStorage in case page refreshes
        const errorMsg = result.error || 'Incorrect email or password. Please try again.';
        sessionStorage.setItem('loginError', errorMsg);
        // Keep loading state active briefly to prevent password manager from triggering
        setTimeout(() => {
          setError(errorMsg);
          setLoading(false);
        }, 100);
        return; // Exit early, don't set loading to false yet
      }
    } catch (err) {
      // Save error to sessionStorage in case page refreshes
      const errorMsg = 'An error occurred. Please try again.';
      sessionStorage.setItem('loginError', errorMsg);
      // Keep loading state active briefly to prevent password manager from triggering
      setTimeout(() => {
        setError(errorMsg);
        setLoading(false);
      }, 100);
      console.error('Login error:', err);
      return; // Exit early, don't set loading to false yet
    }

    // Only set loading to false on success
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo/Header */}
        <div className="login-header">
          <h1 className="login-logo">Fixxa</h1>
          <p className="login-tagline">Sign in to continue</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form" action="javascript:void(0);" method="post">
          {/* Email Input */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          {/* Password Input */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={loading}
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
          </div>

          {/* Forgot Password Link */}
          <div className="form-footer">
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="signup-link">
          Don't have an account?{' '}
          <Link to="/register">Sign up</Link>
        </div>

        {/* Back to Home */}
        <div className="back-to-home">
          <Link to="/">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
