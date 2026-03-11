import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();

  const [modal, setModal] = useState({ visible: false, text: '', items: [], type: '' });
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

  const [loading, setLoading] = useState(false);

  const showMessage = (text, type, items = []) => {
    setModal({ visible: true, text, items, type });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: '', items: [], type: '' });

    // Collect all validation errors upfront
    const errors = [];
    if (!formData.type) errors.push('Please select account type.');
    if (!formData.name) errors.push('Full name is required.');
    if (!formData.email) errors.push('Email address is required.');
    if (!formData.phone) errors.push('Phone number is required.');
    if (!formData.city) errors.push('City/Town is required.');
    if (!formData.password) errors.push('Password is required.');
    else if (formData.password.length < 8) errors.push('Password must be at least 8 characters.');
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number.');
    if (formData.password && formData.password !== formData.password2) errors.push('Passwords do not match.');
    if (formData.type === 'professional' && !formData.speciality) errors.push('Speciality is required for professionals.');
    if (formData.type === 'professional' && !formData.experience) errors.push('Years of experience is required for professionals.');
    if (!formData.referralSource) errors.push('Please tell us how you heard about Fixxa.');
    if (!formData.safetyAccepted) errors.push('You must accept the Safety Guidelines.');
    if (!formData.termsAccepted) errors.push('You must accept the Terms of Service and Privacy Policy.');

    if (errors.length > 0) {
      showMessage('Please fix the following before submitting:', 'error', errors);
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

      if (res.status === 429) {
        showMessage('Too many registration attempts. Please wait 1 hour and try again.', 'error');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        if (data.details && data.details.length > 0) {
          showMessage('Please fix the following:', 'error', data.details.map(d => d.message));
        } else {
          showMessage(data.error || 'Registration failed. Please try again.', 'error');
        }
        return;
      }

      if (data.success) {
        showMessage(data.message || 'Registration successful! Please check your email to verify your account.', 'success');

        if (formData.type === 'professional') {
          setTimeout(() => {
            showMessage('Your professional account is pending admin approval. You will receive an email once approved.', 'info');
          }, 3000);
        } else {
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } else {
        showMessage(data.error || 'Registration failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showMessage('Network error. Please check your connection and try again.', 'error');
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
              placeholder="Min 8 chars, uppercase, lowercase & number"
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

        <div className="login-link">
          Already have an account? <Link to="/login">Log In</Link>
        </div>
      </div>

      {modal.visible && (
        <div className="reg-modal-overlay">
          <div className={`reg-modal reg-modal--${modal.type}`}>
            <p><strong>{modal.text}</strong></p>
            {modal.items.length > 0 && (
              <ul>
                {modal.items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            )}
            <button className="reg-modal-ok" onClick={() => setModal({ ...modal, visible: false })}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
