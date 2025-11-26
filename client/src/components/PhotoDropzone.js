import React, { useState, useRef } from 'react';
import './PhotoDropzone.css';

const PhotoDropzone = ({ photos = [], onPhotosChange, maxPhotos = 3, maxSize = 5 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Validate file
  const validateFile = (file) => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG, and WEBP images are allowed';
    }

    // Check file size (in MB)
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      return `File size must be less than ${maxSize}MB`;
    }

    return null;
  };

  // Handle file selection
  const handleFiles = (files) => {
    setError(null);

    // Check if adding these files would exceed max photos
    const filesArray = Array.from(files);
    const remainingSlots = maxPhotos - photos.length;

    if (filesArray.length > remainingSlots) {
      setError(`You can only upload ${maxPhotos} photos. ${remainingSlots} slots remaining.`);
      return;
    }

    // Validate and process files
    const validFiles = [];
    for (const file of filesArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    // Create preview URLs
    const newPhotos = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: Date.now() + Math.random(),
    }));

    onPhotosChange([...photos, ...newPhotos]);
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  // File input change handler
  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  // Remove photo
  const handleRemovePhoto = (photoId) => {
    const updatedPhotos = photos.filter((photo) => photo.id !== photoId);
    // Revoke object URL to free memory
    const photoToRemove = photos.find((photo) => photo.id === photoId);
    if (photoToRemove) {
      URL.revokeObjectURL(photoToRemove.preview);
    }
    onPhotosChange(updatedPhotos);
    setError(null);
  };

  // Open file picker
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const hasPhotos = photos.length > 0;
  const isFull = photos.length >= maxPhotos;

  return (
    <div className="photo-dropzone-container">
      {/* Dropzone */}
      {!isFull && (
        <div
          className={`photo-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClickUpload}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />

          <div className="dropzone-content">
            <svg
              className="upload-icon"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>

            <p className="dropzone-text">
              {isDragging ? (
                <strong>Drop photos here</strong>
              ) : (
                <>
                  <strong>Click to upload</strong> or drag and drop
                </>
              )}
            </p>

            <p className="dropzone-hint">
              JPEG, PNG, or WEBP (max {maxSize}MB each)
            </p>

            <p className="photo-count">
              {photos.length} / {maxPhotos} photos
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="dropzone-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Photo Preview Grid */}
      {hasPhotos && (
        <div className="photo-preview-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-preview-item">
              <img src={photo.preview} alt="Preview" />
              <button
                type="button"
                className="btn-remove-photo"
                onClick={() => handleRemovePhoto(photo.id)}
                title="Remove photo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              <div className="photo-overlay">
                <p className="photo-name">{photo.file.name}</p>
                <p className="photo-size">
                  {(photo.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Message */}
      {isFull && (
        <div className="dropzone-full">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p>Maximum of {maxPhotos} photos reached</p>
        </div>
      )}
    </div>
  );
};

export default PhotoDropzone;
