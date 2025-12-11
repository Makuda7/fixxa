import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import SafetyTipsModal from '../../components/SafetyTipsModal';

const WorkerDetailsScreen = ({ route, navigation }) => {
  const { worker } = route.params;
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [certifications, setCertifications] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);

  useEffect(() => {
    fetchWorkerReviews();
    fetchPortfolio();
    fetchCertifications();
  }, []);

  const fetchWorkerReviews = async () => {
    try {
      const response = await api.get(`/reviews/worker/${worker.id}`);
      if (response.data.reviews) {
        setReviews(response.data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await api.get(`/workers/${worker.id}/portfolio`);
      if (response.data.portfolio) {
        setPortfolio(response.data.portfolio);
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const fetchCertifications = async () => {
    try {
      const response = await api.get(`/workers/${worker.id}/certifications`);
      if (response.data.certifications) {
        setCertifications(response.data.certifications);
      }
    } catch (error) {
      console.error('Error fetching certifications:', error);
    } finally {
      setLoadingCerts(false);
    }
  };

  const handleRequestQuote = async () => {
    if (!quoteDescription.trim()) {
      Alert.alert('Required', 'Please describe what you need');
      return;
    }

    setSendingQuote(true);
    try {
      const response = await api.post('/quotes/request', {
        worker_id: worker.id,
        description: quoteDescription.trim(),
        notes: quoteNotes.trim(),
      });

      if (response.data.success) {
        Alert.alert('Success', 'Quote request sent successfully! The professional will respond soon.');
        setQuoteDescription('');
        setQuoteNotes('');
        setShowQuoteModal(false);
      } else {
        Alert.alert('Error', 'Failed to send quote request');
      }
    } catch (error) {
      console.error('Error requesting quote:', error);
      Alert.alert('Error', 'Failed to send quote request. Please try again.');
    } finally {
      setSendingQuote(false);
    }
  };

  const handleBookNow = () => {
    // Show safety tips first
    setShowSafetyModal(true);
  };

  const handleProceedToBooking = () => {
    setShowSafetyModal(false);
    navigation.navigate('CreateBooking', { worker });
  };

  const handleMessage = () => {
    // Navigate directly to chat screen with worker info
    navigation.navigate('ChatScreen', {
      workerId: worker.id,
      workerName: worker.name,
      conversation: {
        other_user_name: worker.name,
        booking_id: null, // No booking yet, just a direct message
      },
    });
  };

  const handleCall = () => {
    if (worker.phone) {
      const phoneNumber = worker.phone.replace(/\s/g, '');
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('No Phone', 'This professional has not provided a phone number.');
    }
  };

  const handleViewReviews = () => {
    navigation.navigate('Reviews', { workerId: worker.id });
  };

  const renderStars = (rating) => {
    const stars = [];
    const numRating = parseFloat(rating) || 0;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i <= numRating ? '⭐' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  return (
    <View style={styles.container}>
      {/* Safety Tips Modal */}
      <SafetyTipsModal
        visible={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        onProceed={handleProceedToBooking}
      />

      {/* Request Quote Modal */}
      <Modal
        visible={showQuoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuoteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.contactModalContent}>
                <View style={styles.contactModalHeader}>
                  <Text style={styles.contactModalTitle}>Request Quote from {worker.name}</Text>
                  <TouchableOpacity onPress={() => setShowQuoteModal(false)}>
                    <Text style={styles.closeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.contactModalSubtitle}>
                    Describe what you need and the professional will provide a custom quote
                  </Text>

                  <Text style={styles.inputLabel}>What do you need? *</Text>
                  <TextInput
                    style={styles.contactTextArea}
                    value={quoteDescription}
                    onChangeText={setQuoteDescription}
                    placeholder="E.g., Kitchen plumbing repair, electrical outlet installation..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={300}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />

                  <Text style={styles.charCount}>
                    {quoteDescription.length}/300 characters
                  </Text>

                  <Text style={styles.inputLabel}>Additional Details (Optional)</Text>
                  <TextInput
                    style={styles.contactTextArea}
                    value={quoteNotes}
                    onChangeText={setQuoteNotes}
                    placeholder="Size, timeframe, specific requirements..."
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={300}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />

                  <Text style={styles.charCount}>
                    {quoteNotes.length}/300 characters
                  </Text>

                  <View style={styles.contactModalFooter}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowQuoteModal(false);
                        setQuoteDescription('');
                        setQuoteNotes('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.sendButton, sendingQuote && styles.sendButtonDisabled]}
                      onPress={handleRequestQuote}
                      disabled={sendingQuote || !quoteDescription.trim()}
                    >
                      {sendingQuote ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                      ) : (
                        <Text style={styles.sendButtonText}>Send Request</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {worker.profile_picture || worker.image ? (
              <Image
                source={{ uri: worker.profile_picture || worker.image }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {worker.name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {worker.is_verified && (
              <View style={styles.verifiedBadgeContainer}>
                <Text style={styles.verifiedBadge}>✓</Text>
              </View>
            )}
          </View>

          <Text style={styles.workerName}>{worker.name}</Text>
          <Text style={styles.speciality}>{worker.speciality}</Text>

          {/* Certified Banner */}
          {certifications.length > 0 && (
            <View style={styles.certifiedBanner}>
              <Text style={styles.certifiedIcon}>✓</Text>
              <Text style={styles.certifiedText}>
                Certified Professional ({certifications.length} certificate{certifications.length !== 1 ? 's' : ''})
              </Text>
            </View>
          )}

          {worker.primary_suburb && (
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>
                {worker.primary_suburb}
                {worker.province && `, ${worker.province}`}
              </Text>
            </View>
          )}

          {/* Rating Display */}
          <View style={styles.ratingSection}>
            <View style={styles.starsRow}>
              {renderStars(reviews.length > 0 ? calculateAverageRating() : worker.rating)}
            </View>
            <Text style={styles.ratingText}>
              {reviews.length > 0 ? calculateAverageRating() : (parseFloat(worker.rating) || 0).toFixed(1)}
              ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
            </Text>
          </View>

          {/* Action Buttons Row 1 */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleBookNow}
            >
              <Text style={styles.actionButtonIcon}>📅</Text>
              <Text style={styles.primaryButtonText}>Book Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleMessage}
            >
              <Text style={styles.actionButtonIcon}>💬</Text>
              <Text style={styles.secondaryButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons Row 2 */}
          {worker.phone && (
            <View style={[styles.actionButtons, { marginTop: 12 }]}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleCall}
              >
                <Text style={styles.actionButtonIcon}>📱</Text>
                <Text style={styles.secondaryButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons Row 3 - Request Quote */}
          <View style={[styles.actionButtons, { marginTop: 12 }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.quoteButton]}
              onPress={() => setShowQuoteModal(true)}
            >
              <Text style={styles.actionButtonIcon}>💰</Text>
              <Text style={styles.quoteButtonText}>Request Quote</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        {worker.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{worker.bio}</Text>
          </View>
        )}

        {/* Portfolio Gallery */}
        {portfolio.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Portfolio ({portfolio.length} photo{portfolio.length !== 1 ? 's' : ''})
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.portfolioScroll}
            >
              {portfolio.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id || index}
                  style={styles.portfolioImageContainer}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: photo.photo_url }}
                    style={styles.portfolioImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}


        {/* Experience & Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>

          {worker.experience && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>💼</Text>
              <Text style={styles.detailLabel}>Experience:</Text>
              <Text style={styles.detailValue}>
                {worker.experience} year{worker.experience !== '1' ? 's' : ''}
              </Text>
            </View>
          )}

          {worker.rate_type && worker.rate_amount && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>💰</Text>
              <Text style={styles.detailLabel}>Rate:</Text>
              <Text style={styles.detailValue}>
                R{parseFloat(worker.rate_amount).toFixed(2)}
                {worker.rate_type === 'hourly' ? '/hour' : ' (fixed)'}
              </Text>
            </View>
          )}

          {worker.service_radius && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🚗</Text>
              <Text style={styles.detailLabel}>Service Area:</Text>
              <Text style={styles.detailValue}>{worker.service_radius} km radius</Text>
            </View>
          )}

          {worker.is_available !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>
                {worker.is_available ? '✅' : '⏸️'}
              </Text>
              <Text style={styles.detailLabel}>Availability:</Text>
              <Text style={styles.detailValue}>
                {worker.is_available ? 'Available now' : 'Currently unavailable'}
              </Text>
            </View>
          )}

          {worker.id_verified && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🆔</Text>
              <Text style={styles.detailLabel}>ID Verified:</Text>
              <Text style={[styles.detailValue, styles.verifiedText]}>Yes ✓</Text>
            </View>
          )}
        </View>

        {/* Secondary Service Areas */}
        {worker.secondary_areas && worker.secondary_areas.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Also Serves</Text>
            <View style={styles.areasContainer}>
              {worker.secondary_areas.map((area, index) => (
                <View key={index} style={styles.areaChip}>
                  <Text style={styles.areaChipText}>{area}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            {reviews.length > 0 && (
              <TouchableOpacity onPress={handleViewReviews}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingReviews ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : reviews.length > 0 ? (
            <View>
              {reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{review.client_name}</Text>
                    <View style={styles.reviewStars}>
                      {renderStars(review.rating)}
                    </View>
                  </View>
                  <Text style={styles.reviewText} numberOfLines={3}>
                    {review.review}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
              {reviews.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewReviews}
                >
                  <Text style={styles.viewAllButtonText}>
                    View all {reviews.length} reviews
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.noReviews}>
              <Text style={styles.noReviewsIcon}>📝</Text>
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSubtext}>
                Be the first to review this professional
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          {worker.rate_amount && (
            <>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.priceAmount}>
                R{parseFloat(worker.rate_amount).toFixed(2)}
              </Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={styles.bottomBookButton}
          onPress={handleBookNow}
        >
          <Text style={styles.bottomBookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding * 2,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.lightGray,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    ...FONTS.bold,
    color: COLORS.white,
  },
  verifiedBadgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.success,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  verifiedBadge: {
    fontSize: 18,
    color: COLORS.white,
  },
  workerName: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  speciality: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  locationText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  star: {
    fontSize: 20,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  primaryButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.white,
  },
  secondaryButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  quoteButton: {
    backgroundColor: '#FF9800',
    borderWidth: 0,
  },
  quoteButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.white,
  },
  section: {
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    marginTop: 8,
    padding: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  bioText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 10,
    width: 28,
  },
  detailLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  detailValue: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  verifiedText: {
    color: COLORS.success,
  },
  areasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  areaChipText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  reviewCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  viewAllButton: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  viewAllButtonText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  noReviews: {
    alignItems: 'center',
    padding: 32,
  },
  noReviewsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noReviewsText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  noReviewsSubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  bottomPadding: {
    height: 100,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    ...SHADOWS.medium,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  priceAmount: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  bottomBookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    ...SHADOWS.small,
  },
  bottomBookButtonText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.white,
  },
  portfolioScroll: {
    paddingRight: SIZES.padding,
  },
  portfolioImageContainer: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  portfolioImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  certifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  certifiedIcon: {
    fontSize: 16,
    color: COLORS.success,
    marginRight: 6,
  },
  certifiedText: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  contactModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SIZES.padding,
    maxHeight: '80%',
  },
  modalScrollView: {
    flexGrow: 0,
  },
  contactModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactModalTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  closeIcon: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  contactModalSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 8,
  },
  contactTextArea: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  charCount: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'right',
  },
  contactModalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
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
  sendButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  sendButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.bold,
    color: COLORS.white,
  },
});

export default WorkerDetailsScreen;
