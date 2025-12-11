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
  Modal,
  Image,
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

  // Advanced filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    minRating: 0,
    priceRange: 'all', // 'budget', 'standard', 'premium', 'all'
    verified: false,
  });

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

      // Backend returns array directly, not { workers: [...] }
      const workersData = Array.isArray(response.data) ? response.data : (response.data.workers || []);

      // Filter only approved workers
      const approvedWorkers = workersData.filter(
        (w) => w.approval_status === 'approved' && w.is_verified
      );

      console.log('Fetched workers:', workersData.length);
      console.log('Approved & verified:', approvedWorkers.length);

      setWorkers(approvedWorkers);
      setFilteredWorkers(approvedWorkers);
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
  }, [searchQuery, selectedSpeciality, filters, workers]);

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

    // Filter by location
    if (filters.location) {
      const location = filters.location.toLowerCase();
      filtered = filtered.filter(
        (w) => w.location?.toLowerCase().includes(location)
      );
    }

    // Filter by rating
    if (filters.minRating > 0) {
      filtered = filtered.filter(
        (w) => (w.rating || 0) >= filters.minRating
      );
    }

    // Filter by verified status
    if (filters.verified) {
      filtered = filtered.filter((w) => w.is_verified === true);
    }

    // Filter by price range (if available in worker data)
    if (filters.priceRange !== 'all' && filters.priceRange) {
      filtered = filtered.filter((w) => {
        if (!w.price_range) return true; // Include if no price range data
        return w.price_range.toLowerCase() === filters.priceRange.toLowerCase();
      });
    }

    setFilteredWorkers(filtered);
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      minRating: 0,
      priceRange: 'all',
      verified: false,
    });
    setSearchQuery('');
    setSelectedSpeciality('all');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.location) count++;
    if (filters.minRating > 0) count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.verified) count++;
    return count;
  };

  const handleViewWorker = (worker) => {
    navigation.navigate('WorkerDetails', { worker });
  };

  const handleBookWorker = (worker) => {
    navigation.navigate('CreateBooking', { worker });
  };

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Advanced Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Location Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Location</Text>
              <TextInput
                style={styles.filterInput}
                value={filters.location}
                onChangeText={(text) => setFilters({ ...filters, location: text })}
                placeholder="Enter city or area..."
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            {/* Rating Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Minimum Rating</Text>
              <View style={styles.ratingButtons}>
                {[0, 3, 4, 4.5, 5].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      filters.minRating === rating && styles.ratingButtonActive,
                    ]}
                    onPress={() => setFilters({ ...filters, minRating: rating })}
                  >
                    <Text
                      style={[
                        styles.ratingButtonText,
                        filters.minRating === rating && styles.ratingButtonTextActive,
                      ]}
                    >
                      {rating === 0 ? 'Any' : `${rating}⭐+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Price Range</Text>
              <View style={styles.priceRangeButtons}>
                {[
                  { label: 'All', value: 'all' },
                  { label: 'Budget', value: 'budget' },
                  { label: 'Standard', value: 'standard' },
                  { label: 'Premium', value: 'premium' },
                ].map((range) => (
                  <TouchableOpacity
                    key={range.value}
                    style={[
                      styles.priceRangeButton,
                      filters.priceRange === range.value && styles.priceRangeButtonActive,
                    ]}
                    onPress={() => setFilters({ ...filters, priceRange: range.value })}
                  >
                    <Text
                      style={[
                        styles.priceRangeButtonText,
                        filters.priceRange === range.value && styles.priceRangeButtonTextActive,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Verified Only Filter */}
            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFilters({ ...filters, verified: !filters.verified })}
              >
                <View style={[styles.checkbox, filters.verified && styles.checkboxActive]}>
                  {filters.verified && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Show verified professionals only</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                clearFilters();
                setShowFilterModal(false);
              }}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
    <TouchableOpacity
      style={styles.workerCard}
      onPress={() => handleViewWorker(worker)}
      activeOpacity={0.7}
    >
      {/* Worker Avatar */}
      <View style={styles.avatarContainer}>
        {worker.profile_picture || worker.image ? (
          <Image
            source={{ uri: worker.profile_picture || worker.image }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={styles.avatarText}>
            {worker.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        )}
      </View>

      {/* Worker Info */}
      <View style={styles.workerInfo}>
        <View style={styles.workerHeader}>
          <Text style={styles.workerName} numberOfLines={1}>{worker.name}</Text>
          {worker.is_verified && (
            <View style={styles.verifiedBadgeSmall}>
              <Text style={styles.verifiedBadgeText}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.workerSpeciality} numberOfLines={2}>
          {worker.speciality}
        </Text>

        {(worker.primary_suburb || worker.location) && (
          <Text style={styles.workerLocation} numberOfLines={1}>
            📍 {worker.primary_suburb || worker.location}
          </Text>
        )}

        {/* Rating Display */}
        <View style={styles.ratingRow}>
          <Text style={styles.ratingStars}>⭐</Text>
          <Text style={styles.ratingText}>
            {parseFloat(worker.rating || 0).toFixed(1)}
          </Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => handleViewWorker(worker)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bookButton}
            onPress={(e) => {
              e.stopPropagation();
              handleBookWorker(worker);
            }}
          >
            <Text style={styles.bookButtonText}>Book</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <FindProfessionalSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Filter Modal */}
      <FilterModal />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Find a Professional</Text>
          <Text style={styles.headerSubtitle}>
            {filteredWorkers.length} professional
            {filteredWorkers.length !== 1 ? 's' : ''} available
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Search Bar & Filter Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, speciality..."
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

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={styles.filterButtonIcon}>⚙️</Text>
            {getActiveFilterCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
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
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SIZES.padding,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  workerName: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  verifiedBadgeSmall: {
    backgroundColor: COLORS.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  workerSpeciality: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  workerLocation: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingStars: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  viewDetailsText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  bookButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
    position: 'relative',
  },
  filterButtonIcon: {
    fontSize: 24,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    ...FONTS.bold,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: 28,
    color: COLORS.textSecondary,
    padding: 4,
  },
  modalBody: {
    padding: SIZES.padding,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterGroupLabel: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.md,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ratingButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  ratingButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  ratingButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  ratingButtonTextActive: {
    color: COLORS.white,
  },
  priceRangeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceRangeButton: {
    flex: 1,
    minWidth: '45%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
  },
  priceRangeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  priceRangeButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  priceRangeButtonTextActive: {
    color: COLORS.white,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxCheck: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.bold,
  },
  checkboxLabel: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.white,
  },
});

export default FindProfessionalScreen;
