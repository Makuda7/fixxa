import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    type: '',
    name: '',
    email: '',
    phone: '',
    city: '',
    suburb: '',
    password: '',
    password2: '',
    speciality: '',
    experience: '',
    referralSource: '',
    safetyAccepted: false,
    termsAccepted: false
  });

  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    // Validation
    if (!formData.type) {
      setMessage({ text: 'Please select account type.', type: 'error' });
      return;
    }
    if (!formData.safetyAccepted) {
      setMessage({ text: 'You must accept the Safety Guidelines to register.', type: 'error' });
      return;
    }
    if (!formData.termsAccepted) {
      setMessage({ text: 'You must accept the Terms of Service, Privacy Policy, and Safety Guidelines to register.', type: 'error' });
      return;
    }
    if (!formData.referralSource) {
      setMessage({ text: 'Please tell us how you heard about Fixxa.', type: 'error' });
      return;
    }
    if (formData.password !== formData.password2) {
      setMessage({ text: 'Passwords do not match!', type: 'error' });
      return;
    }
    if (formData.type === 'professional' && !formData.speciality) {
      setMessage({ text: 'Speciality is required for professionals.', type: 'error' });
      return;
    }
    if (formData.type === 'professional' && !formData.experience) {
      setMessage({ text: 'Years of experience is required for professionals.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        type: formData.type,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        password: formData.password,
        acceptTerms: formData.termsAccepted,
        referralSource: formData.referralSource
      };

      if (formData.suburb) payload.suburb = formData.suburb;
      if (formData.type === 'professional') {
        payload.speciality = formData.speciality;
        payload.experience = formData.experience;
      }

      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setMessage({
          text: data.message || 'Registration successful! Please check your email to verify your account.',
          type: 'success'
        });

        // If professional, show pending approval message
        if (formData.type === 'professional') {
          setTimeout(() => {
            setMessage({
              text: 'Your professional account is pending admin approval. You will receive an email once approved.',
              type: 'info'
            });
          }, 3000);
        } else {
          // Auto-login for clients after email verification reminder
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } else {
        setMessage({ text: data.error || 'Registration failed', type: 'error' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isProfessional = formData.type === 'professional';

  return (
    <div className="register-container">
      <div className="register-card">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1>Create Account</h1>
        </Link>
        <p className="subtitle">Join Fixxa Today</p>

        <form onSubmit={handleSubmit}>
          {/* Account Type */}
          <div className="form-group">
            <label htmlFor="type">I am a:</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="">Select account type</option>
              <option value="client">Client (Looking for help)</option>
              <option value="professional">Professional (Offering services)</option>
            </select>
          </div>

          {/* Professional Notice */}
          {isProfessional && (
            <div className="professional-notice">
              <strong>Professional Account:</strong> Your account will be reviewed by our team before approval.
            </div>
          )}

          {/* Basic Info */}
          <div className="form-group">
            <label htmlFor="name">Full Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number:</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g., 0821234567"
              required
            />
            <small>10-digit mobile number</small>
          </div>

          <div className="form-group">
            <label htmlFor="city">City/Town:</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g., Johannesburg, Cape Town"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="suburb">Suburb (Optional):</label>
            <input
              type="text"
              id="suburb"
              name="suburb"
              value={formData.suburb}
              onChange={handleChange}
              placeholder="e.g., Sandton, Rosebank"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              minLength="6"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password2">Confirm Password:</label>
            <input
              type="password"
              id="password2"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              placeholder="Re-enter password"
              required
            />
          </div>

          {/* Professional Fields */}
          {isProfessional && (
            <>
              <div className="form-group">
                <label htmlFor="speciality">Speciality:</label>
                <input
                  type="text"
                  id="speciality"
                  name="speciality"
                  value={formData.speciality}
                  onChange={handleChange}
                  placeholder="e.g., Plumber, Electrician, Carpenter, Painter"
                  required={isProfessional}
                />
                <small>Examples: Plumber, Electrician, Carpenter, Painter, Gardener, Cleaner, etc.</small>
              </div>

              <div className="form-group">
                <label htmlFor="experience">Years of Experience:</label>
                <select
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required={isProfessional}
                >
                  <option value="">Select experience level</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="2-3 years">2-3 years</option>
                  <option value="3-4 years">3-4 years</option>
                  <option value="4-5 years">4-5 years</option>
                  <option value="5-6 years">5-6 years</option>
                  <option value="6-7 years">6-7 years</option>
                  <option value="7-8 years">7-8 years</option>
                  <option value="8-9 years">8-9 years</option>
                  <option value="9-10 years">9-10 years</option>
                  <option value="10+ years">10+ years</option>
                </select>
                <small>Select your years of professional experience in this field</small>
              </div>
            </>
          )}

          {/* Referral Source */}
          <div className="form-group">
            <label htmlFor="referralSource">How did you hear about Fixxa?</label>
            <select
              id="referralSource"
              name="referralSource"
              value={formData.referralSource}
              onChange={handleChange}
              required
            >
              <option value="">Please select</option>
              <option value="Google Search">Google Search</option>
              <option value="Social Media (Facebook, Instagram, etc.)">Social Media (Facebook, Instagram, etc.)</option>
              <option value="Friend or Family">Friend or Family</option>
              <option value="Flyer or Poster">Flyer or Poster</option>
              <option value="Online Ad">Online Ad</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Legal Consent */}
          <div className="consent-box">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="safetyAccepted"
                name="safetyAccepted"
                checked={formData.safetyAccepted}
                onChange={handleChange}
                required
              />
              <label htmlFor="safetyAccepted">
                I confirm that I am at least 18 years old and agree to Fixxa's{' '}
                <a href="/safety" target="_blank" rel="noopener noreferrer">
                  Safety Guidelines
                </a>
              </label>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="termsAccepted"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleChange}
                required
              />
              <label htmlFor="termsAccepted">
                I agree to Fixxa's{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>
                ,{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                , and{' '}
                <a href="/safety" target="_blank" rel="noopener noreferrer">
                  Safety Guidelines
                </a>
              </label>
            </div>
          </div>

          <button type="submit" className="btn-register" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="login-link">
          Already have an account? <Link to="/login">Log In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
