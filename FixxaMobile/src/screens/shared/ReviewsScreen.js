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
} from 'react-native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate } from '../../utils/formatting';
import { ReviewsListSkeleton } from '../../components/LoadingSkeleton';
import BurgerMenu from '../../components/BurgerMenu';

const ReviewsScreen = ({ navigation }) => {
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews');
      if (response.data.reviews) {
        setReviews(response.data.reviews);
      }

      // Calculate statistics from reviews
      if (response.data.reviews && response.data.reviews.length > 0) {
        const stats = calculateStatistics(response.data.reviews);
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateStatistics = (reviewsData) => {
    const totalReviews = reviewsData.length;
    const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;

    // Count reviews by star rating
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    reviewsData.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    // Calculate percentages
    const ratingPercentages = {};
    Object.keys(ratingDistribution).forEach(rating => {
      ratingPercentages[rating] = (ratingDistribution[rating] / totalReviews) * 100;
    });

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
      ratingPercentages,
    };
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i <= rating ? '⭐' : '☆'}
        </Text>
      );
    }
    return stars;
  };

  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <View style={styles.statisticsCard}>
        <Text style={styles.statisticsTitle}>Review Statistics</Text>

        {/* Average Rating Display */}
        <View style={styles.averageRatingContainer}>
          <View style={styles.averageRatingCircle}>
            <Text style={styles.averageRatingNumber}>
              {statistics.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.averageRatingLabel}>out of 5</Text>
          </View>

          <View style={styles.ratingBarsContainer}>
            {[5, 4, 3, 2, 1].map(rating => (
              <View key={rating} style={styles.ratingBarRow}>
                <Text style={styles.ratingBarLabel}>{rating}⭐</Text>
                <View style={styles.ratingBar}>
                  <View
                    style={[
                      styles.ratingBarFill,
                      { width: `${statistics.ratingPercentages[rating] || 0}%` },
                    ]}
                  />
                </View>
                <Text style={styles.ratingBarCount}>
                  {statistics.ratingDistribution[rating]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Total Reviews */}
        <View style={styles.totalReviewsContainer}>
          <Text style={styles.totalReviewsText}>
            Based on {statistics.totalReviews} review{statistics.totalReviews !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    );
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      {/* Review Header */}
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.client_name}</Text>
          <View style={styles.ratingContainer}>
            {renderStars(item.rating)}
          </View>
        </View>
        <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
      </View>

      {/* Review Content */}
      {item.review_text && (
        <Text style={styles.reviewText}>{item.review_text}</Text>
      )}

      {/* Review Images */}
      {item.images && item.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {item.images.slice(0, 3).map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              style={styles.reviewImage}
              resizeMode="cover"
            />
          ))}
          {item.images.length > 3 && (
            <View style={styles.moreImagesOverlay}>
              <Text style={styles.moreImagesText}>+{item.images.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Booking Info */}
      <View style={styles.bookingInfo}>
        <Text style={styles.bookingInfoText}>
          Service: {item.service_type || 'N/A'}
        </Text>
        {item.worker_name && (
          <Text style={styles.bookingInfoText}>
            Worker: {item.worker_name}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return <ReviewsListSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Top Bar with Burger Menu */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reviews</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Reviews</Text>
          <Text style={styles.headerSubtitle}>
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Write Review Button */}
        <TouchableOpacity
          style={styles.writeReviewButton}
          onPress={() => navigation.navigate('CreateReview')}
        >
          <Text style={styles.writeReviewIcon}>✍️</Text>
          <Text style={styles.writeReviewText}>Write</Text>
        </TouchableOpacity>
      </View>

      {/* Reviews List */}
      <FlatList
        data={reviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderStatistics}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyText}>No reviews yet</Text>
            <Text style={styles.emptySubtext}>
              Complete a booking to leave your first review!
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
  topBar: {
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
  topBarTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding * 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 4,
  },
  writeReviewButton: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  writeReviewIcon: {
    fontSize: 16,
  },
  writeReviewText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: SIZES.md,
    color: 'rgba(255,255,255,0.9)',
  },
  listContent: {
    padding: SIZES.padding,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
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
  ratingContainer: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    marginRight: 2,
  },
  reviewDate: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  reviewText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    position: 'relative',
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  moreImagesOverlay: {
    position: 'absolute',
    right: 0,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: COLORS.white,
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  bookingInfo: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 12,
  },
  bookingInfoText: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  statisticsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  statisticsTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  averageRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  averageRatingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  averageRatingNumber: {
    fontSize: 32,
    ...FONTS.bold,
    color: COLORS.white,
  },
  averageRatingLabel: {
    fontSize: SIZES.xs,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  ratingBarsContainer: {
    flex: 1,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingBarLabel: {
    width: 50,
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  ratingBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  ratingBarCount: {
    width: 30,
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  totalReviewsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 12,
    alignItems: 'center',
  },
  totalReviewsText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
});

export default ReviewsScreen;
