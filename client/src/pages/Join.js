import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Join.css';

const Join = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');

  const handleJoinClick = (type) => {
    if (type === 'professional') {
      // Redirect to the professional registration page
      navigate('/register');
    } else {
      // Show modal for organization inquiries
      setModalType(type);
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const getModalContent = () => {
    if (modalType === 'organization') {
      return {
        title: 'Thank you for your interest in partnering with Fixxa!',
        message: 'We\'re excited to have your organization as part of our community.',
        emails: [
          {
            label: 'General Inquiries',
            email: 'partnerships@fixxa.co.za',
            description: 'For partnership opportunities and general questions'
          },
          {
            label: 'Support',
            email: 'support@fixxa.co.za',
            description: 'For technical support and assistance'
          }
        ]
      };
    }
    return {};
  };

  const modalContent = getModalContent();

  return (
    <div className="join-page">
      <main className="join-container">
        <h1 className="join-title">Join the Fixxa Family</h1>
        <p className="join-subtitle">
          Whether you're a skilled professional or represent an organization, we'd love to have you as part of our growing community.
        </p>

        <div className="cards-container">
          {/* Professional Card */}
          <div className="join-card">
            <div className="card-icon">🔧</div>
            <h2 className="card-title">Join as a Professional</h2>
            <p className="card-description">
              Connect with customers who need your expertise and grow your career with Fixxa.
            </p>
            <ul className="benefits-list">
              <li><span className="emoji">🏠</span>Reach more customers</li>
              <li><span className="emoji">💰</span>Set your own rates</li>
              <li><span className="emoji">⭐</span>Build your reputation</li>
              <li><span className="emoji">💳</span>Get paid securely</li>
              <li><span className="emoji">📝</span>Access reviews and feedback</li>
              <li><span className="emoji">📢</span>Marketing support</li>
            </ul>
            <button
              className="join-btn"
              onClick={() => handleJoinClick('professional')}
            >
              Join as Professional
            </button>
          </div>

          {/* Organization Card */}
          <div className="join-card">
            <div className="card-icon">🏢</div>
            <h2 className="card-title">Join as an Organization</h2>
            <p className="card-description">
              Partner with Fixxa to expand your reach and manage your team more effectively.
            </p>
            <ul className="benefits-list">
              <li><span className="emoji">👥</span>Manage multiple profiles</li>
              <li><span className="emoji">📅</span>Bulk service offerings</li>
              <li><span className="emoji">📊</span>Analytics and reporting</li>
              <li><span className="emoji">🎯</span>Priority customer matching</li>
              <li><span className="emoji">🤝</span>Dedicated account management</li>
              <li><span className="emoji">🎨</span>Custom branding opportunities</li>
            </ul>
            <button
              className="join-btn"
              onClick={() => handleJoinClick('organization')}
            >
              Join as Organization
            </button>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🎉</div>
            <h3>{modalContent.title}</h3>
            <p>{modalContent.message}</p>

            <div className="email-list">
              <h4>Please email us to complete your registration:</h4>
              {modalContent.emails?.map((item, index) => (
                <div key={index} className="email-item">
                  <strong>{item.label}:</strong>
                  <br />
                  <a href={`mailto:${item.email}`}>{item.email}</a>
                  <br />
                  <small>{item.description}</small>
                </div>
              ))}
            </div>

            <button className="close-btn" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Join;
