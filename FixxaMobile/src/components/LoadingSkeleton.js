import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS, SIZES, SHADOWS } from '../styles/theme';

// Skeleton placeholder component with shimmer effect
export const SkeletonPlaceholder = ({ width, height, borderRadius = 8, style }) => {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Dashboard skeleton
export const DashboardSkeleton = () => (
  <View style={styles.container}>
    {/* Header skeleton */}
    <View style={styles.header}>
      <SkeletonPlaceholder width="60%" height={32} style={{ marginBottom: 8 }} />
      <SkeletonPlaceholder width="40%" height={16} />
    </View>

    {/* Hero button skeleton */}
    <View style={styles.heroContainer}>
      <SkeletonPlaceholder width="100%" height={100} borderRadius={16} />
    </View>

    {/* Stats skeleton */}
    <View style={styles.statsContainer}>
      <SkeletonPlaceholder width="30%" height={80} borderRadius={12} />
      <SkeletonPlaceholder width="30%" height={80} borderRadius={12} />
      <SkeletonPlaceholder width="30%" height={80} borderRadius={12} />
    </View>

    {/* Bookings skeleton */}
    <View style={styles.section}>
      <SkeletonPlaceholder width="50%" height={24} style={{ marginBottom: 16 }} />
      <SkeletonPlaceholder width="100%" height={120} borderRadius={12} style={{ marginBottom: 12 }} />
      <SkeletonPlaceholder width="100%" height={120} borderRadius={12} style={{ marginBottom: 12 }} />
      <SkeletonPlaceholder width="100%" height={120} borderRadius={12} />
    </View>
  </View>
);

// Bookings list skeleton
export const BookingsListSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <SkeletonPlaceholder width="50%" height={32} style={{ marginBottom: 8 }} />
      <SkeletonPlaceholder width="30%" height={16} />
    </View>

    <View style={styles.filtersContainer}>
      <SkeletonPlaceholder width={60} height={36} borderRadius={18} style={{ marginRight: 8 }} />
      <SkeletonPlaceholder width={80} height={36} borderRadius={18} style={{ marginRight: 8 }} />
      <SkeletonPlaceholder width={100} height={36} borderRadius={18} style={{ marginRight: 8 }} />
      <SkeletonPlaceholder width={90} height={36} borderRadius={18} />
    </View>

    <View style={styles.listContainer}>
      {[1, 2, 3, 4].map((i) => (
        <SkeletonPlaceholder
          key={i}
          width="100%"
          height={150}
          borderRadius={12}
          style={{ marginBottom: 12 }}
        />
      ))}
    </View>
  </View>
);

// Find Professional skeleton
export const FindProfessionalSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <SkeletonPlaceholder width="60%" height={32} style={{ marginBottom: 8 }} />
      <SkeletonPlaceholder width="40%" height={16} />
    </View>

    <View style={styles.searchContainer}>
      <SkeletonPlaceholder width="100%" height={48} borderRadius={12} />
    </View>

    <View style={styles.filtersContainer}>
      <SkeletonPlaceholder width={60} height={36} borderRadius={18} style={{ marginRight: 8 }} />
      <SkeletonPlaceholder width={90} height={36} borderRadius={18} style={{ marginRight: 8 }} />
      <SkeletonPlaceholder width={100} height={36} borderRadius={18} style={{ marginRight: 8 }} />
      <SkeletonPlaceholder width={80} height={36} borderRadius={18} />
    </View>

    <View style={styles.listContainer}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.workerCardSkeleton}>
          <SkeletonPlaceholder width={60} height={60} borderRadius={30} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <SkeletonPlaceholder width="70%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonPlaceholder width="50%" height={16} style={{ marginBottom: 8 }} />
            <SkeletonPlaceholder width="60%" height={16} style={{ marginBottom: 12 }} />
            <SkeletonPlaceholder width="100%" height={40} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  </View>
);

// Reviews list skeleton
export const ReviewsListSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <SkeletonPlaceholder width="50%" height={32} style={{ marginBottom: 8 }} />
      <SkeletonPlaceholder width="30%" height={16} />
    </View>

    <View style={styles.listContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.reviewCardSkeleton}>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <SkeletonPlaceholder width="60%" height={18} style={{ marginBottom: 8 }} />
              <SkeletonPlaceholder width="40%" height={16} />
            </View>
            <SkeletonPlaceholder width={60} height={16} />
          </View>
          <SkeletonPlaceholder width="100%" height={60} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            <SkeletonPlaceholder width={80} height={80} borderRadius={8} style={{ marginRight: 8 }} />
            <SkeletonPlaceholder width={80} height={80} borderRadius={8} style={{ marginRight: 8 }} />
            <SkeletonPlaceholder width={80} height={80} borderRadius={8} />
          </View>
          <SkeletonPlaceholder width="100%" height={40} />
        </View>
      ))}
    </View>
  </View>
);

// Profile skeleton
export const ProfileSkeleton = () => (
  <View style={styles.container}>
    <View style={styles.header}>
      <SkeletonPlaceholder width={80} height={80} borderRadius={40} style={{ marginBottom: 16 }} />
      <SkeletonPlaceholder width="50%" height={28} style={{ marginBottom: 8 }} />
      <SkeletonPlaceholder width="30%" height={14} />
    </View>

    <View style={styles.section}>
      <SkeletonPlaceholder width="40%" height={16} style={{ marginBottom: 12 }} />
      <View style={styles.card}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.profileItem}>
            <SkeletonPlaceholder width={24} height={24} style={{ marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <SkeletonPlaceholder width="30%" height={12} style={{ marginBottom: 6 }} />
              <SkeletonPlaceholder width="60%" height={16} />
            </View>
          </View>
        ))}
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.lightGray,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding * 2,
    paddingTop: 60,
    paddingBottom: 30,
  },
  heroContainer: {
    padding: SIZES.padding,
    paddingTop: SIZES.padding * 1.5,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    justifyContent: 'space-between',
  },
  section: {
    padding: SIZES.padding,
  },
  searchContainer: {
    padding: SIZES.padding,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    marginBottom: 16,
  },
  listContainer: {
    padding: SIZES.padding,
  },
  workerCardSkeleton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    ...SHADOWS.small,
  },
  reviewCardSkeleton: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  profileItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
});

export default {
  SkeletonPlaceholder,
  DashboardSkeleton,
  BookingsListSkeleton,
  FindProfessionalSkeleton,
  ReviewsListSkeleton,
  ProfileSkeleton,
};
