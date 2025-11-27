import React, { useState, useEffect } from 'react';
import './Messages.css';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/messages/worker', {
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        // Group messages by client
        const conversationsMap = {};
        data.messages.forEach(msg => {
          if (!conversationsMap[msg.client_id]) {
            conversationsMap[msg.client_id] = {
              clientId: msg.client_id,
              clientName: msg.client_name,
              clientEmail: msg.client_email,
              lastMessage: msg.content || '[Image]',
              lastMessageTime: msg.created_at,
              unreadCount: 0,
              messages: []
            };
          }
          conversationsMap[msg.client_id].messages.push(msg);
          if (!msg.read && msg.sender_type === 'client') {
            conversationsMap[msg.client_id].unreadCount++;
          }
        });

        const conversationsList = Object.values(conversationsMap);
        conversationsList.sort((a, b) =>
          new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        );

        setConversations(conversationsList);
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load messages');
      setLoading(false);
    }
  };

  const selectConversation = async (conversation) => {
    setSelectedClient(conversation);
    setMessages(conversation.messages.reverse()); // Reverse to show oldest first

    // Mark messages as read
    const unreadMessages = conversation.messages.filter(
      m => !m.read && m.sender_type === 'client'
    );

    if (unreadMessages.length > 0) {
      try {
        await fetch('/messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            clientId: conversation.clientId
          })
        });

        // Update conversation unread count
        setConversations(prev => prev.map(conv =>
          conv.clientId === conversation.clientId
            ? { ...conv, unreadCount: 0 }
            : conv
        ));
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedClient) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch('/messages/worker/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientId: selectedClient.clientId,
          message: newMessage.trim()
        })
      });

      const data = await res.json();

      if (data.success) {
        // Add message to current conversation
        const newMsg = data.data;
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');

        // Update conversation list
        setConversations(prev => prev.map(conv =>
          conv.clientId === selectedClient.clientId
            ? {
                ...conv,
                lastMessage: newMsg.content || '[Image]',
                lastMessageTime: newMsg.created_at,
                messages: [...conv.messages, newMsg]
              }
            : conv
        ));
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="messages-container">
        <div className="messages-loading">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      {/* Conversations List */}
      <div className="conversations-list">
        <h3>Conversations</h3>
        {conversations.length === 0 ? (
          <div className="no-conversations">
            <p>📭 No messages yet</p>
            <p className="no-conversations-hint">
              When clients send you messages, they'll appear here.
            </p>
          </div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.clientId}
              className={`conversation-item ${selectedClient?.clientId === conv.clientId ? 'active' : ''}`}
              onClick={() => selectConversation(conv)}
            >
              <div className="conversation-avatar">
                {conv.clientName.charAt(0).toUpperCase()}
              </div>
              <div className="conversation-info">
                <div className="conversation-header">
                  <h4>{conv.clientName}</h4>
                  <span className="conversation-time">
                    {formatTime(conv.lastMessageTime)}
                  </span>
                </div>
                <p className="conversation-preview">
                  {conv.lastMessage.substring(0, 50)}
                  {conv.lastMessage.length > 50 ? '...' : ''}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <div className="unread-badge">{conv.unreadCount}</div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Message Thread */}
      <div className="message-thread">
        {selectedClient ? (
          <>
            <div className="message-thread-header">
              <div className="thread-header-avatar">
                {selectedClient.clientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3>{selectedClient.clientName}</h3>
                <p className="thread-header-email">{selectedClient.clientEmail}</p>
              </div>
            </div>

            <div className="messages-list">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message-bubble ${msg.sender_type === 'professional' ? 'sent' : 'received'}`}
                >
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="Message attachment"
                      className="message-image"
                    />
                  )}
                  {msg.content && <p>{msg.content}</p>}
                  <span className="message-time">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              ))}
            </div>

            <form className="message-input-form" onSubmit={sendMessage}>
              {error && <div className="message-error">{error}</div>}
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                rows="3"
                disabled={sending}
              />
              <button type="submit" disabled={sending || !newMessage.trim()}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </>
        ) : (
          <div className="no-conversation-selected">
            <div className="no-conversation-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the list to view and reply to messages</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
