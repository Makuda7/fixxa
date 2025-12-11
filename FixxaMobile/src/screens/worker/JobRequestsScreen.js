import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency } from '../../utils/formatting';
import BurgerMenu from '../../components/BurgerMenu';

const JobRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/workers/job-requests');

      if (response.data.requests) {
        setRequests(response.data.requests);
      }
    } catch (error) {
      console.error('Error fetching job requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleAcceptRequest = async (requestId) => {
    Alert.alert(
      'Accept Job Request',
      'Are you sure you want to accept this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setProcessingId(requestId);
            try {
              const response = await api.post(
                `/workers/job-requests/${requestId}/accept`
              );

              if (response.data.success) {
                Alert.alert('Success', 'Job request accepted!');
                fetchRequests(); // Refresh the list
              }
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Failed to accept job request');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeclineRequest = async (requestId) => {
    Alert.alert(
      'Decline Job Request',
      'Are you sure you want to decline this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(requestId);
            try {
              const response = await api.post(
                `/workers/job-requests/${requestId}/decline`
              );

              if (response.data.success) {
                Alert.alert('Declined', 'Job request declined');
                fetchRequests(); // Refresh the list
              }
            } catch (error) {
              console.error('Error declining request:', error);
              Alert.alert('Error', 'Failed to decline job request');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSendQuote = (request) => {
    setSelectedRequest(request);
    setQuoteAmount(request.price ? request.price.toString() : '');
    setQuoteNotes('');
    setShowQuoteModal(true);
  };

  const submitQuote = async () => {
    if (!quoteAmount.trim()) {
      Alert.alert('Required', 'Please enter a quote amount');
      return;
    }

    const amount = parseFloat(quoteAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setSendingQuote(true);
    try {
      const response = await api.post(`/workers/job-requests/${selectedRequest.id}/quote`, {
        quoted_price: amount,
        notes: quoteNotes.trim(),
      });

      if (response.data.success) {
        Alert.alert('Success', 'Quote sent successfully!');
        setShowQuoteModal(false);
        setQuoteAmount('');
        setQuoteNotes('');
        setSelectedRequest(null);
        fetchRequests(); // Refresh list
      } else {
        Alert.alert('Error', 'Failed to send quote');
      }
    } catch (error) {
      console.error('Error sending quote:', error);
      Alert.alert('Error', 'Failed to send quote. Please try again.');
    } finally {
      setSendingQuote(false);
    }
  };

  const RequestCard = ({ item }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestService}>{item.service_type}</Text>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        </View>

        <Text style={styles.requestClient}>Client: {item.client_name}</Text>

        {item.booking_date && (
          <Text style={styles.requestDate}>
            📅 {formatDate(item.booking_date)}
          </Text>
        )}

        {item.location && (
          <Text style={styles.requestLocation}>📍 {item.location}</Text>
        )}

        {item.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.requestDescription}>{item.description}</Text>
          </View>
        )}

        {item.price && (
          <Text style={styles.requestPrice}>{formatCurrency(item.price)}</Text>
        )}

        {/* Send Quote Button */}
        <TouchableOpacity
          style={styles.quoteButton}
          onPress={() => handleSendQuote(item)}
        >
          <Text style={styles.quoteButtonIcon}>💰</Text>
          <Text style={styles.quoteButtonText}>Send Quote</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleDeclineRequest(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.declineButtonText}>Decline</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(item.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.acceptButtonText}>Accept</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Quote Modal */}
      <Modal
        visible={showQuoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Quote</Text>

            {selectedRequest && (
              <View style={styles.quoteInfo}>
                <Text style={styles.quoteInfoText}>
                  For: {selectedRequest.service_type}
                </Text>
                <Text style={styles.quoteInfoText}>
                  Client: {selectedRequest.client_name}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Quote Amount (R)</Text>
            <TextInput
              style={styles.amountInput}
              value={quoteAmount}
              onChangeText={setQuoteAmount}
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={quoteNotes}
              onChangeText={setQuoteNotes}
              placeholder="Add any additional details..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />

            <Text style={styles.charCount}>{quoteNotes.length}/500</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowQuoteModal(false);
                  setQuoteAmount('');
                  setQuoteNotes('');
                  setSelectedRequest(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, sendingQuote && styles.submitButtonDisabled]}
                onPress={submitQuote}
                disabled={sendingQuote}
              >
                {sendingQuote ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Send Quote</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Job Requests</Text>
          <Text style={styles.headerSubtitle}>
            {requests.length} pending request{requests.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <BurgerMenu navigation={navigation} />
      </View>

      <FlatList
        data={requests}
        renderItem={({ item }) => <RequestCard item={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubtext}>
              New job requests will appear here
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
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  listContent: {
    padding: SIZES.padding,
  },
  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    ...SHADOWS.medium,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestService: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  newBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: SIZES.xs,
    ...FONTS.bold,
    color: COLORS.white,
  },
  requestClient: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  requestDate: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  requestLocation: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  descriptionContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  requestDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  requestPrice: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  declineButton: {
    backgroundColor: COLORS.error,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  declineButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
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
  quoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.info,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  quoteButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  quoteButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SIZES.padding,
    width: '100%',
  },
  modalTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  quoteInfo: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  quoteInfoText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  amountInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  notesInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  charCount: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  cancelButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: COLORS.info,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  submitButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.bold,
    color: COLORS.white,
  },
});

export default JobRequestsScreen;
