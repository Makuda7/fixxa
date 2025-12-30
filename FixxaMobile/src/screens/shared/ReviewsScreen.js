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
  ScrollView,
} from 'react-native';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency } from '../../utils/formatting';
import { ReviewsListSkeleton } from '../../components/LoadingSkeleton';
import BurgerMenu from '../../components/BurgerMenu';

const ReviewsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('myReviews'); // For workers: myReviews | statistics | starFilter
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userType, setUserType] = useState(null);
  const [starFilter, setStarFilter] = useState(null); // null = all, or 1-5

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    filterReviews();
  }, [reviews, starFilter]);

  const initializeScreen = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserType(user.type);
        // Set initial tab based on user type
        if (user.type === 'worker') {
          setActiveTab('myReviews');
        } else {
          setActiveTab('pending');
        }
      }
      await fetchData();
    } catch (error) {
      console.error('Error initializing screen:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const userData = await AsyncStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;

    if (user?.type === 'worker') {
      await fetchReviews();
    } else {
      await Promise.all([
        fetchReviews(),
        fetchPendingJobs(),
      ]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const filterReviews = () => {
    if (starFilter === null) {
      setFilteredReviews(reviews);
    } else {
      const filtered = reviews.filter(
        review => Math.round(review.overall_rating || review.rating) === starFilter
      );
      setFilteredReviews(filtered);
    }
  };

  const fetchReviews = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      // Use different endpoints based on user type
      const endpoint = user?.type === 'worker' ? '/reviews/worker' : '/reviews/client';
      console.log('🔍 Fetching reviews from:', endpoint);

      const response = await api.get(endpoint);
      console.log('📊 Reviews response:', response.data);

      if (response.data.reviews) {
        setReviews(response.data.reviews);
        setFilteredReviews(response.data.reviews);

        // Calculate statistics
        if (response.data.reviews.length > 0) {
          const stats = calculateStatistics(response.data.reviews);
          setStatistics(stats);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchPendingJobs = async () => {
    try {
      const response = await api.get('/client-dashboard');
      if (response.data.bookings) {
        // Filter completed jobs without reviews
        const completed = response.data.bookings.filter(
          booking => booking.status?.toLowerCase() === 'completed' && !booking.has_review
        );
        setPendingJobs(completed);
      }
    } catch (error) {
      console.error('Error fetching pending jobs:', error);
    }
  };

  const calculateStatistics = (reviewsData) => {
    const totalReviews = reviewsData.length;
    const totalRating = reviewsData.reduce((sum, review) => sum + (review.overall_rating || review.rating), 0);
    const averageRating = totalRating / totalReviews;

    // Calculate this month's reviews
    const now = new Date();
    const thisMonth = reviewsData.filter(review => {
      const reviewDate = new Date(review.created_at);
      return reviewDate.getMonth() === now.getMonth() &&
             reviewDate.getFullYear() === now.getFullYear();
    }).length;

    return {
      totalReviews,
      averageRating,
      thisMonth,
      pending: pendingJobs.length,
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  // Tab Navigation
  const renderTabs = () => {
    if (userType === 'worker') {
      return (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'myReviews' && styles.tabActive]}
            onPress={() => setActiveTab('myReviews')}
          >
            <Text style={[styles.tabText, activeTab === 'myReviews' && styles.tabTextActive]}>
              All Reviews
            </Text>
            {reviews.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{reviews.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'statistics' && styles.tabActive]}
            onPress={() => setActiveTab('statistics')}
          >
            <Text style={[styles.tabText, activeTab === 'statistics' && styles.tabTextActive]}>
              Statistics
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Client tabs
    return (
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending Reviews
          </Text>
          {pendingJobs.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pendingJobs.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'myReviews' && styles.tabActive]}
          onPress={() => setActiveTab('myReviews')}
        >
          <Text style={[styles.tabText, activeTab === 'myReviews' && styles.tabTextActive]}>
            My Reviews
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'statistics' && styles.tabActive]}
          onPress={() => setActiveTab('statistics')}
        >
          <Text style={[styles.tabText, activeTab === 'statistics' && styles.tabTextActive]}>
            Statistics
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Pending Reviews Tab Content
  const renderPendingTab = () => (
    <FlatList
      data={pendingJobs}
      renderItem={renderPendingJob}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>No pending reviews</Text>
          <Text style={styles.emptySubtext}>
            All your completed jobs have been reviewed!
          </Text>
        </View>
      }
    />
  );

  const renderPendingJob = ({ item }) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{item.service_type}</Text>
        <Text style={styles.jobDate}>{formatDate(item.booking_date)}</Text>
      </View>

      <View style={styles.jobDetails}>
        <Text style={styles.jobDetailsText}>
          <Text style={styles.jobDetailsLabel}>Worker: </Text>
          {item.worker_name || 'Not assigned'}
        </Text>
        {item.price && (
          <Text style={styles.jobDetailsText}>
            <Text style={styles.jobDetailsLabel}>Price: </Text>
            {formatCurrency(item.price)}
          </Text>
        )}
        <Text style={styles.jobDetailsText}>
          <Text style={styles.jobDetailsLabel}>Status: </Text>
          Completed
        </Text>
      </View>

      <View style={styles.reviewStatus}>
        <View style={styles.statusBadgePending}>
          <Text style={styles.statusBadgeText}>Review Pending</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.writeReviewBtn}
        onPress={() => navigation.navigate('CreateReview', { booking: item })}
      >
        <Text style={styles.writeReviewBtnText}>Write Review</Text>
      </TouchableOpacity>
    </View>
  );

  // Star Filter Row (for workers)
  const renderStarFilters = () => {
    if (userType !== 'worker') return null;

    const filterOptions = [
      { label: 'All', value: null },
      { label: '5⭐', value: 5 },
      { label: '4⭐', value: 4 },
      { label: '3⭐', value: 3 },
      { label: '2⭐', value: 2 },
      { label: '1⭐', value: 1 },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.filterContainer}
      >
        {filterOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterButton,
              starFilter === option.value && styles.filterButtonActive
            ]}
            onPress={() => setStarFilter(option.value)}
          >
            <Text style={[
              styles.filterButtonText,
              starFilter === option.value && styles.filterButtonTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // My Reviews Tab Content
  const renderMyReviewsTab = () => (
    <View style={{ flex: 1 }}>
      {renderStarFilters()}
      <FlatList
        data={filteredReviews}
        renderItem={renderReviewItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyText}>
              {userType === 'worker' ? 'No reviews received yet' : 'No reviews yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {userType === 'worker'
                ? 'Complete jobs to start receiving reviews from clients!'
                : 'Complete a booking to leave your first review!'
              }
            </Text>
          </View>
        }
      />
    </View>
  );

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>
            {userType === 'worker' ? (item.client_name || 'Anonymous Client') : item.worker_name}
          </Text>
          <View style={styles.ratingContainer}>
            {renderStars(item.overall_rating || item.rating)}
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
          {userType !== 'worker' && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('EditReview', { reviewId: item.id })}
            >
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {item.review_text && (
        <Text style={styles.reviewText}>{item.review_text}</Text>
      )}

      {item.photos && item.photos.length > 0 && (
        <View style={styles.imagesContainer}>
          {item.photos.slice(0, 3).map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.reviewImage}
              resizeMode="cover"
            />
          ))}
          {item.photos.length > 3 && (
            <View style={styles.moreImagesOverlay}>
              <Text style={styles.moreImagesText}>+{item.photos.length - 3}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.bookingInfo}>
        <Text style={styles.bookingInfoText}>
          Service: {item.service_type || 'N/A'}
        </Text>
      </View>
    </View>
  );

  // Statistics Tab Content
  const renderStatisticsTab = () => {
    if (!statistics || reviews.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No statistics yet</Text>
          <Text style={styles.emptySubtext}>
            Leave your first review to see statistics!
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        contentContainerStyle={styles.statsScrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{statistics.totalReviews}</Text>
            <Text style={styles.statLabel}>Total Reviews</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{statistics.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Average Rating</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pendingJobs.length}</Text>
            <Text style={styles.statLabel}>Pending Reviews</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{statistics.thisMonth}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        <View style={styles.impactCard}>
          <Text style={styles.impactTitle}>Your Review Impact</Text>
          <Text style={styles.impactText}>
            Your honest reviews help other customers choose the right professionals and help our service providers improve their offerings.
          </Text>
          <Text style={styles.impactText}>
            Thank you for being part of the Fixxa community!
          </Text>
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return <ReviewsListSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reviews & Ratings</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <Text style={styles.headerSubtitle}>
          Manage your feedback and reviews
        </Text>
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'pending' && renderPendingTab()}
        {activeTab === 'myReviews' && renderMyReviewsTab()}
        {activeTab === 'statistics' && renderStatisticsTab()}
      </View>
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
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding * 2,
    paddingTop: 0,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.primary,
    backgroundColor: '#f9fff9',
  },
  tabText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: '#666',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    ...FONTS.bold,
  },
  tabContent: {
    flex: 1,
  },
  listContent: {
    padding: SIZES.padding,
  },
  statsScrollContent: {
    padding: SIZES.padding,
  },
  // Pending Job Card Styles
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...SHADOWS.small,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: SIZES.lg,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  jobDate: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  jobDetails: {
    marginBottom: 12,
  },
  jobDetailsText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  jobDetailsLabel: {
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  reviewStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadgePending: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
  },
  statusBadgeText: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: '#856404',
  },
  writeReviewBtn: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  writeReviewBtnText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  // Review Card Styles
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
  headerRight: {
    alignItems: 'flex-end',
  },
  reviewDate: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.white,
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
  // Statistics Styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: 32,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  impactCard: {
    backgroundColor: '#f8f9fa',
    padding: SIZES.padding * 1.5,
    borderRadius: 12,
    alignItems: 'center',
  },
  impactTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  impactText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  // Empty States
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
  // Star Filter Styles
  filterScrollView: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
});

export default ReviewsScreen;
