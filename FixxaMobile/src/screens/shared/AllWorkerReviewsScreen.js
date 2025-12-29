import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';

const AllWorkerReviewsScreen = ({ route, navigation }) => {
  const { workerId, workerName } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/reviews/worker/${workerId}`);
      if (response.data.reviews) {
        setReviews(response.data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
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

  const handleViewPhoto = (photoUrl, reviewerName) => {
    setSelectedPhoto({ url: photoUrl, caption: `Review by ${reviewerName}` });
    setShowPhotoModal(true);
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + parseFloat(review.overall_rating || review.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getRatingBreakdown = () => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      const rating = Math.round(parseFloat(review.overall_rating || review.rating || 0));
      if (rating >= 1 && rating <= 5) {
        breakdown[rating]++;
      }
    });
    return breakdown;
  };

  const renderRatingBar = (stars, count) => {
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return (
      <View style={styles.ratingBarRow}>
        <Text style={styles.ratingBarLabel}>{stars} ⭐</Text>
        <View style={styles.ratingBarContainer}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.client_name || 'Anonymous'}</Text>
          <View style={styles.reviewDate}>
            <Text style={styles.reviewDateText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <View style={styles.reviewStars}>
          {renderStars(item.overall_rating || item.rating)}
        </View>
      </View>

      {/* Detailed Ratings */}
      {(item.quality_rating || item.punctuality_rating || item.communication_rating || item.value_rating) && (
        <View style={styles.detailedRatings}>
          {item.quality_rating > 0 && (
            <View style={styles.detailedRatingRow}>
              <Text style={styles.detailedRatingLabel}>Quality:</Text>
              <View style={styles.detailedRatingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text key={star} style={styles.smallStar}>
                    {star <= item.quality_rating ? '★' : '☆'}
                  </Text>
                ))}
              </View>
            </View>
          )}
          {item.punctuality_rating > 0 && (
            <View style={styles.detailedRatingRow}>
              <Text style={styles.detailedRatingLabel}>Punctuality:</Text>
              <View style={styles.detailedRatingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text key={star} style={styles.smallStar}>
                    {star <= item.punctuality_rating ? '★' : '☆'}
                  </Text>
                ))}
              </View>
            </View>
          )}
          {item.communication_rating > 0 && (
            <View style={styles.detailedRatingRow}>
              <Text style={styles.detailedRatingLabel}>Communication:</Text>
              <View style={styles.detailedRatingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text key={star} style={styles.smallStar}>
                    {star <= item.communication_rating ? '★' : '☆'}
                  </Text>
                ))}
              </View>
            </View>
          )}
          {item.value_rating > 0 && (
            <View style={styles.detailedRatingRow}>
              <Text style={styles.detailedRatingLabel}>Value:</Text>
              <View style={styles.detailedRatingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Text key={star} style={styles.smallStar}>
                    {star <= item.value_rating ? '★' : '☆'}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Review Text */}
      {item.review_text && (
        <Text style={styles.reviewText}>{item.review_text}</Text>
      )}

      {/* Review Photos */}
      {item.photos && Array.isArray(item.photos) && item.photos.length > 0 && (
        <View style={styles.reviewPhotos}>
          <View style={styles.reviewPhotosGrid}>
            {item.photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.reviewPhotoThumb}
                onPress={() => handleViewPhoto(photo, item.client_name)}
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
    </View>
  );

  const ratingBreakdown = getRatingBreakdown();

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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            reviews.length > 0 ? (
              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>
                  {workerName || 'Professional'}'s Reviews
                </Text>

                {/* Overall Rating */}
                <View style={styles.overallRating}>
                  <Text style={styles.overallRatingNumber}>
                    {calculateAverageRating()}
                  </Text>
                  <View style={styles.overallStars}>
                    {renderStars(calculateAverageRating())}
                  </View>
                  <Text style={styles.totalReviewsText}>
                    Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Rating Breakdown */}
                <View style={styles.ratingBreakdown}>
                  {renderRatingBar(5, ratingBreakdown[5])}
                  {renderRatingBar(4, ratingBreakdown[4])}
                  {renderRatingBar(3, ratingBreakdown[3])}
                  {renderRatingBar(2, ratingBreakdown[2])}
                  {renderRatingBar(1, ratingBreakdown[1])}
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>No reviews yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to review this professional
              </Text>
            </View>
          }
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SIZES.padding,
  },
  summarySection: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding * 1.5,
    borderRadius: 12,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  summaryTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  overallRating: {
    alignItems: 'center',
    marginBottom: 24,
  },
  overallRatingNumber: {
    fontSize: 48,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 8,
  },
  overallStars: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    fontSize: 24,
    marginHorizontal: 2,
  },
  totalReviewsText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  ratingBreakdown: {
    marginTop: 8,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingBarLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    width: 40,
  },
  ratingBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#ffc107',
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  reviewDate: {
    marginTop: 4,
  },
  reviewDateText: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  detailedRatings: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailedRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailedRatingLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    width: 100,
  },
  detailedRatingStars: {
    flexDirection: 'row',
  },
  smallStar: {
    fontSize: 14,
    color: '#ffc107',
    marginHorizontal: 1,
  },
  reviewText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
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
    width: 100,
    height: 100,
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
  emptyState: {
    alignItems: 'center',
    padding: 60,
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
});

export default AllWorkerReviewsScreen;
