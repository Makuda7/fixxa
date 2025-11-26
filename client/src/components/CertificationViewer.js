import React, { useState } from 'react';
import './CertificationViewer.css';

const CertificationViewer = ({ certification, onClose, onApprove, onReject }) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(certification);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(certification, rejectReason);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileTypeIcon = (fileType) => {
    if (fileType?.includes('pdf')) {
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    }
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    );
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Pending Review', class: 'pending' },
      approved: { label: 'Approved', class: 'approved' },
      rejected: { label: 'Rejected', class: 'rejected' }
    };
    const statusInfo = statusMap[status] || { label: status, class: '' };
    return <span className={`cert-status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  const isPDF = certification.file_type?.includes('pdf');
  const isImage = certification.file_type?.includes('image');

  return (
    <div className="cert-viewer-overlay" onClick={onClose}>
      <div className="cert-viewer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cert-viewer-header">
          <div className="cert-header-content">
            <h2>{certification.document_name}</h2>
            {getStatusBadge(certification.status)}
          </div>
          <button className="cert-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="cert-viewer-content">
          {/* Left Side - Document Info */}
          <div className="cert-info-panel">
            <div className="cert-info-section">
              <h3>Document Information</h3>
              <div className="cert-info-grid">
                <div className="cert-info-item">
                  <label>Worker Name</label>
                  <p>{certification.worker_name || 'Unknown'}</p>
                </div>
                <div className="cert-info-item">
                  <label>Document Type</label>
                  <p>{certification.file_type || 'N/A'}</p>
                </div>
                <div className="cert-info-item">
                  <label>Uploaded Date</label>
                  <p>{formatDate(certification.uploaded_at)}</p>
                </div>
                {certification.approved_at && (
                  <div className="cert-info-item">
                    <label>Approved Date</label>
                    <p>{formatDate(certification.approved_at)}</p>
                  </div>
                )}
                {certification.rejected_at && (
                  <div className="cert-info-item">
                    <label>Rejected Date</label>
                    <p>{formatDate(certification.rejected_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {certification.rejection_reason && (
              <div className="cert-info-section">
                <h3>Rejection Reason</h3>
                <div className="rejection-reason-box">
                  {certification.rejection_reason}
                </div>
              </div>
            )}

            {certification.status === 'pending' && (
              <div className="cert-info-section">
                <h3>Actions</h3>
                {!showRejectForm ? (
                  <div className="cert-action-buttons">
                    <button
                      className="cert-approve-btn"
                      onClick={handleApprove}
                      disabled={isSubmitting}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {isSubmitting ? 'Approving...' : 'Approve Certification'}
                    </button>
                    <button
                      className="cert-reject-btn"
                      onClick={() => setShowRejectForm(true)}
                      disabled={isSubmitting}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Reject Certification
                    </button>
                  </div>
                ) : (
                  <div className="reject-form">
                    <label>Reason for Rejection</label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please provide a detailed reason for rejecting this certification..."
                      rows="4"
                    />
                    <div className="reject-form-actions">
                      <button
                        className="cert-reject-submit-btn"
                        onClick={handleReject}
                        disabled={isSubmitting || !rejectReason.trim()}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Rejection'}
                      </button>
                      <button
                        className="cert-reject-cancel-btn"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectReason('');
                        }}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Document Preview */}
          <div className="cert-preview-panel">
            <h3>Document Preview</h3>
            <div className="cert-preview-container">
              {isPDF ? (
                <div className="pdf-preview">
                  <div className="pdf-icon">
                    {getFileTypeIcon(certification.file_type)}
                  </div>
                  <p className="pdf-name">{certification.document_name}</p>
                  <a
                    href={certification.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-pdf-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Open PDF in New Tab
                  </a>
                  {/* Embedded PDF viewer */}
                  <div className="pdf-embed">
                    <iframe
                      src={`${certification.document_url}#view=FitH`}
                      title={certification.document_name}
                      width="100%"
                      height="100%"
                    />
                  </div>
                </div>
              ) : isImage ? (
                <div className="image-preview">
                  <img
                    src={certification.document_url}
                    alt={certification.document_name}
                    className="cert-image"
                  />
                  <a
                    href={certification.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-full-btn"
                  >
                    View Full Size
                  </a>
                </div>
              ) : (
                <div className="unsupported-preview">
                  <div className="unsupported-icon">
                    {getFileTypeIcon(certification.file_type)}
                  </div>
                  <p>Preview not available for this file type</p>
                  <a
                    href={certification.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificationViewer;
