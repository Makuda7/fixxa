import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Support.css';

const Support = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqs = [
    {
      category: 'workers',
      question: 'How do I become a verified professional on Fixxa?',
      answer: 'To become verified, complete your profile with accurate information, upload a clear ID document, and provide proof of your skills (certifications, portfolio photos, or references). Our team will review your application within 2-3 business days.'
    },
    {
      category: 'workers',
      question: 'How much does it cost to join as a professional?',
      answer: 'Joining Fixxa as a professional is completely free! We only charge a small service fee (10-15%) when you successfully complete a job through our platform.'
    },
    {
      category: 'workers',
      question: 'How do I receive payments for completed jobs?',
      answer: 'Payments are processed securely through our platform. Once a job is marked as complete and the client confirms satisfaction, funds are released to your account within 3-5 business days. You can withdraw funds via EFT to your registered bank account.'
    },
    {
      category: 'workers',
      question: 'Can I set my own rates and availability?',
      answer: 'Yes! You have complete control over your rates and schedule. Set your hourly/daily rates in your profile, specify your available days (weekdays, weekends, or both), and update your calendar to reflect your availability.'
    },
    {
      category: 'workers',
      question: 'What if a client cancels a confirmed booking?',
      answer: 'If a client cancels within 24 hours of the scheduled time, you may be entitled to a cancellation fee. Review our cancellation policy in your dashboard or contact support for assistance.'
    },
    {
      category: 'clients',
      question: 'How do I find the right professional for my job?',
      answer: 'Use our search filters to find professionals by service type, location, availability, and ratings. Read reviews from other clients, check their portfolio photos, and review their experience before making a booking request.'
    },
    {
      category: 'clients',
      question: 'Is it safe to book professionals through Fixxa?',
      answer: 'Yes! All professionals on Fixxa undergo ID verification, and many have certifications. Read reviews from other clients, check verification badges, and use our secure messaging system to communicate before booking.'
    },
    {
      category: 'clients',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, EFT, and mobile payment options. All payments are processed securely through our encrypted payment gateway.'
    },
    {
      category: 'clients',
      question: 'Can I cancel or reschedule a booking?',
      answer: 'Yes, you can cancel or reschedule through your dashboard. For cancellations more than 24 hours before the scheduled time, you receive a full refund. Cancellations within 24 hours may incur a cancellation fee.'
    },
    {
      category: 'clients',
      question: 'What if I\'m not satisfied with the work?',
      answer: 'Contact the professional first to resolve the issue. If unresolved, use our dispute resolution system in your dashboard or contact our support team. We take quality concerns seriously and will help mediate.'
    },
    {
      category: 'general',
      question: 'How do reviews and ratings work?',
      answer: 'After a job is completed, both clients and professionals can leave reviews and ratings (1-5 stars). Reviews help build trust in our community and are visible on profiles. All reviews are moderated to ensure authenticity.'
    },
    {
      category: 'general',
      question: 'What areas does Fixxa cover?',
      answer: 'Fixxa currently operates across all major cities and towns in South Africa. Use the suburb search to find professionals in your specific area.'
    },
    {
      category: 'general',
      question: 'How do I report inappropriate behavior or safety concerns?',
      answer: 'Your safety is our priority. Use the "Report" button on any profile or message, or contact our support team immediately at safety@fixxa.co.za. All reports are reviewed within 24 hours.'
    },
    {
      category: 'general',
      question: 'Is my personal information secure?',
      answer: 'Yes! We comply with POPIA (Protection of Personal Information Act) regulations. Your data is encrypted, and we never share your personal information with third parties without your consent. You can export or delete your data at any time from your settings.'
    },
    {
      category: 'account',
      question: 'How do I reset my password?',
      answer: 'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a password reset link. Follow the instructions in the email to create a new password.'
    },
    {
      category: 'account',
      question: 'Can I have both a client and professional account?',
      answer: 'Currently, each email address can only be associated with one account type. If you want to offer services and book services, please contact support to discuss options.'
    },
    {
      category: 'account',
      question: 'How do I update my profile information?',
      answer: 'Go to Settings > Profile Settings to update your personal information, profile photo, location, and other details. Changes are saved automatically when you click "Update Profile".'
    },
    {
      category: 'account',
      question: 'How do I delete my account?',
      answer: 'Go to Settings > Privacy & Data, scroll to "Delete Account", and follow the prompts. Please note this action is permanent and all your data will be deleted in compliance with POPIA regulations.'
    }
  ];

  const helpTopics = [
    {
      icon: '👤',
      title: 'Account & Profile',
      description: 'Manage your account settings, profile, and preferences',
      link: '/settings'
    },
    {
      icon: <img src="/images/icons-fixxa/calendar_16926328.png" alt="Calendar" style={{ width: '40px', height: '40px' }} />,
      title: 'Bookings & Jobs',
      description: 'Learn about making bookings, managing jobs, and schedules',
      link: '/client-dashboard'
    },
    {
      icon: '💳',
      title: 'Payments & Billing',
      description: 'Understand payment methods, refunds, and billing',
      link: '#payments'
    },
    {
      icon: '⭐',
      title: 'Reviews & Ratings',
      description: 'How to leave reviews and understand ratings',
      link: '#reviews'
    },
    {
      icon: '🔒',
      title: 'Safety & Security',
      description: 'Stay safe and protect your personal information',
      link: '/safety'
    },
    {
      icon: '📱',
      title: 'Using the Platform',
      description: 'Get started guides and platform features',
      link: '#platform'
    }
  ];

  const contactOptions = [
    {
      icon: '📧',
      title: 'Email Support',
      description: 'Get help via email',
      contact: 'support@fixxa.co.za',
      action: 'mailto:support@fixxa.co.za'
    },
    {
      icon: <img src="/images/icons-fixxa/phone-call_3059446.png" alt="Phone" style={{ width: '40px', height: '40px' }} />,
      title: 'Phone Support',
      description: 'Speak to our team',
      contact: '+27 (0) 11 234 5678',
      action: 'tel:+27112345678'
    },
    {
      icon: '💬',
      title: 'Live Chat',
      description: 'Chat with us in real-time',
      contact: 'Available 9am-5pm SAST',
      action: '#chat'
    },
    {
      icon: '🔒',
      title: 'Safety Concerns',
      description: 'Report safety issues',
      contact: 'safety@fixxa.co.za',
      action: 'mailto:safety@fixxa.co.za'
    }
  ];

  const categories = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'workers', label: 'For Professionals', icon: '🔧' },
    { id: 'clients', label: 'For Clients', icon: '👥' },
    { id: 'general', label: 'General', icon: '❓' },
    { id: 'account', label: 'Account', icon: '⚙️' }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="support-page">
      {/* Hero Section */}
      <section className="support-hero">
        <div className="support-hero-content">
          <h1>How can we help you?</h1>
          <p>Search our knowledge base or browse topics below</p>
          <div className="support-search-bar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search for help articles, FAQs, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Help Topics Grid */}
      <section className="help-topics-section">
        <div className="container">
          <h2>Browse Help Topics</h2>
          <div className="help-topics-grid">
            {helpTopics.map((topic, index) => (
              <Link key={index} to={topic.link} className="help-topic-card">
                <div className="help-topic-icon">{topic.icon}</div>
                <h3>{topic.title}</h3>
                <p>{topic.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <h2>Frequently Asked Questions</h2>

          {/* Category Filters */}
          <div className="faq-categories">
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="faq-list">
            {filteredFaqs.length === 0 ? (
              <div className="no-results">
                <p>No FAQs found matching your search. Try different keywords or browse all topics.</p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => (
                <div
                  key={index}
                  className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}
                  onClick={() => toggleFaq(index)}
                >
                  <div className="faq-question">
                    <h3>{faq.question}</h3>
                    <svg
                      className="faq-toggle-icon"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                  {expandedFaq === index && (
                    <div className="faq-answer">
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Contact Support Section */}
      <section className="contact-support-section">
        <div className="container">
          <h2>Still need help?</h2>
          <p className="section-subtitle">Our support team is here to assist you</p>

          <div className="contact-options-grid">
            {contactOptions.map((option, index) => (
              <a
                key={index}
                href={option.action}
                className="contact-option-card"
              >
                <div className="contact-option-icon">{option.icon}</div>
                <h3>{option.title}</h3>
                <p>{option.description}</p>
                <span className="contact-detail">{option.contact}</span>
              </a>
            ))}
          </div>

          <div className="support-footer-note">
            <p>
              <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM (SAST)
            </p>
            <p>
              We aim to respond to all inquiries within 24 hours during business days.
            </p>
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="additional-resources">
        <div className="container">
          <h2>Additional Resources</h2>
          <div className="resources-grid">
            <Link to="/about" className="resource-link">
              <span className="resource-icon">ℹ️</span>
              About Fixxa
            </Link>
            <Link to="/terms" className="resource-link">
              <span className="resource-icon">📄</span>
              Terms of Service
            </Link>
            <Link to="/privacy" className="resource-link">
              <span className="resource-icon">🔒</span>
              Privacy Policy
            </Link>
            <Link to="/safety" className="resource-link">
              <span className="resource-icon">🛡️</span>
              Safety Guidelines
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Support;
