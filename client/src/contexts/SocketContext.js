import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  initializeSocket,
  disconnectSocket,
  registerUser,
  sendMessage as socketSendMessage,
  onReceiveMessage,
  onTyping,
  onUserOnline,
  onUserOffline,
  onMessageRead,
  emitTyping as socketEmitTyping,
  emitMessageRead as socketEmitMessageRead,
  isConnected as socketIsConnected
} from '../services/socket';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [unreadMessages, setUnreadMessages] = useState(new Map());
  const messageCallbacksRef = useRef(new Set());
  const typingTimeoutRef = useRef(new Map());

  // Initialize socket connection when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('Initializing socket for user:', user.id);

      const socket = initializeSocket();

      // Set up connection status listener
      const handleConnect = () => {
        setIsConnected(true);
        // Register user with server
        const userType = user.type === 'worker' ? 'worker' : 'client';
        registerUser(userType, user.id);
      };

      const handleDisconnect = () => {
        setIsConnected(false);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);

      // Check initial connection status
      if (socket.connected) {
        handleConnect();
      }

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      };
    }
  }, [isAuthenticated, user]);

  // Clean up socket on unmount or logout
  useEffect(() => {
    return () => {
      if (!isAuthenticated) {
        console.log('User logged out, disconnecting socket');
        disconnectSocket();
        setIsConnected(false);
        setOnlineUsers(new Set());
        setTypingUsers(new Map());
        setUnreadMessages(new Map());
        messageCallbacksRef.current.clear();
        typingTimeoutRef.current.clear();
      }
    };
  }, [isAuthenticated]);

  // Listen for online/offline users
  useEffect(() => {
    const cleanupOnline = onUserOnline((data) => {
      console.log('User online:', data.userId);
      setOnlineUsers((prev) => new Set(prev).add(data.userId));
    });

    const cleanupOffline = onUserOffline((data) => {
      console.log('User offline:', data.userId);
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      cleanupOnline();
      cleanupOffline();
    };
  }, []);

  // Listen for typing indicators
  useEffect(() => {
    const cleanupTyping = onTyping((data) => {
      const { senderId, isTyping } = data;

      setTypingUsers((prev) => {
        const newMap = new Map(prev);

        if (isTyping) {
          newMap.set(senderId, true);

          // Clear existing timeout
          if (typingTimeoutRef.current.has(senderId)) {
            clearTimeout(typingTimeoutRef.current.get(senderId));
          }

          // Set new timeout to clear typing indicator
          const timeout = setTimeout(() => {
            setTypingUsers((prevMap) => {
              const updatedMap = new Map(prevMap);
              updatedMap.delete(senderId);
              return updatedMap;
            });
            typingTimeoutRef.current.delete(senderId);
          }, 3000);

          typingTimeoutRef.current.set(senderId, timeout);
        } else {
          newMap.delete(senderId);

          // Clear timeout
          if (typingTimeoutRef.current.has(senderId)) {
            clearTimeout(typingTimeoutRef.current.get(senderId));
            typingTimeoutRef.current.delete(senderId);
          }
        }

        return newMap;
      });
    });

    return cleanupTyping;
  }, []);

  // Send a message
  const sendMessage = useCallback((messageData) => {
    if (!isConnected) {
      console.warn('Cannot send message: Socket not connected');
      return;
    }

    socketSendMessage(messageData);
  }, [isConnected]);

  // Register message callback
  const registerMessageCallback = useCallback((callback) => {
    messageCallbacksRef.current.add(callback);

    // Set up listener if this is the first callback
    if (messageCallbacksRef.current.size === 1) {
      const cleanup = onReceiveMessage((message) => {
        // Call all registered callbacks
        messageCallbacksRef.current.forEach((cb) => cb(message));

        // Update unread messages count
        if (message.receiverId === user?.id) {
          setUnreadMessages((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(message.senderId) || 0;
            newMap.set(message.senderId, current + 1);
            return newMap;
          });
        }
      });

      // Store cleanup function
      messageCallbacksRef.current.cleanup = cleanup;
    }

    // Return cleanup function
    return () => {
      messageCallbacksRef.current.delete(callback);

      // Clean up listener if no more callbacks
      if (messageCallbacksRef.current.size === 0 && messageCallbacksRef.current.cleanup) {
        messageCallbacksRef.current.cleanup();
        delete messageCallbacksRef.current.cleanup;
      }
    };
  }, [user?.id]);

  // Emit typing indicator
  const emitTyping = useCallback((receiverId, isTyping) => {
    if (!isConnected || !user) {
      return;
    }

    socketEmitTyping({
      senderId: user.id,
      receiverId,
      isTyping
    });
  }, [isConnected, user]);

  // Mark message as read
  const markMessageAsRead = useCallback((messageId, senderId) => {
    if (!isConnected || !user) {
      return;
    }

    socketEmitMessageRead({
      messageId,
      readerId: user.id
    });

    // Clear unread count for this sender
    setUnreadMessages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(senderId);
      return newMap;
    });
  }, [isConnected, user]);

  // Check if user is online
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Check if user is typing
  const isUserTyping = useCallback((userId) => {
    return typingUsers.has(userId);
  }, [typingUsers]);

  // Get unread count for a user
  const getUnreadCount = useCallback((userId) => {
    return unreadMessages.get(userId) || 0;
  }, [unreadMessages]);

  // Get total unread count
  const getTotalUnreadCount = useCallback(() => {
    let total = 0;
    unreadMessages.forEach((count) => {
      total += count;
    });
    return total;
  }, [unreadMessages]);

  const value = {
    isConnected: isConnected && socketIsConnected(),
    onlineUsers: Array.from(onlineUsers),
    sendMessage,
    registerMessageCallback,
    emitTyping,
    markMessageAsRead,
    isUserOnline,
    isUserTyping,
    getUnreadCount,
    getTotalUnreadCount
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
