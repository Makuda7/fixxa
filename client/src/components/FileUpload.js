import React, { useState, useRef } from 'react';
import './FileUpload.css';

const FileUpload = ({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = 'image/*',
  label = 'Upload Photos',
  disabled = false
}) => {
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setError('');

    // Validate number of files
    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file sizes and types
    const validFiles = [];
    const newPreviews = [];

    for (const file of files) {
      // Check file size
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        setError(`File "${file.name}" exceeds ${maxSizeMB}MB limit`);
        continue;
      }

      // Check file type
      if (acceptedTypes && !file.type.match(acceptedTypes.replace('*', '.*'))) {
        setError(`File "${file.name}" is not an accepted type`);
        continue;
      }

      validFiles.push(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          newPreviews.push({
            name: file.name,
            url: event.target.result,
            type: file.type
          });
          if (newPreviews.length === validFiles.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      } else {
        newPreviews.push({
          name: file.name,
          url: null,
          type: file.type
        });
      }
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleRemoveFile = (index) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);

    // Clear file input and notify parent
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFilesSelected([]);
    setError('');
  };

  const handleClick = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes}
        onChange={handleFileSelect}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        className="upload-trigger"
        onClick={handleClick}
        disabled={disabled}
      >
        <span className="upload-icon">📁</span>
        {label}
      </button>

      {error && (
        <div className="upload-error">
          {error}
        </div>
      )}

      {previews.length > 0 && (
        <div className="upload-previews">
          {previews.map((preview, index) => (
            <div key={index} className="preview-item">
              {preview.url ? (
                <img src={preview.url} alt={preview.name} className="preview-image" />
              ) : (
                <div className="preview-file">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{preview.name}</span>
                </div>
              )}
              <button
                type="button"
                className="remove-file"
                onClick={() => handleRemoveFile(index)}
                disabled={disabled}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="upload-hint">
        Max {maxFiles} files, {maxSizeMB}MB each
      </p>
    </div>
  );
};

export default FileUpload;
