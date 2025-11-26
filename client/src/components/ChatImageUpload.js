import React, { useState, useRef } from 'react';
import './ChatImageUpload.css';

const ChatImageUpload = ({ onImageSelected, onImageRemove, disabled = false }) => {
  const [previewImage, setPreviewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPEG, PNG, and WEBP images are allowed');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError('Image must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload image
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/messages/upload-image', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Notify parent component
      onImageSelected({
        url: data.image.url,
        thumbnailUrl: data.image.thumbnail_url || data.image.url,
        file: file
      });
    } catch (err) {
      console.error('Image upload error:', err);
      setError(err.message || 'Failed to upload image');
      setPreviewImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove();
  };

  const handleClick = () => {
    if (!disabled && !uploading && !previewImage) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="chat-image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="file-input-hidden"
        disabled={disabled || uploading}
      />

      {!previewImage ? (
        <button
          type="button"
          onClick={handleClick}
          className="image-upload-btn"
          disabled={disabled || uploading}
          title="Attach image"
        >
          {uploading ? (
            <div className="upload-spinner"></div>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </button>
      ) : (
        <div className="image-preview-container">
          <div className="image-preview">
            <img src={previewImage} alt="Preview" />
            <button
              type="button"
              onClick={handleRemove}
              className="remove-image-btn"
              title="Remove image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="image-upload-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ChatImageUpload;
