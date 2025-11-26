import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ currentStep, totalSteps, steps }) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="progress-bar-container">
      {/* Progress percentage */}
      <div className="progress-header">
        <span className="progress-label">Registration Progress</span>
        <span className="progress-percentage">{percentage}% Complete</span>
      </div>

      {/* Visual progress bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        >
          <div className="progress-shimmer"></div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="progress-steps">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <div
              key={index}
              className={`progress-step ${
                isCompleted ? 'completed' :
                isCurrent ? 'current' :
                'upcoming'
              }`}
            >
              <div className="step-indicator">
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="step-number">{stepNumber}</span>
                )}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
