/**
 * Profile Update Logger
 * Logs worker profile changes for admin tracking and notifications
 */

/**
 * Log a worker profile update
 * @param {Object} pool - PostgreSQL pool instance
 * @param {Object} params - Update parameters
 * @param {number} params.workerId - Worker's user ID
 * @param {string} params.workerName - Worker's name
 * @param {string} params.workerEmail - Worker's email
 * @param {string} params.updateType - Type of update (profile_info, certifications, emergency_contact, etc.)
 * @param {string} params.fieldChanged - Specific field that was updated
 * @param {string} [params.oldValue] - Previous value (optional)
 * @param {string} [params.newValue] - New value (optional)
 */
async function logProfileUpdate(pool, params) {
  try {
    const {
      workerId,
      workerName,
      workerEmail,
      updateType,
      fieldChanged,
      oldValue = null,
      newValue = null
    } = params;

    await pool.query(
      `INSERT INTO worker_profile_updates
       (worker_id, worker_name, worker_email, update_type, field_changed, old_value, new_value, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [workerId, workerName, workerEmail, updateType, fieldChanged, oldValue, newValue]
    );

    console.log(`✅ Logged profile update: ${updateType} - ${fieldChanged} for worker ${workerId}`);
  } catch (error) {
    console.error('Error logging profile update:', error);
    // Don't throw - logging should not break the main functionality
  }
}

/**
 * Get pending profile updates for admin review
 * @param {Object} pool - PostgreSQL pool instance
 * @param {string} [status] - Filter by status (pending, reviewed, dismissed)
 * @returns {Array} Array of profile updates
 */
async function getPendingUpdates(pool, status = 'pending') {
  try {
    const query = status
      ? 'SELECT * FROM worker_profile_updates WHERE status = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM worker_profile_updates ORDER BY created_at DESC';

    const params = status ? [status] : [];
    const result = await pool.query(query, params);

    return result.rows;
  } catch (error) {
    console.error('Error getting pending updates:', error);
    return [];
  }
}

/**
 * Mark profile update as reviewed
 * @param {Object} pool - PostgreSQL pool instance
 * @param {number} updateId - Update log ID
 * @param {number} adminId - Admin user ID who reviewed
 */
async function markAsReviewed(pool, updateId, adminId) {
  try {
    await pool.query(
      `UPDATE worker_profile_updates
       SET status = 'reviewed', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2`,
      [adminId, updateId]
    );
  } catch (error) {
    console.error('Error marking update as reviewed:', error);
    throw error;
  }
}

/**
 * Get update count by status
 * @param {Object} pool - PostgreSQL pool instance
 * @returns {Object} Count by status
 */
async function getUpdateCounts(pool) {
  try {
    const result = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM worker_profile_updates
       GROUP BY status`
    );

    const counts = { pending: 0, reviewed: 0, dismissed: 0 };
    result.rows.forEach(row => {
      counts[row.status] = parseInt(row.count);
    });

    return counts;
  } catch (error) {
    console.error('Error getting update counts:', error);
    return { pending: 0, reviewed: 0, dismissed: 0 };
  }
}

module.exports = {
  logProfileUpdate,
  getPendingUpdates,
  markAsReviewed,
  getUpdateCounts
};
