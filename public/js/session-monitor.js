/**
 * Session Monitor - Client-side session timeout enforcement
 * Tracks user activity and warns before auto-logout
 */

(function() {
  // Configuration
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes (matches server)
  const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout
  const CHECK_INTERVAL = 60 * 1000; // Check every minute

  let lastActivity = Date.now();
  let warningShown = false;
  let checkInterval = null;
  let warningModal = null;

  // Initialize session monitor
  function init() {
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetActivity, true);
    });

    // Create warning modal
    createWarningModal();

    // Start checking session
    checkInterval = setInterval(checkSession, CHECK_INTERVAL);

    // Check session immediately
    checkSession();
  }

  // Reset activity timer
  function resetActivity() {
    lastActivity = Date.now();
    if (warningShown) {
      hideWarning();
    }
  }

  // Check session status
  async function checkSession() {
    const now = Date.now();
    const timeSinceActivity = now - lastActivity;
    const timeRemaining = SESSION_TIMEOUT - timeSinceActivity;

    // If timeout reached, logout
    if (timeRemaining <= 0) {
      await logout('Session expired due to inactivity');
      return;
    }

    // If within warning window, show warning
    if (timeRemaining <= WARNING_TIME && !warningShown) {
      showWarning(Math.ceil(timeRemaining / 1000 / 60)); // minutes remaining
    }

    // Verify session with server periodically
    if (timeSinceActivity > 0 && timeSinceActivity % (5 * 60 * 1000) < CHECK_INTERVAL) {
      await verifyServerSession();
    }
  }

  // Verify session with server
  async function verifyServerSession() {
    try {
      const response = await fetch('/check-session', {
        credentials: 'include'
      });
      const data = await response.json();

      if (!data.loggedIn) {
        await logout('Session expired on server');
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  // Create warning modal HTML
  function createWarningModal() {
    const modal = document.createElement('div');
    modal.id = 'sessionWarningModal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10000;
      justify-content: center;
      align-items: center;
    `;

    modal.innerHTML = `
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 12px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 60px;
          height: 60px;
          background: #ffc107;
          border-radius: 50%;
          margin: 0 auto 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        ">⏰</div>
        <h2 style="margin: 0 0 1rem 0; color: #333;">Session Expiring Soon</h2>
        <p id="sessionWarningText" style="color: #666; margin-bottom: 1.5rem;"></p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button id="sessionStayBtn" style="
            background: #4a7c59;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 1rem;
          ">Stay Logged In</button>
          <button id="sessionLogoutBtn" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 1rem;
          ">Logout Now</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    warningModal = modal;

    // Add event listeners
    document.getElementById('sessionStayBtn').addEventListener('click', () => {
      resetActivity();
      hideWarning();
    });

    document.getElementById('sessionLogoutBtn').addEventListener('click', () => {
      logout('User chose to logout');
    });
  }

  // Show warning modal
  function showWarning(minutesRemaining) {
    if (!warningModal) return;

    warningShown = true;
    const text = document.getElementById('sessionWarningText');
    text.textContent = `Your session will expire in ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''} due to inactivity. Click "Stay Logged In" to continue your session.`;
    warningModal.style.display = 'flex';
  }

  // Hide warning modal
  function hideWarning() {
    if (!warningModal) return;
    warningShown = false;
    warningModal.style.display = 'none';
  }

  // Logout user
  async function logout(reason) {
    console.log('Auto-logout:', reason);

    // Clear interval
    if (checkInterval) {
      clearInterval(checkInterval);
    }

    // Call logout endpoint
    try {
      await fetch('/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed:', error);
    }

    // Redirect to login
    const currentPage = window.location.pathname.toLowerCase();
    let loginPage = '/login.html';

    // Redirect to appropriate login page
    if (currentPage.includes('prosite') || currentPage.includes('worker')) {
      loginPage = '/proLogin.html';
    } else if (currentPage.includes('admin')) {
      loginPage = '/adminLogin.html';
    }

    // Show message and redirect
    alert(`${reason}. You will be redirected to the login page.`);
    window.location.href = loginPage;
  }

  // Start monitoring when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
