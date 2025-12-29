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
const WorkerDetailsScreen = ({ route, navigation }) => {
  const { worker } = route.params;
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [portfolio, setPortfolio] = useState([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [certifications, setCertifications] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteDescription, setQuoteDescription] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);
  const [completionRate, setCompletionRate] = useState(null);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loadingCompletionRate, setLoadingCompletionRate] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);

  useEffect(() => {
    fetchWorkerReviews();
    fetchPortfolio();
    fetchCertifications();
    fetchCompletionRate();
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

  const fetchCompletionRate = async () => {
    try {
      const response = await api.get(`/workers/${worker.id}/completion-rate`);
      if (response.data.success) {
        setCompletionRate(response.data.completionRate);
        setCompletedJobs(response.data.completedJobs);
        setTotalJobs(response.data.totalJobs);
      }
    } catch (error) {
      console.error('Error fetching completion rate:', error);
    } finally {
      setLoadingCompletionRate(false);
    }
  };

  const handleRequestQuote = async () => {
    if (!quoteDescription.trim()) {
      Alert.alert('Required', 'Please describe what you need');
      return;
    }

    console.log('Sending quote request for worker:', worker.id);
    setSendingQuote(true);
    try {
      const response = await api.post('/quotes/request', {
        worker_id: worker.id,
        description: quoteDescription.trim(),
        notes: quoteNotes.trim(),
      });

      console.log('Quote request response:', response.data);

      if (response.data.success) {
        Alert.alert('Success', 'Quote request sent successfully! The professional will respond soon.');
        setQuoteDescription('');
        setQuoteNotes('');
        setShowQuoteModal(false);
      } else {
        const errorMsg = response.data.error || 'Failed to send quote request';
        console.error('Quote request failed:', errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Error requesting quote:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      const errorMsg = error.response?.data?.error || error.message || 'Failed to send quote request';
      Alert.alert('Error', `Failed to send quote request: ${errorMsg}`);
    } finally {
      setSendingQuote(false);
    }
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
    navigation.navigate('AllWorkerReviews', { workerId: worker.id, workerName: worker.name });
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

  const getRatingBreakdown = () => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      const rating = Math.round(review.rating || 0);
      if (rating >= 1 && rating <= 5) {
        breakdown[rating]++;
      }
    });
    return breakdown;
  };

  const getFiveStarCount = () => {
    return reviews.filter(r => Math.round(r.rating) === 5).length;
  };

  const getFourPlusStarCount = () => {
    return reviews.filter(r => Math.round(r.rating) >= 4).length;
  };

  const handleViewPhoto = (photoUrl, reviewerName) => {
    setSelectedPhoto({ url: photoUrl, caption: `Review by ${reviewerName}` });
    setShowPhotoModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Photo Viewer Modal */}
      <Modal
        visible={showPhotoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => setShowPhotoModal(false)}
          >
            <Text style={styles.photoModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedPhoto && (
            <View style={styles.photoModalContent}>
              <Image
                source={{ uri: selectedPhoto.url }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
              <Text style={styles.photoModalCaption}>{selectedPhoto.caption}</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Portfolio Gallery Modal */}
      <Modal
        visible={showPortfolioModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPortfolioModal(false)}
      >
        <View style={styles.portfolioModalContainer}>
          <View style={styles.portfolioModalHeader}>
            <Text style={styles.portfolioModalTitle}>
              📷 Portfolio ({portfolio.length} photo{portfolio.length !== 1 ? 's' : ''})
            </Text>
            <TouchableOpacity
              style={styles.portfolioModalClose}
              onPress={() => setShowPortfolioModal(false)}
            >
              <Text style={styles.portfolioModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.portfolioModalScroll}
            contentContainerStyle={styles.portfolioModalContent}
          >
            <View style={styles.portfolioGrid}>
              {portfolio.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id || index}
                  style={styles.portfolioGridItem}
                  onPress={() => {
                    setShowPortfolioModal(false);
                    setTimeout(() => {
                      handleViewPhoto(photo.photo_url, `Portfolio photo ${index + 1}`);
                    }, 300);
                  }}
                >
                  <Image
                    source={{ uri: photo.photo_url }}
                    style={styles.portfolioGridImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

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
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleMessage}
            >
              <Text style={styles.actionButtonIcon}>💬</Text>
              <Text style={styles.secondaryButtonText}>Send Message</Text>
            </TouchableOpacity>

            {worker.phone && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleCall}
              >
                <Text style={styles.actionButtonIcon}>📱</Text>
                <Text style={styles.secondaryButtonText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons Row 2 - Request Quote */}
          <View style={[styles.actionButtons, { marginTop: 12 }]}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => setShowQuoteModal(true)}
            >
              <Text style={styles.actionButtonIcon}>💰</Text>
              <Text style={styles.primaryButtonText}>Request Quote</Text>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                📷 Portfolio ({portfolio.length} photo{portfolio.length !== 1 ? 's' : ''})
              </Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => setShowPortfolioModal(true)}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            </View>
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
                  onPress={() => handleViewPhoto(photo.photo_url, `Portfolio photo ${index + 1}`)}
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

          {completionRate !== null && totalJobs > 0 && (
            <View style={styles.completionRateBadge}>
              <Text style={styles.completionRateIcon}>✅</Text>
              <Text style={styles.completionRateText}>
                {completionRate}% completion rate
              </Text>
              <Text style={styles.completionRateSubtext}>
                ({completedJobs} completed out of {totalJobs} total jobs)
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
              {user ? (
                // Authenticated User: Show full reviews with summary
                <>
                  {/* Reviews Summary Statistics */}
                  <View style={styles.reviewsSummary}>
                    <Text style={styles.reviewsSummaryTitle}>Customer Reviews Summary</Text>
                    <View style={styles.reviewsStatsGrid}>
                      <View style={styles.reviewsStat}>
                        <Text style={styles.reviewsStatNumber}>{reviews.length}</Text>
                        <Text style={styles.reviewsStatLabel}>Total Reviews</Text>
                      </View>
                      <View style={styles.reviewsStat}>
                        <Text style={styles.reviewsStatNumber}>{calculateAverageRating()}</Text>
                        <Text style={styles.reviewsStatLabel}>Average Rating</Text>
                      </View>
                      <View style={styles.reviewsStat}>
                        <Text style={styles.reviewsStatNumber}>{getFiveStarCount()}</Text>
                        <Text style={styles.reviewsStatLabel}>5-Star Reviews</Text>
                      </View>
                      <View style={styles.reviewsStat}>
                        <Text style={styles.reviewsStatNumber}>{getFourPlusStarCount()}</Text>
                        <Text style={styles.reviewsStatLabel}>4+ Star Reviews</Text>
                      </View>
                    </View>
                  </View>

                  {/* Reviews List - Show 2 most recent */}
                  {reviews.slice(0, 2).map((review) => (
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

                      {/* Review Photos */}
                      {review.photos && Array.isArray(review.photos) && review.photos.length > 0 && (
                        <View style={styles.reviewPhotos}>
                          <View style={styles.reviewPhotosGrid}>
                            {review.photos.slice(0, 3).map((photo, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.reviewPhotoThumb}
                                onPress={() => handleViewPhoto(photo, review.client_name)}
                              >
                                <Image
                                  source={{ uri: photo }}
                                  style={styles.reviewPhotoImage}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                            ))}
                            {review.photos.length > 3 && (
                              <View style={styles.reviewPhotoMore}>
                                <Text style={styles.reviewPhotoMoreText}>
                                  +{review.photos.length - 3} more
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                  {reviews.length > 2 && (
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={handleViewReviews}
                    >
                      <Text style={styles.viewAllButtonText}>
                        View all {reviews.length} reviews
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                // Guest User: Show preview with login prompt
                <View style={styles.guestReviewsContainer}>
                  <Text style={styles.guestReviewsTitle}>Recent Customer Review</Text>

                  {/* Show only the most recent review */}
                  {reviews[0] && (
                    <View style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewerName}>{reviews[0].client_name}</Text>
                        <View style={styles.reviewStars}>
                          {renderStars(reviews[0].rating)}
                        </View>
                      </View>
                      <Text style={styles.reviewText} numberOfLines={3}>
                        {reviews[0].review}
                      </Text>
                      <Text style={styles.reviewDate}>
                        {new Date(reviews[0].created_at).toLocaleDateString()}
                      </Text>

                      {/* Review Photos (Guest - No click interaction) */}
                      {reviews[0].photos && Array.isArray(reviews[0].photos) && reviews[0].photos.length > 0 && (
                        <View style={styles.reviewPhotos}>
                          <View style={styles.reviewPhotosGrid}>
                            {reviews[0].photos.slice(0, 3).map((photo, index) => (
                              <View
                                key={index}
                                style={styles.reviewPhotoThumb}
                              >
                                <Image
                                  source={{ uri: photo }}
                                  style={styles.reviewPhotoImage}
                                  resizeMode="cover"
                                />
                              </View>
                            ))}
                            {reviews[0].photos.length > 3 && (
                              <View style={styles.reviewPhotoMore}>
                                <Text style={styles.reviewPhotoMoreText}>
                                  +{reviews[0].photos.length - 3} more
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Login Prompt */}
                  <View style={styles.guestLoginPrompt}>
                    <Text style={styles.guestLoginTitle}>
                      Want to see all {reviews.length} reviews?
                    </Text>
                    <Text style={styles.guestLoginSubtext}>
                      Login to view detailed reviews, ratings, and photos
                    </Text>
                    <TouchableOpacity
                      style={styles.guestLoginButton}
                      onPress={() => navigation.navigate('Login')}
                    >
                      <Text style={styles.guestLoginButtonText}>
                        Login to View All Reviews
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
          onPress={() => setShowQuoteModal(true)}
        >
          <Text style={styles.bottomBookButtonText}>Request Quote</Text>
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
  completionRateBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
    flexDirection: 'column',
  },
  completionRateIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  completionRateText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.success,
    marginBottom: 2,
  },
  completionRateSubtext: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  reviewsSummary: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  reviewsSummaryTitle: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  reviewsStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reviewsStat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    ...SHADOWS.small,
  },
  reviewsStatNumber: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  reviewsStatLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  guestReviewsContainer: {
    marginTop: 8,
  },
  guestReviewsTitle: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  guestLoginPrompt: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SIZES.padding * 1.5,
    marginTop: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  guestLoginTitle: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  guestLoginSubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  guestLoginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  guestLoginButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.white,
  },
  reviewPhotos: {
    marginTop: 12,
  },
  reviewPhotosGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  reviewPhotoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  reviewPhotoImage: {
    width: '100%',
    height: '100%',
  },
  reviewPhotoMore: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewPhotoMoreText: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    ...FONTS.semiBold,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
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
  photoModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  photoModalImage: {
    width: '100%',
    height: '80%',
  },
  photoModalCaption: {
    fontSize: SIZES.sm,
    color: COLORS.white,
    marginTop: 16,
    textAlign: 'center',
  },
  portfolioModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  portfolioModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding,
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  portfolioModalTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.white,
  },
  portfolioModalClose: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  portfolioModalCloseText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  portfolioModalScroll: {
    flex: 1,
  },
  portfolioModalContent: {
    padding: SIZES.padding,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  portfolioGridItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
    ...SHADOWS.small,
  },
  portfolioGridImage: {
    width: '100%',
    height: '100%',
  },
});

export default WorkerDetailsScreen;
