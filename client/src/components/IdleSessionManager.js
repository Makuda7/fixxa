import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './IdleSessionManager.css';

const IdleSessionManager = () => {
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const idleTimeRef = useRef(0);
  const idleIntervalRef = useRef(null);
  const warningShownRef = useRef(false);

  useEffect(() => {
    // Reset idle time on user activity
    const resetIdleTime = () => {
      idleTimeRef.current = 0;
      if (warningShownRef.current) {
        setShowWarning(false);
        warningShownRef.current = false;
      }
    };

    // Add event listeners for user activity
    document.addEventListener('mousemove', resetIdleTime);
    document.addEventListener('keydown', resetIdleTime);
    document.addEventListener('click', resetIdleTime);
    document.addEventListener('scroll', resetIdleTime);
    document.addEventListener('touchstart', resetIdleTime);

    // Check idle time every minute
    idleIntervalRef.current = setInterval(() => {
      idleTimeRef.current += 1;

      // Show warning at 14 minutes
      if (idleTimeRef.current >= 14 && !warningShownRef.current) {
        setShowWarning(true);
        warningShownRef.current = true;
      }

      // Auto-logout at 15 minutes
      if (idleTimeRef.current >= 15) {
        console.log('Session expired due to inactivity');
        handleLogout();
      }
    }, 60000); // 1 minute

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', resetIdleTime);
      document.removeEventListener('keydown', resetIdleTime);
      document.removeEventListener('click', resetIdleTime);
      document.removeEventListener('scroll', resetIdleTime);
      document.removeEventListener('touchstart', resetIdleTime);
      if (idleIntervalRef.current) {
        clearInterval(idleIntervalRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    setShowWarning(false);
    logout();
  };

  const handleStayLoggedIn = () => {
    idleTimeRef.current = 0;
    setShowWarning(false);
    warningShownRef.current = false;
  };

  if (!showWarning) {
    return null;
  }

  return (
    <div className="idle-warning-overlay">
      <div className="idle-warning-modal">
        <div className="idle-warning-icon">⚠️</div>
        <h3>Session Timeout Warning</h3>
        <p>
          Your session will expire in <strong>1 minute</strong> due to inactivity.
        </p>
        <p className="idle-warning-subtitle">
          Click "Stay Logged In" to continue your session.
        </p>
        <div className="idle-warning-buttons">
          <button
            className="btn-stay-logged-in"
            onClick={handleStayLoggedIn}
          >
            Stay Logged In
          </button>
          <button
            className="btn-logout-now"
            onClick={handleLogout}
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdleSessionManager;
