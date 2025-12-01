import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ChatImageUpload from '../components/ChatImageUpload';
import ImageLightbox from '../components/ImageLightbox';
import './Messages.css';

const Messages = () => {
  const { user } = useAuth();
  const { registerMessageCallback, isConnected } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Chat modal state
  const [showChatModal, setShowChatModal] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Image upload state
  const [selectedImage, setSelectedImage] = useState(null);

  // Image lightbox state
  const [lightboxImage, setLightboxImage] = useState(null);

  const chatMessagesRef = useRef(null);
  const shouldAutoScroll = useRef(true);
  const limit = 10;

  useEffect(() => {
    loadMessages(currentPage);
    loadUnreadCounts();
  }, [currentPage]);

  // Socket.io real-time message handling
  useEffect(() => {
    if (!isConnected) return;

    const cleanup = registerMessageCallback((message) => {
      console.log('Received real-time message:', message);

      // Update chat messages if chat is open
      if (currentChat && message.senderId === parseInt(currentChat.professionalId)) {
        setChatMessages((prev) => [...prev, {
          id: message.messageId,
          content: message.message,
          image_url: message.imageUrl,
          sender_type: 'worker',
          created_at: new Date().toISOString()
        }]);
      }

      // Reload conversations to update latest message
      loadMessages(currentPage);
      loadUnreadCounts();
    });

    return cleanup;
  }, [isConnected, currentChat, registerMessageCallback, currentPage]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (chatMessagesRef.current && shouldAutoScroll.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadMessages = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?limit=${limit}&page=${page}`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        const messages = data.messages || [];
        setTotalPages(data.totalPages || 1);

        // Group messages by professional
        const grouped = {};
        messages.forEach(msg => {
          if (!grouped[msg.professional_id]) {
            grouped[msg.professional_id] = [];
          }
          grouped[msg.professional_id].push(msg);
        });

        // Convert to conversations array
        const convs = Object.keys(grouped).map(pid => {
          const msgs = grouped[pid];
          msgs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const latestMsg = msgs[0];

          return {
            professionalId: pid,
            professionalName: latestMsg.professional_name || 'Unknown',
            professionalService: latestMsg.professional_service || '',
            messageCount: msgs.length,
            latestMessage: latestMsg,
            latestDate: new Date(latestMsg.created_at)
          };
        });

        // Sort conversations
        convs.sort((a, b) => b.latestDate - a.latestDate);
        setConversations(convs);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      const res = await fetch('/api/messages/client/unread-count', {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        // For now, we'll mark all as read when opening chat
        // You can expand this to track per-conversation unread counts
        setUnreadCounts({});
      }
    } catch (error) {
      console.error('Failed to load unread counts:', error);
    }
  };

  const markAllAsRead = async (professionalId) => {
    try {
      await fetch('/api/messages/client/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professionalId }),
        credentials: 'include'
      });

      // Clear unread count for this conversation
      setUnreadCounts(prev => ({ ...prev, [professionalId]: 0 }));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const openChat = async (conv) => {
    setCurrentChat(conv);
    setShowChatModal(true);
    setChatMessages([]);
    setSelectedImage(null);
    shouldAutoScroll.current = true;

    // Mark messages as read
    markAllAsRead(conv.professionalId);

    try {
      const res = await fetch(`/api/messages?professionalId=${conv.professionalId}`, {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        const sorted = data.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        setChatMessages(sorted);
      }
    } catch (error) {
      console.error('Failed to load chat:', error);
    }
  };

  const closeChat = () => {
    setShowChatModal(false);
    setCurrentChat(null);
    setChatMessages([]);
    setMessageInput('');
    setSelectedImage(null);
    shouldAutoScroll.current = true;
  };

  const handleImageSelected = (imageData) => {
    setSelectedImage(imageData);
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    const hasContent = messageInput.trim().length > 0;
    const hasImage = selectedImage !== null;

    if (!hasContent && !hasImage) return;
    if (!currentChat) return;

    setSendingMessage(true);
    try {
      const payload = {
        professionalId: currentChat.professionalId,
        content: messageInput.trim() || null,
        imageUrl: selectedImage?.url || null
      };

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        const newMessage = {
          id: data.messageId,
          content: messageInput.trim(),
          image_url: selectedImage?.url || null,
          sender_type: 'client',
          created_at: new Date().toISOString(),
          client_id: user?.id
        };
        setChatMessages([...chatMessages, newMessage]);
        setMessageInput('');
        setSelectedImage(null);
        shouldAutoScroll.current = true;
        loadMessages(currentPage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Delete this conversation?')) return;

    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        loadMessages(currentPage);
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const openLightbox = (imageUrl) => {
    setLightboxImage(imageUrl);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const handleScroll = () => {
    if (!chatMessagesRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    shouldAutoScroll.current = isAtBottom;
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateDivider = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.created_at).toDateString();

      if (!currentGroup || currentGroup.date !== msgDate) {
        currentGroup = {
          date: msgDate,
          dateLabel: formatDateDivider(msg.created_at),
          messages: []
        };
        groups.push(currentGroup);
      }

      currentGroup.messages.push(msg);
    });

    return groups;
  };

  const filteredConversations = conversations.filter(conv =>
    conv.professionalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.professionalService.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.latestMessage.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedConversations = [...filteredConversations].sort((a, b) =>
    sortOrder === 'newest'
      ? b.latestDate - a.latestDate
      : a.latestDate - b.latestDate
  );

  const messageGroups = groupMessagesByDate(chatMessages);

  return (
    <div className="messages-page">
      <section className="messages-hero">
        <h1>My Messages</h1>
        <p>View and manage your conversations with professionals</p>
      </section>

      <div className="messages-container">
        <div className="messages-controls">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <div className="messages-list">
          {loading ? (
            <p className="loading-text">Loading messages...</p>
          ) : sortedConversations.length === 0 ? (
            <p className="no-messages">No messages found.</p>
          ) : (
            sortedConversations.map((conv) => {
              const senderLabel = conv.latestMessage.sender_type === 'client' ? 'You: ' : '';
              const messagePreview = conv.latestMessage.image_url
                ? '📷 Photo'
                : conv.latestMessage.content || 'No message';
              const unreadCount = unreadCounts[conv.professionalId] || 0;

              return (
                <div
                  key={conv.professionalId}
                  className="message-card"
                  onClick={() => openChat(conv)}
                >
                  <div className="message-card-header">
                    <h3>{conv.professionalName}</h3>
                    <div className="header-right">
                      <span className="message-time">{getTimeAgo(conv.latestMessage.created_at)}</span>
                      {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                      )}
                    </div>
                  </div>
                  <p className="message-service">{conv.professionalService}</p>
                  <p className="message-preview">
                    <strong>{senderLabel}</strong>
                    {messagePreview}
                  </p>
                  <div className="message-card-footer">
                    <span className="message-count">{conv.messageCount} message(s)</span>
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(conv.latestMessage.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`page-btn ${page === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {showChatModal && currentChat && (
        <div className="chat-modal-overlay" onClick={closeChat}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chat-header">
              <div className="chat-header-info">
                <span className="chat-title">{currentChat.professionalName}</span>
                <span className="chat-subtitle">{currentChat.professionalService}</span>
              </div>
              <button className="close-chat-btn" onClick={closeChat}>✕</button>
            </div>

            <div className="chat-messages" ref={chatMessagesRef} onScroll={handleScroll}>
              {chatMessages.length === 0 ? (
                <p className="no-chat-messages">No messages yet</p>
              ) : (
                messageGroups.map((group, groupIndex) => (
                  <div key={groupIndex} className="message-date-group">
                    <div className="date-divider">
                      <span>{group.dateLabel}</span>
                    </div>
                    {group.messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`chat-message ${msg.sender_type === 'client' ? 'sent' : 'received'}`}
                      >
                        {msg.image_url && (
                          <div className="chat-image-container">
                            <img
                              src={msg.image_url}
                              alt="Attachment"
                              className="chat-image"
                              onClick={() => openLightbox(msg.image_url)}
                            />
                          </div>
                        )}
                        {msg.content && <div className="chat-message-content">{msg.content}</div>}
                        <div className="chat-message-time">{formatMessageTime(msg.created_at)}</div>
                        {msg.sender_type === 'client' && (
                          <div className="message-status">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M13.5 4L6 11.5L2.5 8" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <form className="chat-input-form" onSubmit={sendMessage}>
              <ChatImageUpload
                onImageSelected={handleImageSelected}
                onImageRemove={handleImageRemove}
                disabled={sendingMessage}
              />
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="chat-input"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                className="send-btn"
                disabled={sendingMessage || (!messageInput.trim() && !selectedImage)}
              >
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage}
          alt="Message attachment"
          onClose={closeLightbox}
        />
      )}
    </div>
  );
};

export default Messages;
