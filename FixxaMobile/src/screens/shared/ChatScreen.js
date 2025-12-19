import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';

const ChatScreen = ({ route, navigation }) => {
  const { conversation, workerId, workerName, clientId, clientName } = route.params || {};
  const { user } = useAuth();
  const { socket, connected, on, off, emit } = useSocket();

  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const flatListRef = useRef(null);

  const otherUserName = conversation?.other_user_name || clientName || workerName || 'User';
  const bookingId = conversation?.booking_id;
  const otherUserId = workerId || clientId;

  console.log('ChatScreen initialized with:', {
    workerId,
    workerName,
    clientId,
    clientName,
    bookingId,
    otherUserName,
    userType: user?.type,
    conversationData: conversation,
    routeParams: route.params,
  });

  // Early validation
  if (user?.type === 'worker' && !clientId) {
    console.error('CRITICAL: Worker opened chat without clientId!', {
      routeParams: route.params,
      conversation,
    });
  }
  if (user?.type === 'client' && !workerId) {
    console.error('CRITICAL: Client opened chat without workerId!', {
      routeParams: route.params,
      conversation,
    });
  }

  useEffect(() => {
    // Set header title
    console.log('Setting header title to:', otherUserName);
    console.log('Route params:', { conversation, workerId, workerName, clientId, clientName });

    navigation.setOptions({
      title: otherUserName || 'Chat',
    });

    if (otherUserId) {
      fetchMessages();
      markMessagesAsRead();
    } else {
      // No other user ID, just show empty chat
      console.warn('No otherUserId available');
      setLoading(false);
    }
  }, []);

  const markMessagesAsRead = async () => {
    try {
      if (user.type === 'worker') {
        // Workers: marking messages from this client as read
        // The GET /api/messages/worker/:clientId endpoint already marks messages as read
        console.log('Messages will be marked as read when fetched (worker)');
      } else {
        // Clients: mark messages from this professional as read
        await api.post(`/api/messages/client/mark-read/${workerId}`);
        console.log('Marked messages from professional as read');
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Socket.IO real-time message listener
  useEffect(() => {
    if (!connected || !socket) return;

    const handleNewMessage = (message) => {
      console.log('New message received:', message);

      // Check if this message is for this conversation
      let isForThisChat = false;

      if (user.type === 'worker') {
        // For workers: check if message involves this worker and this specific client
        isForThisChat = message.professional_id === user.id && message.client_id === clientId;
      } else {
        // For clients: check if message involves this client and this specific worker
        isForThisChat = message.client_id === user.id && message.professional_id === workerId;
      }

      console.log('Message check:', { isForThisChat, message, user, clientId, workerId });

      if (isForThisChat) {
        const formattedMessage = {
          ...message,
          id: message.id,
          sender_id: message.sender_type === 'client' ? message.client_id : message.professional_id,
          message: message.content,
          created_at: message.datetime || message.created_at,
        };

        setMessages(prev => [...prev, formattedMessage]);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    on('receiveMessage', handleNewMessage);

    return () => {
      off('receiveMessage', handleNewMessage);
    };
  }, [connected, socket, workerId, clientId, user]);

  const fetchMessages = async () => {
    try {
      let response;

      if (user.type === 'worker') {
        // Workers fetch messages for a specific client
        if (!clientId) {
          console.error('No clientId provided for worker chat');
          Alert.alert('Error', 'Cannot load chat: missing client information');
          setLoading(false);
          return;
        }
        response = await api.get(`/api/messages/worker/${clientId}`);
      } else {
        // Clients fetch messages for a specific professional
        if (!workerId) {
          console.error('No workerId provided for client chat');
          Alert.alert('Error', 'Cannot load chat: missing worker information');
          setLoading(false);
          return;
        }
        response = await api.get(`/api/messages?professionalId=${workerId}`);
      }

      if (response.data.messages) {
        // Transform and sort messages by created_at (ascending - oldest first)
        const formattedMessages = response.data.messages
          .map(msg => ({
            ...msg,
            id: msg.id,
            sender_id: msg.sender_type === 'client' ? msg.client_id : msg.professional_id,
            message: msg.content,
            created_at: msg.datetime || msg.created_at,
          }))
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        console.log('Loaded messages:', formattedMessages.length);
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        userType: user?.type,
        clientId,
        workerId,
      });
      Alert.alert(
        'Error',
        `Failed to load messages: ${error.response?.data?.error || error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    console.log('Send message clicked');
    console.log('Message text:', messageText);
    console.log('Worker ID:', workerId);
    console.log('Client ID:', clientId);
    console.log('User type:', user?.type);
    console.log('Selected image:', selectedImage);

    // If there's an image selected, use uploadAndSendImage instead
    if (selectedImage) {
      return uploadAndSendImage();
    }

    if (!messageText.trim()) {
      console.log('No message text, returning');
      return;
    }

    if (!otherUserId) {
      console.log('No other user ID');
      Alert.alert('Error', 'Cannot send message without recipient information');
      return;
    }

    console.log('Starting to send message...');
    setSending(true);

    try {
      // Determine the endpoint and payload based on user type
      let endpoint;
      let messageData;

      if (user.type === 'worker') {
        // Worker replying to client
        endpoint = '/api/messages/worker/reply';
        messageData = {
          clientId: clientId,
          message: messageText.trim(),
        };
      } else {
        // Client sending to worker
        endpoint = '/api/messages/contact';
        messageData = {
          workerId: workerId,
          message: messageText.trim(),
        };
      }

      console.log('Sending to endpoint:', endpoint);
      console.log('Message data:', messageData);

      const response = await api.post(endpoint, messageData);
      console.log('Response:', response.data);

      if (response.data.success) {
        console.log('Message sent successfully');
        // Clear input
        setMessageText('');

        // Don't add to local state here - Socket.IO will handle it via receiveMessage event
        // This prevents duplicate messages

        // Scroll to bottom (will scroll when socket event arrives)
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        console.log('Response not successful:', response.data);
        Alert.alert('Error', response.data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Full error:', JSON.stringify(error.response || error, null, 2));

      // Show detailed error to user
      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.detail ||
                          error.message ||
                          'Failed to send message. Please try again.';

      Alert.alert('Error', errorMessage);
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to send images.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  };

  const uploadAndSendImage = async () => {
    if (!selectedImage || !otherUserId) return;

    setUploadingImage(true);

    try {
      // Step 1: Upload image to server
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'message-image.jpg',
      });

      const uploadResponse = await api.post('/api/messages/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.error || 'Failed to upload image');
      }

      const { imageUrl, cloudinaryId } = uploadResponse.data;

      // Step 2: Send message with image
      let endpoint;
      let messageData;

      if (user.type === 'worker') {
        endpoint = '/api/messages/worker/reply';
        messageData = {
          clientId: clientId,
          message: messageText.trim() || '',
          imageUrl,
          cloudinaryId,
        };
      } else {
        endpoint = '/api/messages/contact';
        messageData = {
          workerId: workerId,
          message: messageText.trim() || '',
          imageUrl,
          cloudinaryId,
        };
      }

      const response = await api.post(endpoint, messageData);

      if (response.data.success) {
        // Clear input and selected image
        setMessageText('');
        setSelectedImage(null);

        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      } else {
        Alert.alert('Error', response.data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending image:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send image';
      Alert.alert('Error', errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === user.id;
    const hasImage = !!item.image_url;
    const hasText = item.message && item.message.trim();

    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {hasImage && (
          <TouchableOpacity
            onPress={() => setFullScreenImage(item.image_url)}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: item.image_url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {hasText && (
          <Text
            style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.theirMessageText,
              hasImage && styles.messageTextWithImage,
            ]}
          >
            {item.message}
          </Text>
        )}

        <Text
          style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.theirMessageTime,
          ]}
        >
          {new Date(item.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyText}>No messages yet</Text>
      <Text style={styles.emptySubtext}>
        Start the conversation with {otherUserName}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        {/* Image Preview */}
        {selectedImage && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={removeSelectedImage}
            >
              <Text style={styles.removeImageIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputRow}>
          {/* Only show attach button for clients */}
          {user.type !== 'worker' && (
            <TouchableOpacity
              style={styles.attachButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              <Text style={styles.attachIcon}>📎</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textLight}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            editable={!uploadingImage}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (sending || uploadingImage) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={sending || uploadingImage || (!messageText.trim() && !selectedImage)}
          >
            {sending || uploadingImage ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <StatusBar hidden />

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullScreenImage(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          {/* Full Screen Image */}
          <Image
            source={{ uri: fullScreenImage }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  messagesList: {
    padding: SIZES.padding,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    ...SHADOWS.small,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageText: {
    fontSize: SIZES.sm,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextWithImage: {
    marginTop: 4,
  },
  myMessageText: {
    color: COLORS.white,
  },
  theirMessageText: {
    color: COLORS.textPrimary,
  },
  messageTime: {
    fontSize: SIZES.xs,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirMessageTime: {
    color: COLORS.textLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
  inputContainer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    ...SHADOWS.small,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  imagePreviewContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  removeImageIcon: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachIcon: {
    fontSize: 24,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  sendIcon: {
    fontSize: 20,
    color: COLORS.white,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 28,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default ChatScreen;
