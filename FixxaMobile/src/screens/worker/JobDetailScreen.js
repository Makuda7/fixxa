import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
  Modal,
} from 'react-native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency } from '../../utils/formatting';

const JobDetailScreen = ({ route, navigation }) => {
  const { jobId } = route.params;
  const [job, setJob] = useState(null);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    fetchReview();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await api.get(`/workers/jobs/${jobId}`);
      if (response.data.job) {
        console.log('JOB STATUS DEBUG:', response.data.job.status);
        console.log('Full job data:', JSON.stringify(response.data.job, null, 2));
        setJob(response.data.job);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      Alert.alert('Error', 'Failed to load job details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchReview = async () => {
    try {
      const response = await api.get(`/reviews/booking/${jobId}`);
      if (response.data.success && response.data.review) {
        setReview(response.data.review);
      }
    } catch (error) {
      console.log('No review found for this job');
    }
  };

  const handleStartJob = () => {
    Alert.alert(
      'Start Job',
      'Mark this job as currently in progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Job',
          onPress: async () => {
            setUpdating(true);
            try {
              const response = await api.post(`/workers/jobs/${jobId}/start`);
              if (response.data.success) {
                Alert.alert('Success', 'Job marked as in progress');
                fetchJobDetails();
              }
            } catch (error) {
              console.error('Error starting job:', error);
              Alert.alert('Error', 'Failed to start job');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCompleteJob = () => {
    navigation.navigate('JobCompletion', {
      booking: {
        id: job.id,
        user_name: job.client_name,
        service_type: job.service || job.service_type,
        service_address: job.service_address || job.client_address || job.location,
        quoted_price: job.booking_amount,
      }
    });
  };

  const handleCancelJob = () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job? The client will be notified.',
      [
        { text: 'No, Keep Job', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const response = await api.post(`/workers/jobs/${jobId}/cancel`);
              if (response.data.success) {
                Alert.alert('Cancelled', 'Job has been cancelled', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              }
            } catch (error) {
              console.error('Error cancelling job:', error);
              Alert.alert('Error', 'Failed to cancel job');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleCallClient = () => {
    // TODO: Implement in-app calling for safety (like Uber)
    Alert.alert(
      'Call Feature',
      'In-app calling will be available soon for your safety and security.',
      [{ text: 'OK' }]
    );
  };

  const handleMessageClient = () => {
    // Navigate to chat with the specific client
    if (job?.user_id && job?.client_name) {
      navigation.navigate('ChatScreen', {
        clientId: job.user_id,
        clientName: job.client_name
      });
    } else {
      Alert.alert('Error', 'Unable to open chat. Client information not available.');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return COLORS.info;
      case 'in progress':
      case 'in-progress':
        return COLORS.warning;
      case 'completed':
        return COLORS.success;
      case 'cancelled':
      case 'declined':
        return COLORS.error;
      case 'awaiting client confirmation':
        return '#ff9800'; // Orange color for awaiting confirmation
      default:
        return COLORS.gray;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const isConfirmed = job.status === 'Confirmed';
  const isInProgress = job.status === 'In Progress';
  const isCompleted = job.status === 'Completed';
  const isCancelled = job.status === 'Cancelled' || job.status === 'Declined';
  const isAwaitingClientConfirmation = job.status === 'Awaiting Client Confirmation';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusBannerText}>{job.status}</Text>
        </View>

        {/* Service Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Text style={styles.serviceText}>{job.service || job.service_type}</Text>
          {job.booking_amount && (
            <Text style={styles.priceText}>{formatCurrency(job.booking_amount)}</Text>
          )}
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <Text style={styles.infoText}>👤 {job.client_name}</Text>
          {job.client_phone && (
            <Text style={styles.infoText}>📞 {job.client_phone}</Text>
          )}
          {job.client_email && (
            <Text style={styles.infoText}>✉️ {job.client_email}</Text>
          )}
        </View>

        {/* Contact Buttons */}
        {!isCancelled && !isCompleted && (
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCallClient}>
              <Text style={styles.contactButtonIcon}>📞</Text>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleMessageClient}>
              <Text style={styles.contactButtonIcon}>💬</Text>
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contact Buttons for Awaiting Confirmation */}
        {isAwaitingClientConfirmation && (
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton} onPress={handleCallClient}>
              <Text style={styles.contactButtonIcon}>📞</Text>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton} onPress={handleMessageClient}>
              <Text style={styles.contactButtonIcon}>💬</Text>
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          {job.booking_date && (
            <Text style={styles.infoText}>📅 {formatDate(job.booking_date)}</Text>
          )}
          {job.booking_time && (
            <Text style={styles.infoText}>🕐 {job.booking_time}</Text>
          )}
        </View>

        {/* Location */}
        {(job.service_address || job.client_address || job.location) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.infoText}>
              📍 {job.service_address || job.client_address || job.location}
            </Text>
          </View>
        )}

        {/* Description/Notes */}
        {job.note && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Text style={styles.descriptionText}>{job.note}</Text>
          </View>
        )}

        {/* Awaiting Client Confirmation Message */}
        {isAwaitingClientConfirmation && (
          <View style={styles.awaitingSection}>
            <View style={styles.awaitingCard}>
              <Text style={styles.awaitingIcon}>⏳</Text>
              <Text style={styles.awaitingTitle}>Awaiting Client Confirmation</Text>
              <Text style={styles.awaitingText}>
                You've marked this job as complete. The client will review and confirm completion. You'll be notified once they approve.
              </Text>
            </View>
          </View>
        )}

        {/* Review Section */}
        {review && isCompleted && (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewCardTitle}>Client Review</Text>

            {/* Overall Rating */}
            <View style={styles.reviewRatingContainer}>
              <Text style={styles.reviewOverallLabel}>Overall Rating</Text>
              <View style={styles.reviewStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Text key={star} style={styles.reviewStar}>
                    {star <= (review.overall_rating || 0) ? '⭐' : '☆'}
                  </Text>
                ))}
                <Text style={styles.reviewRatingNumber}>{review.overall_rating}/5</Text>
              </View>
            </View>

            {/* Detailed Ratings */}
            {(review.quality_rating > 0 || review.punctuality_rating > 0 ||
              review.communication_rating > 0 || review.value_rating > 0) && (
              <View style={styles.detailedRatingsContainer}>
                {review.quality_rating > 0 && (
                  <View style={styles.detailedRatingRow}>
                    <Text style={styles.detailedRatingLabel}>Quality:</Text>
                    <View style={styles.detailedRatingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.detailedStar}>
                          {star <= review.quality_rating ? '★' : '☆'}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
                {review.punctuality_rating > 0 && (
                  <View style={styles.detailedRatingRow}>
                    <Text style={styles.detailedRatingLabel}>Punctuality:</Text>
                    <View style={styles.detailedRatingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.detailedStar}>
                          {star <= review.punctuality_rating ? '★' : '☆'}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
                {review.communication_rating > 0 && (
                  <View style={styles.detailedRatingRow}>
                    <Text style={styles.detailedRatingLabel}>Communication:</Text>
                    <View style={styles.detailedRatingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.detailedStar}>
                          {star <= review.communication_rating ? '★' : '☆'}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
                {review.value_rating > 0 && (
                  <View style={styles.detailedRatingRow}>
                    <Text style={styles.detailedRatingLabel}>Value:</Text>
                    <View style={styles.detailedRatingStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} style={styles.detailedStar}>
                          {star <= review.value_rating ? '★' : '☆'}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Review Text */}
            {review.review_text && (
              <View style={styles.reviewTextContainer}>
                <Text style={styles.reviewTextLabel}>Client Feedback:</Text>
                <Text style={styles.reviewText}>{review.review_text}</Text>
              </View>
            )}

            {/* Review Photos */}
            {review.photos && Array.isArray(review.photos) && review.photos.length > 0 && (
              <View style={styles.reviewPhotosContainer}>
                <Text style={styles.reviewPhotosLabel}>Photos:</Text>
                <View style={styles.reviewPhotosGrid}>
                  {review.photos.map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.reviewPhotoThumb}
                      onPress={() => {
                        setSelectedPhoto({ url: photo, caption: 'Review Photo' });
                        setShowPhotoModal(true);
                      }}
                    >
                      <Image
                        source={{ uri: photo }}
                        style={styles.reviewPhotoImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Review Date */}
            {review.created_at && (
              <Text style={styles.reviewDate}>
                Reviewed on {formatDate(review.created_at)}
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {!isCancelled && !isCompleted && !isAwaitingClientConfirmation && (
          <View style={styles.actionSection}>
            {isConfirmed && (
              <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={handleStartJob}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.actionButtonIcon}>🚀</Text>
                    <Text style={styles.actionButtonText}>Start Working</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isInProgress && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleCompleteJob}
                disabled={updating}
              >
                <Text style={styles.actionButtonIcon}>✓</Text>
                <Text style={styles.actionButtonText}>Mark as Complete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancelJob}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.actionButtonIcon}>✕</Text>
                  <Text style={styles.actionButtonText}>Cancel Job</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Photo Modal */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalContainer}>
          <TouchableOpacity
            style={styles.photoModalOverlay}
            activeOpacity={1}
            onPress={() => setShowPhotoModal(false)}
          >
            <View style={styles.photoModalContent}>
              {selectedPhoto && (
                <Image
                  source={{ uri: selectedPhoto.url }}
                  style={styles.photoModalImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={styles.photoModalClose}
                onPress={() => setShowPhotoModal(false)}
              >
                <Text style={styles.photoModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: SIZES.lg,
    color: COLORS.textSecondary,
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
  headerTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    padding: 16,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    ...FONTS.bold,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  serviceText: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  priceText: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  infoText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 24,
  },
  descriptionText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.small,
  },
  contactButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  contactButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  actionSection: {
    padding: SIZES.padding,
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.medium,
  },
  startButton: {
    backgroundColor: COLORS.primary,
  },
  completeButton: {
    backgroundColor: COLORS.success,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonIcon: {
    fontSize: 20,
    marginRight: 8,
    color: COLORS.white,
  },
  actionButtonText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.white,
  },
  awaitingSection: {
    padding: SIZES.padding,
  },
  awaitingCard: {
    backgroundColor: '#fff8e1',
    padding: SIZES.padding * 1.5,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffd54f',
    ...SHADOWS.small,
  },
  awaitingIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  awaitingTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: '#f57f17',
    marginBottom: 8,
    textAlign: 'center',
  },
  awaitingText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding * 1.5,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    ...SHADOWS.medium,
  },
  reviewCardTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  reviewRatingContainer: {
    marginBottom: 16,
  },
  reviewOverallLabel: {
    fontSize: SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewStar: {
    fontSize: 24,
    marginRight: 4,
  },
  reviewRatingNumber: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  detailedRatingsContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailedRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailedRatingLabel: {
    fontSize: SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textPrimary,
    flex: 1,
  },
  detailedRatingStars: {
    flexDirection: 'row',
  },
  detailedStar: {
    fontSize: 16,
    color: '#FFD700',
    marginLeft: 2,
  },
  reviewTextContainer: {
    marginBottom: 16,
  },
  reviewTextLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  reviewText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  reviewPhotosContainer: {
    marginBottom: 16,
  },
  reviewPhotosLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  reviewPhotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewPhotoThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  reviewPhotoImage: {
    width: '100%',
    height: '100%',
  },
  reviewDate: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  photoModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalImage: {
    width: '90%',
    height: '80%',
  },
  photoModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalCloseText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default JobDetailScreen;
