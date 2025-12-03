import React from 'react';
import './ImageUploadGuidelines.css';

const ReviewPhotoGuidelines = ({ onAccept, onCancel }) => {
  return (
    <div className="guidelines-overlay">
      <div className="guidelines-modal">
        <div className="guidelines-header">
          <div className="guidelines-icon">📷</div>
          <h2>Review Photo Guidelines</h2>
        </div>

        <div className="guidelines-content">
          <p className="guidelines-intro">
            Before uploading photos of completed work, please review these important safety guidelines:
          </p>

          <div className="guidelines-section">
            <h3>🔒 Privacy & Security</h3>
            <ul>
              <li>
                <strong>Do NOT include personal information</strong> such as:
                <ul className="nested-list">
                  <li>ID numbers, passport details, or driver's license</li>
                  <li>Bank account numbers or credit card information</li>
                  <li>Home addresses or exact locations</li>
                  <li>Phone numbers or email addresses</li>
                  <li>Personal documents, mail, or papers</li>
                  <li>Valuables, safes, or security systems</li>
                </ul>
              </li>
              <li>Avoid showing faces of minors or other people without their consent</li>
              <li>Remove or blur any sensitive background information before taking photos</li>
            </ul>
          </div>

          <div className="guidelines-section">
            <h3>✅ What to Upload</h3>
            <ul>
              <li>Photos of the work area that was completed</li>
              <li>Before and after shots showing the quality of work</li>
              <li>Multiple angles if needed to show the full scope</li>
              <li>Well-lit images that clearly show details</li>
              <li>Photos that help other customers make informed decisions</li>
            </ul>
          </div>

          <div className="guidelines-section">
            <h3>⚠️ Important Reminders</h3>
            <ul>
              <li>Photos will be publicly visible on the professional's profile</li>
              <li>Only photograph areas that were worked on</li>
              <li>Maximum 5 photos per review</li>
              <li>Maximum file size: 5MB per image</li>
              <li>Supported formats: JPEG, PNG, WEBP</li>
              <li>You are responsible for the content of uploaded images</li>
            </ul>
          </div>

          <div className="guidelines-agreement">
            <p>
              By uploading photos, you confirm that they show only the completed work area, do not contain sensitive personal
              information, and comply with our <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </p>
          </div>
        </div>

        <div className="guidelines-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-accept" onClick={onAccept}>
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewPhotoGuidelines;
