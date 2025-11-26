import React, { useState, useRef } from 'react';
import './DocumentUpload.css';

const DocumentUpload = ({
  label,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSize = 5, // MB
  multiple = false,
  required = false,
  hint,
  onChange,
  existingFiles = [],
  onRemove,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const maxSizeBytes = maxSize * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return `File size exceeds ${maxSize}MB limit`;
    }

    const acceptedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!acceptedTypes.includes(fileExtension) && !acceptedTypes.includes(file.type)) {
      return `File type not accepted. Please upload: ${accept}`;
    }

    return null;
  };

  const handleFiles = async (files) => {
    setError('');
    const fileArray = Array.from(files);

    // Validate all files
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setUploading(true);

    try {
      if (onChange) {
        await onChange(multiple ? fileArray : fileArray[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index) => {
    if (onRemove) {
      onRemove(index);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      default:
        return '📎';
    }
  };

  return (
    <div className="document-upload-container">
      {/* Label */}
      {label && (
        <label className="upload-label">
          {label}
          {required && <span className="required-mark">*</span>}
        </label>
      )}

      {/* Upload Area */}
      <div
        className={`upload-area ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-status">
            <div className="upload-spinner"></div>
            <p className="upload-text">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="upload-text">
              <span className="upload-action">Click to upload</span> or drag and drop
            </p>
            <p className="upload-hint-text">
              {accept.replace(/\./g, '').toUpperCase()} (max {maxSize}MB)
            </p>
          </>
        )}
      </div>

      {/* Hint */}
      {hint && <p className="upload-hint">{hint}</p>}

      {/* Error */}
      {error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className="uploaded-files">
          <p className="uploaded-files-label">Uploaded Files:</p>
          {existingFiles.map((file, index) => (
            <div key={index} className="uploaded-file">
              <div className="file-info">
                <span className="file-icon">{getFileIcon(file.name)}</span>
                <div className="file-details">
                  <span className="file-name">{file.name}</span>
                  {file.size && (
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(index);
                }}
                aria-label="Remove file"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
