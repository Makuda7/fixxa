import { io } from 'socket.io-client';

// Socket.io client configuration
const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Socket instance - singleton pattern
let socket = null;

/**
 * Initialize socket connection
 * @param {Object} options - Socket.io client options
 * @returns {Socket} Socket instance
 */
export const initializeSocket = (options = {}) => {
  if (socket && socket.connected) {
    console.log('Socket already connected');
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
    autoConnect: true,
    withCredentials: true,
    ...options
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('Socket reconnection attempt:', attemptNumber);
  });

  socket.on('reconnect_failed', () => {
    console.error('Socket reconnection failed');
  });

  return socket;
};

/**
 * Get socket instance
 * @returns {Socket|null} Socket instance or null if not initialized
 */
export const getSocket = () => {
  if (!socket) {
    console.warn('Socket not initialized. Call initializeSocket() first.');
  }
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket disconnected and cleaned up');
  }
};

/**
 * Register user (client or worker)
 * @param {string} userType - 'client' or 'worker'
 * @param {number} userId - User ID
 */
export const registerUser = (userType, userId) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  const eventName = userType === 'worker' ? 'registerWorker' : 'registerClient';
  const data = userType === 'worker' ? { workerId: userId } : { clientId: userId };

  socket.emit(eventName, data);
  console.log(`Registered ${userType} with ID:`, userId);
};

/**
 * Send a message
 * @param {Object} messageData - Message data
 * @param {number} messageData.senderId - Sender's user ID
 * @param {number} messageData.receiverId - Receiver's user ID
 * @param {string} messageData.message - Message text
 * @param {string} messageData.senderType - 'client' or 'worker'
 */
export const sendMessage = (messageData) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('sendMessage', {
    ...messageData,
    timestamp: new Date().toISOString()
  });

  console.log('Message sent:', messageData);
};

/**
 * Listen for incoming messages
 * @param {Function} callback - Callback function to handle received messages
 * @returns {Function} Cleanup function to remove listener
 */
export const onReceiveMessage = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('receiveMessage', callback);
  console.log('Listening for messages');

  // Return cleanup function
  return () => {
    socket.off('receiveMessage', callback);
    console.log('Stopped listening for messages');
  };
};

/**
 * Listen for typing indicator
 * @param {Function} callback - Callback function to handle typing events
 * @returns {Function} Cleanup function to remove listener
 */
export const onTyping = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('typing', callback);

  return () => {
    socket.off('typing', callback);
  };
};

/**
 * Emit typing indicator
 * @param {Object} data - Typing data
 * @param {number} data.senderId - User ID of typer
 * @param {number} data.receiverId - User ID of recipient
 * @param {boolean} data.isTyping - Whether user is typing
 */
export const emitTyping = (data) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('typing', data);
};

/**
 * Listen for user online status
 * @param {Function} callback - Callback function to handle online status
 * @returns {Function} Cleanup function to remove listener
 */
export const onUserOnline = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('userOnline', callback);

  return () => {
    socket.off('userOnline', callback);
  };
};

/**
 * Listen for user offline status
 * @param {Function} callback - Callback function to handle offline status
 * @returns {Function} Cleanup function to remove listener
 */
export const onUserOffline = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('userOffline', callback);

  return () => {
    socket.off('userOffline', callback);
  };
};

/**
 * Listen for message read receipts
 * @param {Function} callback - Callback function to handle read receipts
 * @returns {Function} Cleanup function to remove listener
 */
export const onMessageRead = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('messageRead', callback);

  return () => {
    socket.off('messageRead', callback);
  };
};

/**
 * Emit message read event
 * @param {Object} data - Read receipt data
 * @param {number} data.messageId - Message ID
 * @param {number} data.readerId - User ID who read the message
 */
export const emitMessageRead = (data) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('messageRead', data);
};

/**
 * Check if socket is connected
 * @returns {boolean} True if connected
 */
export const isConnected = () => {
  return socket && socket.connected;
};

/**
 * Listen for completion request notifications
 * @param {Function} callback - Callback function to handle completion request events
 * @returns {Function} Cleanup function to remove listener
 */
export const onCompletionRequest = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('completion-request', callback);
  console.log('Listening for completion requests');

  return () => {
    socket.off('completion-request', callback);
    console.log('Stopped listening for completion requests');
  };
};

/**
 * Listen for completion response notifications
 * @param {Function} callback - Callback function to handle completion response events
 * @returns {Function} Cleanup function to remove listener
 */
export const onCompletionResponse = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('completion-response', callback);
  console.log('Listening for completion responses');

  return () => {
    socket.off('completion-response', callback);
    console.log('Stopped listening for completion responses');
  };
};

/**
 * Listen for booking request response notifications
 * @param {Function} callback - Callback function to handle booking request response events
 * @returns {Function} Cleanup function to remove listener
 */
export const onBookingRequestResponse = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('booking-request-response', callback);
  console.log('Listening for booking request responses');

  return () => {
    socket.off('booking-request-response', callback);
    console.log('Stopped listening for booking request responses');
  };
};

/**
 * Listen for new message notifications
 * @param {Function} callback - Callback function to handle new message events
 * @returns {Function} Cleanup function to remove listener
 */
export const onNewMessage = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return () => {};
  }

  socket.on('newMessage', callback);
  console.log('Listening for new messages');

  return () => {
    socket.off('newMessage', callback);
    console.log('Stopped listening for new messages');
  };
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
  registerUser,
  sendMessage,
  onReceiveMessage,
  onTyping,
  emitTyping,
  onUserOnline,
  onUserOffline,
  onMessageRead,
  emitMessageRead,
  isConnected,
  onCompletionRequest,
  onCompletionResponse,
  onBookingRequestResponse,
  onNewMessage
};
