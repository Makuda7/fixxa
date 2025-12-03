import React from 'react';
import './ImageUploadGuidelines.css';

const ImageUploadGuidelines = ({ onAccept, onCancel }) => {
  return (
    <div className="guidelines-overlay">
      <div className="guidelines-modal">
        <div className="guidelines-header">
          <div className="guidelines-icon">📷</div>
          <h2>Image Upload Guidelines</h2>
        </div>

        <div className="guidelines-content">
          <p className="guidelines-intro">
            Before uploading images, please review these important safety guidelines:
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
                </ul>
              </li>
              <li>Avoid showing faces of minors or other people without their consent</li>
              <li>Remove or blur any sensitive background information</li>
            </ul>
          </div>

          <div className="guidelines-section">
            <h3>✅ What to Upload</h3>
            <ul>
              <li>Clear photos of the issue or area requiring service</li>
              <li>Multiple angles if needed to show the full scope</li>
              <li>Well-lit images that clearly show details</li>
              <li>Photos that help professionals assess the work required</li>
            </ul>
          </div>

          <div className="guidelines-section">
            <h3>⚠️ Important Reminders</h3>
            <ul>
              <li>Images are visible to the professional you're contacting</li>
              <li>Maximum file size: 5MB per image</li>
              <li>Supported formats: JPEG, PNG, WEBP</li>
              <li>You are responsible for the content of uploaded images</li>
            </ul>
          </div>

          <div className="guidelines-agreement">
            <p>
              By uploading images, you confirm that they do not contain sensitive personal
              information and comply with our <a href="/terms" target="_blank">Terms of Service</a> and{' '}
              <a href="/privacy" target="_blank">Privacy Policy</a>.
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

export default ImageUploadGuidelines;
