import React, { useState, useEffect } from 'react';
import './ProfileCompletionBanner.css';

const ProfileCompletionBanner = ({ profile, certifications, portfolioPhotos, onDismiss }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // Check if banner was previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('profileCompletionBannerDismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Calculate completion status
  const calculateCompletion = () => {
    const items = [
      {
        id: 'profile_picture',
        label: 'Add profile picture',
        completed: !!profile?.profile_picture,
        weight: 15,
      },
      {
        id: 'bio',
        label: 'Write a bio (at least 50 characters)',
        completed: profile?.bio && profile.bio.length >= 50,
        weight: 15,
      },
      {
        id: 'experience',
        label: 'Add years of experience',
        completed: profile?.experience && parseInt(profile.experience) > 0,
        weight: 10,
      },
      {
        id: 'service_radius',
        label: 'Set service radius',
        completed: profile?.service_radius && parseInt(profile.service_radius) > 0,
        weight: 10,
      },
      {
        id: 'secondary_areas',
        label: 'Add service areas',
        completed: profile?.secondary_areas && profile.secondary_areas.length > 0,
        weight: 10,
      },
      {
        id: 'certifications',
        label: 'Upload at least one certification',
        completed: certifications && certifications.length > 0,
        weight: 20,
      },
      {
        id: 'portfolio',
        label: 'Add at least 3 portfolio photos',
        completed: portfolioPhotos && portfolioPhotos.length >= 3,
        weight: 20,
      },
    ];

    const completedWeight = items
      .filter((item) => item.completed)
      .reduce((sum, item) => sum + item.weight, 0);

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const percentage = Math.round((completedWeight / totalWeight) * 100);

    const missingItems = items.filter((item) => !item.completed);
    const isComplete = missingItems.length === 0;

    return { items, percentage, missingItems, isComplete };
  };

  const { percentage, missingItems, isComplete } = calculateCompletion();

  // Auto-dismiss when profile is complete
  useEffect(() => {
    if (isComplete && !isDismissed) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 3000); // Auto-dismiss after 3 seconds when complete

      return () => clearTimeout(timer);
    }
  }, [isComplete, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('profileCompletionBannerDismissed', 'true');
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleReset = () => {
    setIsDismissed(false);
    localStorage.removeItem('profileCompletionBannerDismissed');
  };

  // Don't show if dismissed or if profile is complete
  if (isDismissed) {
    return null;
  }

  return (
    <div className={`profile-completion-banner ${isComplete ? 'complete' : ''}`}>
      <div className="banner-content">
        {/* Close Button */}
        <button
          className="btn-close-banner"
          onClick={handleDismiss}
          title="Dismiss"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="banner-header">
          <div className="banner-icon">
            {isComplete ? '🎉' : '📝'}
          </div>
          <div className="banner-title">
            <h3>
              {isComplete
                ? 'Profile Complete!'
                : 'Complete Your Profile'}
            </h3>
            <p className="banner-subtitle">
              {isComplete
                ? 'Your profile is now 100% complete. Great job!'
                : `${percentage}% complete - ${missingItems.length} ${
                    missingItems.length === 1 ? 'item' : 'items'
                  } remaining`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
          >
            <span className="progress-percentage">{percentage}%</span>
          </div>
        </div>

        {/* Checklist Toggle */}
        {!isComplete && (
          <button
            className="btn-toggle-checklist"
            onClick={() => setShowChecklist(!showChecklist)}
          >
            {showChecklist ? 'Hide Checklist' : 'Show Checklist'}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: showChecklist ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {/* Checklist */}
        {showChecklist && !isComplete && (
          <div className="checklist">
            <h4>To-Do List:</h4>
            <ul>
              {missingItems.map((item) => (
                <li key={item.id} className="checklist-item">
                  <span className="checkbox">☐</span>
                  <span className="item-label">{item.label}</span>
                  <span className="item-weight">{item.weight}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Complete Message */}
        {isComplete && (
          <div className="completion-message">
            <p>
              Your profile stands out! Clients can now see all your skills,
              certifications, and portfolio work.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileCompletionBanner;
