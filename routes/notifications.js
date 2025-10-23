const express = require('express');
const router = express.Router();

module.exports = (pool, logger) => {
  const { requireAuth, workerOnly } = require('../middleware/auth');

  // Get notifications for logged-in user (client)
  router.get('/', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const query = `
        SELECT * FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [userId, limit]);

      res.json({
        success: true,
        notifications: result.rows
      });
    } catch (error) {
      logger.error('Error fetching notifications', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
  });

  // Get notifications for worker
  router.get('/worker', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const query = `
        SELECT * FROM notifications
        WHERE worker_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [workerId, limit]);

      res.json({
        success: true,
        notifications: result.rows
      });
    } catch (error) {
      logger.error('Error fetching worker notifications', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
  });

  // Get unread count for client
  router.get('/unread-count', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;

      const query = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = $1 AND is_read = false
      `;

      const result = await pool.query(query, [userId]);

      res.json({
        success: true,
        unreadCount: parseInt(result.rows[0].count)
      });
    } catch (error) {
      logger.error('Error fetching unread count', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
    }
  });

  // Get unread count for worker
  router.get('/worker/unread-count', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      const query = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE worker_id = $1 AND is_read = false
      `;

      const result = await pool.query(query, [workerId]);

      res.json({
        success: true,
        unreadCount: parseInt(result.rows[0].count)
      });
    } catch (error) {
      logger.error('Error fetching worker unread count', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
    }
  });

  // Mark notification as read
  router.post('/:id/read', requireAuth, async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.session.user.id;
      const isWorker = req.session.user.type === 'professional';

      const query = isWorker
        ? `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND worker_id = $2`
        : `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`;

      await pool.query(query, [notificationId, userId]);

      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      logger.error('Error marking notification as read', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to mark as read' });
    }
  });

  // Mark all notifications as read
  router.post('/mark-all-read', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user.id;
      const isWorker = req.session.user.type === 'professional';

      const query = isWorker
        ? `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE worker_id = $1 AND is_read = false`
        : `UPDATE notifications SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_read = false`;

      await pool.query(query, [userId]);

      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      logger.error('Error marking all notifications as read', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to mark all as read' });
    }
  });

  // Delete notification
  router.delete('/:id', requireAuth, async (req, res) => {
    try {
      const notificationId = req.params.id;
      const userId = req.session.user.id;
      const isWorker = req.session.user.type === 'professional';

      const query = isWorker
        ? `DELETE FROM notifications WHERE id = $1 AND worker_id = $2`
        : `DELETE FROM notifications WHERE id = $1 AND user_id = $2`;

      await pool.query(query, [notificationId, userId]);

      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      logger.error('Error deleting notification', { error: error.message });
      res.status(500).json({ success: false, error: 'Failed to delete notification' });
    }
  });

  return router;
};
