import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate } from '../../utils/formatting';

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { socket, connected, on, off } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchConversations();

    // Refresh conversations when screen comes into focus (to update unread counts)
    const unsubscribe = navigation.addListener('focus', () => {
      fetchConversations();
    });

    return unsubscribe;
  }, [navigation]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!connected || !socket) return;

    // Listen for new messages
    const handleNewMessage = (message) => {
      console.log('New message received:', message);

      // Update conversations list
      setConversations(prev => {
        const conversationIndex = prev.findIndex(
          conv => conv.booking_id === message.booking_id
        );

        if (conversationIndex >= 0) {
          // Update existing conversation
          const updated = [...prev];
          updated[conversationIndex] = {
            ...updated[conversationIndex],
            last_message: message.message,
            last_message_time: message.created_at,
            unread_count: message.sender_id !== user.id
              ? (updated[conversationIndex].unread_count || 0) + 1
              : updated[conversationIndex].unread_count,
          };

          // Move to top
          const [conversation] = updated.splice(conversationIndex, 1);
          return [conversation, ...updated];
        } else {
          // New conversation - refresh the list
          fetchConversations();
        }

        return prev;
      });
    };

    on('new-message', handleNewMessage);

    // Cleanup
    return () => {
      off('new-message', handleNewMessage);
    };
  }, [connected, socket, user]);

  const fetchConversations = async () => {
    try {
      let response;

      if (user.type === 'worker') {
        // Workers use the /api/messages/worker endpoint
        response = await api.get('/api/messages/worker');

        if (response.data.messages) {
          // Group messages by client to create conversations
          const conversationMap = {};

          response.data.messages.forEach(msg => {
            const clientId = msg.client_id;

            if (!conversationMap[clientId]) {
              conversationMap[clientId] = {
                id: clientId,
                other_user_name: msg.client_name,
                last_message: msg.content,
                last_message_time: msg.datetime || msg.created_at,
                unread_count: msg.sender_type === 'client' && !msg.read ? 1 : 0,
                booking_id: null,
              };
            } else {
              // Update if this message is newer
              const existingTime = new Date(conversationMap[clientId].last_message_time);
              const currentTime = new Date(msg.datetime || msg.created_at);

              if (currentTime > existingTime) {
                conversationMap[clientId].last_message = msg.content;
                conversationMap[clientId].last_message_time = msg.datetime || msg.created_at;
              }

              // Count unread messages
              if (msg.sender_type === 'client' && !msg.read) {
                conversationMap[clientId].unread_count++;
              }
            }
          });

          // Convert to array and sort by last message time
          const conversations = Object.values(conversationMap).sort((a, b) => {
            return new Date(b.last_message_time) - new Date(a.last_message_time);
          });

          setConversations(conversations);
        }
      } else {
        // Clients use the /api/messages endpoint
        response = await api.get('/api/messages');

        if (response.data.messages) {
          // Group messages by professional to create conversations
          const conversationMap = {};

          response.data.messages.forEach(msg => {
            const professionalId = msg.professional_id;

            if (!conversationMap[professionalId]) {
              conversationMap[professionalId] = {
                id: professionalId,
                other_user_name: msg.professional_name,
                last_message: msg.content,
                last_message_time: msg.datetime || msg.created_at,
                unread_count: msg.sender_type === 'professional' && !msg.read ? 1 : 0,
                booking_id: null,
              };
            } else {
              // Update if this message is newer
              const existingTime = new Date(conversationMap[professionalId].last_message_time);
              const currentTime = new Date(msg.datetime || msg.created_at);

              if (currentTime > existingTime) {
                conversationMap[professionalId].last_message = msg.content;
                conversationMap[professionalId].last_message_time = msg.datetime || msg.created_at;
              }

              // Count unread messages
              if (msg.sender_type === 'professional' && !msg.read) {
                conversationMap[professionalId].unread_count++;
              }
            }
          });

          // Convert to array and sort by last message time
          const conversations = Object.values(conversationMap).sort((a, b) => {
            return new Date(b.last_message_time) - new Date(a.last_message_time);
          });

          setConversations(conversations);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationCard}
      onPress={() => {
        if (user.type === 'worker') {
          // Worker viewing client conversation
          navigation.navigate('ChatScreen', {
            clientId: item.id,
            clientName: item.other_user_name,
            conversation: item,
          });
        } else {
          // Client viewing worker conversation
          navigation.navigate('ChatScreen', {
            workerId: item.id,
            workerName: item.other_user_name,
            conversation: item,
          });
        }
      }}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.other_user_name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName}>{item.other_user_name}</Text>
          <Text style={styles.timestamp}>{formatDate(item.last_message_time)}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={2}>
          {item.last_message || 'No messages yet'}
        </Text>
      </View>
      {item.unread_count > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Start a conversation with a professional
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding * 1.5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: COLORS.white,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: SIZES.md,
    color: 'rgba(255,255,255,0.9)',
  },
  listContent: {
    padding: SIZES.padding,
  },
  conversationCard: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    padding: SIZES.padding,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    ...FONTS.bold,
    color: COLORS.white,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  timestamp: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  lastMessage: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  unreadBadge: {
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});

export default MessagesScreen;
