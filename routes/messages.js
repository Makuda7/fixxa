const express = require('express');
const router = express.Router();
const { sendMessageValidation } = require('../middleware/validation');
const { messageLimiter } = require('../middleware/rateLimiter');

module.exports = (pool, logger, io, helpers) => {
  const { requireAuth, workerOnly } = require('../middleware/auth');
  const { containsContactInfo } = helpers;

  // Send message (client to worker)
  router.post('/contact', requireAuth, messageLimiter, sendMessageValidation, async (req, res) => {
    const { workerId, message } = req.body;
    if (!workerId || !message) return res.status(400).json({ success: false, error: 'Missing fields' });

    const filterResult = containsContactInfo(message);
    if (filterResult.blocked) {
      return res.status(400).json({ 
        success: false, 
        error: 'Messages cannot contain contact information. Please keep all communication on the platform.',
        blockedReason: filterResult.reason
      });
    }

    try {
      const result = await pool.query(
        'INSERT INTO messages (client_id, professional_id, content, sender_type) VALUES ($1,$2,$3,$4) RETURNING *',
        [req.session.user.id, workerId, message, 'client']
      );
      
      if (io) {
        io.emit('receiveMessage', { 
          ...result.rows[0], 
          datetime: result.rows[0].created_at?.toISOString?.() || new Date().toISOString() 
        });
      }
      
      res.json({ success: true, message: 'Message sent', data: result.rows[0] });
    } catch (err) {
      logger.error('Send message error', { error: err.message });
      console.error('Database error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Reply to message (worker to client)
  router.post('/worker/reply', requireAuth, workerOnly, async (req, res) => {
    const { clientId, message } = req.body;
    if (!clientId || !message) return res.status(400).json({ success: false, error: 'Missing fields' });

    const filterResult = containsContactInfo(message);
    if (filterResult.blocked) {
      return res.status(400).json({ 
        success: false, 
        error: 'Messages cannot contain contact information. Please keep all communication on the platform.',
        blockedReason: filterResult.reason
      });
    }

    try {
      const result = await pool.query(
        'INSERT INTO messages (client_id, professional_id, content, sender_type) VALUES ($1,$2,$3,$4) RETURNING *',
        [clientId, req.session.user.id, message, 'professional']
      );
      
      if (io) {
        io.emit('receiveMessage', { 
          ...result.rows[0], 
          datetime: result.rows[0].created_at?.toISOString?.() || new Date().toISOString() 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Reply sent', 
        data: { 
          ...result.rows[0], 
          datetime: result.rows[0].created_at?.toISOString?.() || new Date().toISOString() 
        } 
      });
    } catch (err) {
      logger.error('Reply error', { error: err.message });
      console.error('Reply error:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Get client messages
  router.get('/', requireAuth, async (req, res) => {
    const clientId = req.session.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const professionalId = req.query.professionalId || null;

    try {
      let query = `
        SELECT m.*, 
               w.name AS professional_name, 
               w.speciality AS professional_service
        FROM messages m
        JOIN workers w ON m.professional_id = w.id
        WHERE m.client_id = $1
      `;
      const params = [clientId];

      if (professionalId) {
        query += ' AND m.professional_id = $2';
        params.push(professionalId);
      }

      query += ' ORDER BY m.created_at DESC';
      const offset = (page - 1) * limit;
      query += ` LIMIT ${limit} OFFSET ${offset}`;

      const result = await pool.query(query, params);

      let countQuery = 'SELECT COUNT(*) FROM messages WHERE client_id=$1';
      const countParams = [clientId];
      if (professionalId) {
        countQuery += ' AND professional_id=$2';
        countParams.push(professionalId);
      }
      const countResult = await pool.query(countQuery, countParams);
      const totalMessages = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalMessages / limit);

      const formattedMessages = result.rows.map(m => ({
        ...m,
        datetime: m.created_at.toISOString()
      }));

      res.json({
        success: true,
        messages: formattedMessages,
        page,
        totalPages
      });
    } catch (err) {
      logger.error('Failed to fetch messages', { error: err.message });
      console.error('Failed to fetch messages:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Get worker messages with unread count
  router.get('/worker', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;

      // Get all messages with client info
      const result = await pool.query(`
        SELECT m.*, u.name AS client_name, u.email AS client_email
        FROM messages m
        JOIN users u ON u.id = m.client_id
        WHERE m.professional_id = $1
        ORDER BY m.created_at DESC
      `, [workerId]);

      // Get unread count per client
      const unreadResult = await pool.query(`
        SELECT client_id, COUNT(*) as unread_count
        FROM messages
        WHERE professional_id = $1 AND read = FALSE AND sender_type = 'client'
        GROUP BY client_id
      `, [workerId]);

      const unreadByClient = {};
      unreadResult.rows.forEach(row => {
        unreadByClient[row.client_id] = parseInt(row.unread_count);
      });

      const formattedMessages = result.rows.map(m => ({
        ...m,
        datetime: m.created_at.toISOString(),
        unread_count: m.sender_type === 'client' && !m.read ? (unreadByClient[m.client_id] || 0) : 0
      }));

      res.json({ success: true, messages: formattedMessages, unreadByClient });
    } catch (err) {
      logger.error('Failed to fetch worker messages', { error: err.message });
      console.error('Failed to fetch worker messages:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Get unread message count for worker - MUST BE BEFORE /worker/:clientId
  router.get('/worker/unread-count', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE professional_id = $1 AND read = FALSE AND sender_type = 'client'
      `, [workerId]);

      res.json({ success: true, unreadCount: parseInt(result.rows[0].count) });
    } catch (err) {
      logger.error('Failed to get unread count', { error: err.message });
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Mark message as read
  router.post('/worker/mark-read/:messageId', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const messageId = req.params.messageId;

      await pool.query(`
        UPDATE messages
        SET read = TRUE
        WHERE id = $1 AND professional_id = $2
      `, [messageId, workerId]);

      res.json({ success: true, message: 'Message marked as read' });
    } catch (err) {
      logger.error('Failed to mark message as read', { error: err.message });
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Get worker chat history with specific client (and mark as read) - MUST BE AFTER specific routes
  router.get('/worker/:clientId', requireAuth, workerOnly, async (req, res) => {
    try {
      const workerId = req.session.user.id;
      const clientId = req.params.clientId;

      // Mark all messages from this client as read
      await pool.query(`
        UPDATE messages
        SET read = TRUE
        WHERE professional_id = $1 AND client_id = $2 AND sender_type = 'client' AND read = FALSE
      `, [workerId, clientId]);

      const result = await pool.query(`
        SELECT * FROM messages
        WHERE professional_id=$1 AND client_id=$2
        ORDER BY created_at ASC
      `, [workerId, clientId]);

      const formattedMessages = result.rows.map(m => ({
        ...m,
        datetime: m.created_at.toISOString()
      }));

      res.json({ success: true, messages: formattedMessages });
    } catch (err) {
      logger.error('Failed to fetch chat history', { error: err.message });
      console.error('Failed to fetch chat history:', err);
      res.status(500).json({ success: false, error: 'Database error', detail: err.message });
    }
  });

  // Get unread message count for client
  router.get('/client/unread-count', requireAuth, async (req, res) => {
    try {
      const clientId = req.session.user.id;
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE client_id = $1 AND read = FALSE AND sender_type = 'professional'
      `, [clientId]);

      res.json({ success: true, unreadCount: parseInt(result.rows[0].count) });
    } catch (err) {
      logger.error('Failed to get client unread count', { error: err.message });
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  // Mark all professional messages as read for client (when viewing messages page)
  router.post('/client/mark-all-read', requireAuth, async (req, res) => {
    try {
      const clientId = req.session.user.id;

      await pool.query(`
        UPDATE messages
        SET read = TRUE
        WHERE client_id = $1 AND sender_type = 'professional' AND read = FALSE
      `, [clientId]);

      res.json({ success: true, message: 'All messages marked as read' });
    } catch (err) {
      logger.error('Failed to mark client messages as read', { error: err.message });
      res.status(500).json({ success: false, error: 'Database error' });
    }
  });

  return router;
};