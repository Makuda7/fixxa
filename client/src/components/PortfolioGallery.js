import React, { useState, useCallback } from 'react';
import './PortfolioGallery.css';

const PortfolioGallery = ({ photos = [], onUpload, onDelete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      await uploadFiles(imageFiles);
    }
  }, []);

  // File input handler
  const handleFileInput = async (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      await uploadFiles(imageFiles);
    }
    e.target.value = ''; // Reset input
  };

  // Upload files
  const uploadFiles = async (files) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Simulate progress for each file
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        if (onUpload) {
          await onUpload(file);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete photo handler
  const handleDelete = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      if (onDelete) {
        await onDelete(photoId);
      }
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete photo. Please try again.');
    }
  };

  // Lightbox handlers
  const openLightbox = (photo) => {
    setSelectedPhoto(photo);
  };

  const closeLightbox = () => {
    setSelectedPhoto(null);
  };

  const navigatePhoto = (direction) => {
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    let newIndex;

    if (direction === 'next') {
      newIndex = (currentIndex + 1) % photos.length;
    } else {
      newIndex = (currentIndex - 1 + photos.length) % photos.length;
    }

    setSelectedPhoto(photos[newIndex]);
  };

  return (
    <div className="portfolio-gallery">
      <div className="portfolio-header">
        <h2>Portfolio Gallery</h2>
        <p className="portfolio-subtitle">
          Showcase your best work to attract more clients
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="upload-status">
            <div className="upload-spinner"></div>
            <p>Uploading photos... {uploadProgress}%</p>
            <div className="upload-progress-bar">
              <div
                className="upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        ) : (
          <>
            <div className="upload-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="upload-text">
              <span className="upload-action">Click to upload</span> or drag and drop
            </p>
            <p className="upload-hint">PNG, JPG, JPEG up to 10MB each</p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              onChange={handleFileInput}
              className="file-input"
              disabled={uploading}
            />
          </>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="portfolio-grid">
          <div className="grid-header">
            <h3>Your Photos ({photos.length})</h3>
          </div>
          <div className="photo-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="photo-item">
                <div className="photo-wrapper" onClick={() => openLightbox(photo)}>
                  <img
                    src={photo.url || photo.thumbnail_url}
                    alt={photo.caption || 'Portfolio photo'}
                    className="photo-image"
                  />
                  <div className="photo-overlay">
                    <button className="btn-view">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View
                    </button>
                  </div>
                </div>
                <button
                  className="btn-delete-photo"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                  title="Delete photo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <h3>No photos yet</h3>
          <p>Upload your first portfolio photo to get started</p>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="lightbox-modal" onClick={closeLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="btn-close-lightbox" onClick={closeLightbox}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {photos.length > 1 && (
              <>
                <button
                  className="btn-nav btn-prev"
                  onClick={() => navigatePhoto('prev')}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  className="btn-nav btn-next"
                  onClick={() => navigatePhoto('next')}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            <div className="lightbox-image-wrapper">
              <img
                src={selectedPhoto.url || selectedPhoto.full_url}
                alt={selectedPhoto.caption || 'Portfolio photo'}
                className="lightbox-image"
              />
            </div>

            {selectedPhoto.caption && (
              <div className="lightbox-caption">
                <p>{selectedPhoto.caption}</p>
              </div>
            )}

            <div className="lightbox-actions">
              <button
                className="btn-delete-lightbox"
                onClick={() => handleDelete(selectedPhoto.id)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioGallery;
