import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { FindProfessionalSkeleton } from '../../components/LoadingSkeleton';

const FindProfessionalScreen = ({ navigation }) => {
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeciality, setSelectedSpeciality] = useState('all');

  const specialities = [
    'all',
    'plumbing',
    'electrical',
    'carpentry',
    'painting',
    'cleaning',
    'gardening',
    'hvac',
  ];

  const fetchWorkers = async () => {
    try {
      const response = await api.get('/workers');
      if (response.data.workers) {
        // Filter only approved workers
        const approvedWorkers = response.data.workers.filter(
          (w) => w.approval_status === 'approved' && w.is_verified
        );
        setWorkers(approvedWorkers);
        setFilteredWorkers(approvedWorkers);
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
      Alert.alert('Error', 'Failed to load professionals. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkers();
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [searchQuery, selectedSpeciality, workers]);

  const filterWorkers = () => {
    let filtered = workers;

    // Filter by speciality
    if (selectedSpeciality !== 'all') {
      filtered = filtered.filter(
        (w) => w.speciality?.toLowerCase() === selectedSpeciality.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.name?.toLowerCase().includes(query) ||
          w.speciality?.toLowerCase().includes(query) ||
          w.location?.toLowerCase().includes(query)
      );
    }

    setFilteredWorkers(filtered);
  };

  const handleBookWorker = (worker) => {
    Alert.alert(
      'Book Professional',
      `Would you like to book ${worker.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: () => {
            // TODO: Navigate to booking form with worker pre-selected
            Alert.alert('Coming Soon', 'Booking form coming soon!');
          },
        },
      ]
    );
  };

  const SpecialityChip = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.chip,
        selectedSpeciality === value && styles.chipActive,
      ]}
      onPress={() => setSelectedSpeciality(value)}
    >
      <Text
        style={[
          styles.chipText,
          selectedSpeciality === value && styles.chipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const WorkerCard = ({ worker }) => (
    <View style={styles.workerCard}>
      {/* Worker Avatar */}
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {worker.name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>

      {/* Worker Info */}
      <View style={styles.workerInfo}>
        <View style={styles.workerHeader}>
          <Text style={styles.workerName}>{worker.name}</Text>
          {worker.is_verified && (
            <Text style={styles.verifiedBadge}>✓ Verified</Text>
          )}
        </View>

        <Text style={styles.workerSpeciality}>{worker.speciality}</Text>

        {worker.location && (
          <Text style={styles.workerLocation}>📍 {worker.location}</Text>
        )}

        {worker.phone && (
          <Text style={styles.workerPhone}>📱 {worker.phone}</Text>
        )}

        {/* Rating (if available) */}
        {worker.rating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>⭐ {worker.rating}</Text>
            {worker.review_count && (
              <Text style={styles.reviewCount}>
                ({worker.review_count} reviews)
              </Text>
            )}
          </View>
        )}

        {/* Book Button */}
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => handleBookWorker(worker)}
        >
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <FindProfessionalSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Professional</Text>
        <Text style={styles.headerSubtitle}>
          {filteredWorkers.length} professional
          {filteredWorkers.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, speciality, or location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Speciality Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by speciality:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipContainer}
          >
            <SpecialityChip label="All" value="all" />
            <SpecialityChip label="Plumbing" value="plumbing" />
            <SpecialityChip label="Electrical" value="electrical" />
            <SpecialityChip label="Carpentry" value="carpentry" />
            <SpecialityChip label="Painting" value="painting" />
            <SpecialityChip label="Cleaning" value="cleaning" />
            <SpecialityChip label="Gardening" value="gardening" />
            <SpecialityChip label="HVAC" value="hvac" />
          </ScrollView>
        </View>

        {/* Workers List */}
        <View style={styles.workersSection}>
          {filteredWorkers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔧</Text>
              <Text style={styles.emptyText}>No professionals found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search or filters
              </Text>
            </View>
          ) : (
            filteredWorkers.map((worker) => (
              <WorkerCard key={worker.id} worker={worker} />
            ))
          )}
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    padding: 12,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
  },
  clearIcon: {
    fontSize: 20,
    color: COLORS.textLight,
    padding: 4,
  },
  filterSection: {
    paddingHorizontal: SIZES.padding,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: COLORS.white,
  },
  workersSection: {
    padding: SIZES.padding,
  },
  workerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    ...SHADOWS.small,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    ...FONTS.bold,
    color: COLORS.white,
  },
  workerInfo: {
    flex: 1,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  workerName: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  verifiedBadge: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.success,
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  workerSpeciality: {
    fontSize: SIZES.md,
    ...FONTS.medium,
    color: COLORS.primary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  workerLocation: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  workerPhone: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginRight: 4,
  },
  reviewCount: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.bold,
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
});

export default FindProfessionalScreen;
