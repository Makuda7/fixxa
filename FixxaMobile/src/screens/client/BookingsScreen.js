import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency } from '../../utils/formatting';
import { BookingsListSkeleton } from '../../components/LoadingSkeleton';

const BookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, in-progress, completed

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      if (response.data.success && response.data.bookings) {
        setBookings(response.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchBookings();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return COLORS.success;
      case 'in-progress':
      case 'in progress':
        return COLORS.info;
      case 'pending':
        return COLORS.warning;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.gray;
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'all') return true;
    return booking.status?.toLowerCase().replace(' ', '-') === filter;
  });

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === value && styles.filterButtonActive]}
      onPress={() => setFilter(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderBookingItem = ({ item }) => (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingTitle}>{item.service_type}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <Text style={styles.detailText}>
          👤 Professional: {item.professional_name || item.worker_name || 'Not assigned'}
        </Text>
        <Text style={styles.detailText}>
          🔧 Service: {item.professional_service || item.service_type || 'Service'}
        </Text>
        <Text style={styles.detailText}>📅 {formatDate(item.booking_date)}</Text>
        {item.booking_amount && (
          <Text style={styles.priceText}>💰 {formatCurrency(item.booking_amount)}</Text>
        )}
        {item.note && (
          <Text style={styles.description} numberOfLines={2}>
            {item.note}
          </Text>
        )}
      </View>

      <View style={styles.bookingActions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <BookingsListSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FilterButton label="All" value="all" />
        <FilterButton label="Pending" value="pending" />
        <FilterButton label="In Progress" value="in-progress" />
        <FilterButton label="Completed" value="completed" />
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No bookings found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? 'Create your first booking to get started!'
                : `No ${filter} bookings at the moment.`}
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
    padding: SIZES.padding * 2,
    paddingTop: 60,
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
  filterContainer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
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
  listContent: {
    padding: SIZES.padding,
    paddingTop: 8,
  },
  bookingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  priceText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.primary,
    marginTop: 4,
  },
  description: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  bookingActions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 12,
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
});

export default BookingsScreen;
