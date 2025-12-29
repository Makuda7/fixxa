import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency } from '../../utils/formatting';

const CompletionApprovalsScreen = ({ navigation }) => {
  const [completionRequests, setCompletionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const fetchCompletionRequests = async () => {
    try {
      const response = await api.get('/bookings');
      if (response.data.success && response.data.bookings) {
        // Filter bookings that are awaiting client confirmation
        const awaitingConfirmation = response.data.bookings.filter(
          booking => booking.status === 'Awaiting Client Confirmation'
        );
        setCompletionRequests(awaitingConfirmation);
      }
    } catch (error) {
      console.error('Error fetching completion requests:', error);
      Alert.alert('Error', 'Failed to load completion requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompletionRequests();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompletionRequests();
  }, []);

  const openApprovalModal = (request) => {
    setSelectedRequest(request);
    setRating(0);
    setComments('');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedRequest(null);
    setRating(0);
    setComments('');
  };

  const handleApprove = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please rate the quality of work before approving.');
      return;
    }

    setProcessing(true);
    try {
      // First approve the completion
      const approveResponse = await api.post(`/bookings/${selectedRequest.id}/approve-completion`);

      if (approveResponse.data.success) {
        // Then create a review
        try {
          await api.post('/reviews', {
            bookingId: selectedRequest.id,
            rating: rating,
            comment: comments.trim() || undefined
          });
        } catch (reviewError) {
          console.error('Failed to create review:', reviewError);
          // Continue even if review fails - completion is more important
        }

        Alert.alert('Success', 'Job completion confirmed successfully!');
        closeModal();
        fetchCompletionRequests(); // Refresh list
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to approve completion.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = () => {
    Alert.alert(
      'Need More Work?',
      'If the job is not complete, please contact the professional directly to discuss what needs to be finished.',
      [
        { text: 'OK', style: 'cancel' },
        {
          text: 'Contact Professional',
          onPress: () => {
            closeModal();
            // Navigate to chat or contact screen
            // navigation.navigate('ChatScreen', { workerId: selectedRequest.worker_id });
          }
        }
      ]
    );
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            disabled={processing}
          >
            <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Completion Approvals</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {completionRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No pending completion approvals</Text>
            <Text style={styles.emptySubtext}>
              When workers complete jobs, they'll appear here for your review.
            </Text>
          </View>
        ) : (
          completionRequests.map((request) => (
            <View key={request.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.workerName}>
                    {request.worker_name || request.professional_name || 'Professional'}
                  </Text>
                  <Text style={styles.serviceType}>
                    {request.service_type || request.professional_service || request.service || 'Service'}
                  </Text>
                </View>
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>{formatDate(request.booking_date)}</Text>
              </View>

              {(request.price || request.booking_amount) && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Amount:</Text>
                  <Text style={[styles.infoValue, styles.price]}>
                    {formatCurrency(request.price || request.booking_amount)}
                  </Text>
                </View>
              )}

              {request.completion_notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Worker's Notes:</Text>
                  <Text style={styles.notesText}>{request.completion_notes}</Text>
                </View>
              )}

              {/* Completion Photos */}
              {request.completion_photos && request.completion_photos.length > 0 && (
                <View style={styles.photosContainer}>
                  <Text style={styles.photosLabel}>Completion Photos ({request.completion_photos.length}):</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                    {request.completion_photos.map((photo, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedPhoto(photo)}
                      >
                        <Image source={{ uri: photo }} style={styles.photo} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => openApprovalModal(request)}
              >
                <Text style={styles.reviewButtonText}>Review Completion</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Approval Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Job Completion</Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedRequest && (
                <>
                  <Text style={styles.modalWorker}>
                    {selectedRequest.worker_name || selectedRequest.professional_name || 'Professional'}
                  </Text>
                  <Text style={styles.modalService}>
                    {selectedRequest.service_type || selectedRequest.professional_service || selectedRequest.service || 'Service'}
                  </Text>

                  {/* Quality Rating */}
                  <View style={styles.ratingSection}>
                    <Text style={styles.ratingLabel}>Rate the quality of work:</Text>
                    {renderStars()}
                    <Text style={styles.ratingText}>
                      {rating === 0 ? 'Select a rating' :
                       rating === 1 ? 'Poor' :
                       rating === 2 ? 'Fair' :
                       rating === 3 ? 'Good' :
                       rating === 4 ? 'Very Good' :
                       'Excellent'}
                    </Text>
                  </View>

                  {/* Comments */}
                  <View style={styles.commentsSection}>
                    <Text style={styles.commentsLabel}>Additional Comments (Optional):</Text>
                    <TextInput
                      style={styles.commentsInput}
                      placeholder="Share your experience with this service..."
                      value={comments}
                      onChangeText={setComments}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.rejectButton]}
                onPress={handleReject}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Contact Worker</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.approveButton]}
                onPress={handleApprove}
                disabled={processing || rating === 0}
              >
                {processing ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Confirm Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={selectedPhoto !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => setSelectedPhoto(null)}
          >
            <Text style={styles.photoViewerCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
    paddingBottom: SIZES.padding,
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
  headerTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: SIZES.padding,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerName: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  serviceType: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    marginTop: 4,
  },
  newBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadgeText: {
    fontSize: SIZES.xs,
    ...FONTS.bold,
    color: COLORS.white,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  infoValue: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  price: {
    color: COLORS.primary,
    fontSize: SIZES.md,
  },
  notesContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  photosContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  photosLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  photosScroll: {
    marginTop: 4,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  reviewButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  closeButton: {
    fontSize: 28,
    color: COLORS.textSecondary,
  },
  modalBody: {
    padding: 20,
  },
  modalWorker: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modalService: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  ratingSection: {
    backgroundColor: '#f0f8f0',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d4edda',
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  star: {
    fontSize: 32,
    color: COLORS.gray,
  },
  starActive: {
    color: '#ffc107',
  },
  ratingText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  commentsSection: {
    marginBottom: 16,
  },
  commentsLabel: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  commentsInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.gray,
    height: 100,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: COLORS.textSecondary,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  // Photo Viewer
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  photoViewerCloseText: {
    fontSize: 36,
    color: COLORS.white,
  },
  photoViewerImage: {
    width: '90%',
    height: '80%',
  },
});

export default CompletionApprovalsScreen;
