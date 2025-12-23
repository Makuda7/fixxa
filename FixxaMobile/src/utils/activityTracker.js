/**
 * Activity Tracker Utility
 *
 * Tracks user activity and manages auto-logout timer.
 * Resets timer on any user interaction (navigation, API calls, taps).
 */

class ActivityTracker {
  constructor() {
    this.lastActivityTime = Date.now();
    this.inactivityTimeout = null;
    this.inactivityLimit = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.onInactivityCallback = null;
    this.isTracking = false;
  }

  /**
   * Start tracking user activity
   * @param {Function} onInactivity - Callback to execute when user is inactive
   * @param {Number} timeoutMinutes - Minutes of inactivity before logout (default: 30)
   */
  start(onInactivity, timeoutMinutes = 30) {
    this.onInactivityCallback = onInactivity;
    this.inactivityLimit = timeoutMinutes * 60 * 1000;
    this.isTracking = true;
    this.resetTimer();
    console.log(`Activity tracking started. Auto-logout after ${timeoutMinutes} minutes of inactivity.`);
  }

  /**
   * Stop tracking user activity
   */
  stop() {
    this.isTracking = false;
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    console.log('Activity tracking stopped.');
  }

  /**
   * Record user activity and reset the inactivity timer
   */
  recordActivity() {
    if (!this.isTracking) return;

    this.lastActivityTime = Date.now();
    this.resetTimer();
  }

  /**
   * Reset the inactivity timer
   */
  resetTimer() {
    if (!this.isTracking) return;

    // Clear existing timer
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }

    // Set new timer
    this.inactivityTimeout = setTimeout(() => {
      this.handleInactivity();
    }, this.inactivityLimit);
  }

  /**
   * Handle inactivity timeout
   */
  handleInactivity() {
    console.log('User inactive - triggering auto-logout');
    if (this.onInactivityCallback && typeof this.onInactivityCallback === 'function') {
      this.onInactivityCallback();
    }
    this.stop();
  }

  /**
   * Get time since last activity in minutes
   */
  getTimeSinceLastActivity() {
    return Math.floor((Date.now() - this.lastActivityTime) / 60000);
  }

  /**
   * Check if user is currently being tracked
   */
  isActive() {
    return this.isTracking;
  }
}

// Export singleton instance
export default new ActivityTracker();
