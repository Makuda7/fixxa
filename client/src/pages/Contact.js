import React, { useState } from 'react';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setShowSuccess(false);
    setShowError(false);

    try {
      const response = await fetch('/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (response.ok) {
        setShowSuccess(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });

        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setShowError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <main className="contact-container">
        <h1>Contact Us</h1>
        <p className="contact-intro">
          Have questions? We're here to help! Reach out to us through any of the methods below.
        </p>

        <div className="contact-methods">
          <div className="contact-card">
            <div className="contact-icon">📧</div>
            <h3>Email Us</h3>
            <p>Send us an email and we'll get back to you within 24 hours.</p>
            <a href="mailto:support@fixxa.co.za" className="contact-link">
              support@fixxa.co.za
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">📱</div>
            <h3>Call Us</h3>
            <p>Speak with our support team Monday to Friday, 8am - 5pm.</p>
            <a href="tel:+27704115192" className="contact-link">
              +27 70 411 5192
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">💬</div>
            <h3>WhatsApp</h3>
            <p>Message us on WhatsApp for quick support and updates.</p>
            <a
              href="https://wa.me/27704115192"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>

        <div className="contact-form-section">
          <h2>Send us a Message</h2>

          {showSuccess && (
            <div className="success-message">
              Thank you for contacting us! We'll get back to you soon.
            </div>
          )}

          {showError && (
            <div className="error-message">
              Something went wrong. Please try again or email us directly.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Your Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Your Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject *</label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
              >
                <option value="">Select a topic</option>
                <option value="general">General Inquiry</option>
                <option value="technical">Technical Support</option>
                <option value="billing">Billing Question</option>
                <option value="professional">Professional Account</option>
                <option value="complaint">Complaint</option>
                <option value="feedback">Feedback</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Contact;
