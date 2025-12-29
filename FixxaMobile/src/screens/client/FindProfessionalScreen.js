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
  Share,
  Platform,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
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
  const [specialties, setSpecialties] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);

  // Sort state
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'reviews', 'recent', 'distance'

  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Advanced filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    minRating: 0,
    priceRange: 'all', // 'budget', 'standard', 'premium', 'all'
    verified: false,
    province: '',
    suburb: '',
    available: false, // Currently accepting bookings
  });

  // Province and Suburb state
  const [provinces] = useState([
    'Gauteng',
    'Western Cape',
    'Free State',
    'KwaZulu-Natal',
    'Eastern Cape',
    'Northern Cape',
    'Mpumalanga',
    'Limpopo',
    'North West',
  ]);
  const [suburbs, setSuburbs] = useState([]);
  const [loadingSuburbs, setLoadingSuburbs] = useState(false);

  const fetchSpecialties = async () => {
    try {
      const response = await api.get('/api/specialties');

      if (response.data.success && response.data.specialties) {
        // Filter active specialties and sort by display order
        const activeSpecialties = response.data.specialties
          .filter(s => s.is_active)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        // Add "All" option at the beginning
        const specialtiesWithAll = [
          { name: 'All', icon: '🔧', value: 'all' },
          ...activeSpecialties.map(s => ({
            name: s.name,
            icon: s.icon || '',
            value: s.name.toLowerCase()
          }))
        ];

        setSpecialties(specialtiesWithAll);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
      // Fallback to hardcoded specialties if fetch fails
      setSpecialties([
        { name: 'All', icon: '🔧', value: 'all' },
        { name: 'Plumbing', icon: '🔧', value: 'plumbing' },
        { name: 'Electrical', icon: '⚡', value: 'electrical' },
        { name: 'Carpentry', icon: '🪚', value: 'carpentry' },
        { name: 'Painting', icon: '🎨', value: 'painting' },
        { name: 'Cleaning', icon: '🧹', value: 'cleaning' },
        { name: 'Gardening', icon: '🌱', value: 'gardening' },
        { name: 'HVAC', icon: '❄️', value: 'hvac' },
      ]);
    } finally {
      setLoadingSpecialties(false);
    }
  };

  const fetchSuburbs = async (province) => {
    if (!province) {
      setSuburbs([]);
      return;
    }

    setLoadingSuburbs(true);
    try {
      const params = new URLSearchParams();
      params.append('province', province);

      const response = await api.get(`/suburbs?${params.toString()}`);

      if (response.data.success && response.data.suburbs) {
        setSuburbs(response.data.suburbs);
      } else {
        setSuburbs([]);
      }
    } catch (error) {
      console.error('Error fetching suburbs:', error);
      setSuburbs([]);
    } finally {
      setLoadingSuburbs(false);
    }
  };

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        setShowLocationBanner(false);
      } else if (status === 'undetermined') {
        setShowLocationBanner(true);
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);

      if (status === 'granted') {
        await getUserLocation();
        setShowLocationBanner(false);
      } else if (status === 'denied') {
        Alert.alert(
          'Location Permission Denied',
          'Please enable location services in your device settings to find professionals near you.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        setShowLocationBanner(false);
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    } finally {
      setLoadingLocation(false);
    }
  };

  const getUserLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Add workers with distance when location is available
      if (workers.length > 0) {
        filterWorkers();
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location');
    } finally {
      setLoadingLocation(false);
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance; // Returns distance in kilometers
  };

  const fetchWorkers = async () => {
    try {
      const response = await api.get('/workers');

      // Backend returns array directly, not { workers: [...] }
      const workersData = Array.isArray(response.data) ? response.data : (response.data.workers || []);

      // Filter only approved workers
      const approvedWorkers = workersData.filter(
        (w) => w.approval_status === 'approved' && w.is_verified
      );

      // Add distance to each worker if user location is available
      const workersWithDistance = approvedWorkers.map(worker => {
        if (userLocation && worker.latitude && worker.longitude) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(worker.latitude),
            parseFloat(worker.longitude)
          );
          return { ...worker, distance };
        }
        return worker;
      });

      console.log('Fetched workers:', workersData.length);
      console.log('Approved & verified:', approvedWorkers.length);

      setWorkers(workersWithDistance);
      setFilteredWorkers(workersWithDistance);
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
    fetchSpecialties();
  };

  useEffect(() => {
    fetchSpecialties();
    fetchWorkers();
  }, []);

  useEffect(() => {
    filterWorkers();
  }, [searchQuery, selectedSpeciality, filters, workers, sortBy]);

  // Recalculate distances when location changes
  useEffect(() => {
    if (userLocation && workers.length > 0) {
      const workersWithDistance = workers.map(worker => {
        if (worker.latitude && worker.longitude) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            parseFloat(worker.latitude),
            parseFloat(worker.longitude)
          );
          return { ...worker, distance };
        }
        return worker;
      });
      setWorkers(workersWithDistance);
    }
  }, [userLocation]);

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

    // Filter by suburb (priority over province and location)
    if (filters.suburb) {
      filtered = filtered.filter(
        (w) => w.primary_suburb?.toLowerCase() === filters.suburb.toLowerCase()
      );
    } else if (filters.province) {
      // Filter by province if no suburb selected
      filtered = filtered.filter(
        (w) => w.province?.toLowerCase() === filters.province.toLowerCase()
      );
    } else if (filters.location) {
      // Fallback to location text filter
      const location = filters.location.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.location?.toLowerCase().includes(location) ||
          w.primary_suburb?.toLowerCase().includes(location) ||
          w.province?.toLowerCase().includes(location)
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

    // Filter by availability (currently accepting bookings)
    if (filters.available) {
      filtered = filtered.filter((w) => w.is_available === true);
    }

    // Filter by price range (if available in worker data)
    if (filters.priceRange !== 'all' && filters.priceRange) {
      filtered = filtered.filter((w) => {
        if (!w.price_range) return true; // Include if no price range data
        return w.price_range.toLowerCase() === filters.priceRange.toLowerCase();
      });
    }

    // Apply sorting
    filtered = sortWorkers(filtered);

    setFilteredWorkers(filtered);
  };

  const sortWorkers = (workers) => {
    const sorted = [...workers];

    switch (sortBy) {
      case 'rating':
        // Highest rated first
        return sorted.sort((a, b) => {
          const ratingA = parseFloat(a.avg_rating || a.rating || 0);
          const ratingB = parseFloat(b.avg_rating || b.rating || 0);
          return ratingB - ratingA;
        });

      case 'reviews':
        // Most reviews first
        return sorted.sort((a, b) => {
          const reviewsA = parseInt(a.review_count || 0);
          const reviewsB = parseInt(b.review_count || 0);
          return reviewsB - reviewsA;
        });

      case 'recent':
        // Recently joined first
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || a.registeredAt || 0);
          const dateB = new Date(b.created_at || b.registeredAt || 0);
          return dateB - dateA;
        });

      case 'distance':
        // Nearest first (only if location is available)
        return sorted.sort((a, b) => {
          const distanceA = a.distance !== undefined ? a.distance : Infinity;
          const distanceB = b.distance !== undefined ? b.distance : Infinity;
          return distanceA - distanceB;
        });

      default:
        return sorted;
    }
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      minRating: 0,
      priceRange: 'all',
      verified: false,
      province: '',
      suburb: '',
      available: false,
    });
    setSearchQuery('');
    setSelectedSpeciality('all');
    setSuburbs([]);
  };

  const handleProvinceChange = (province) => {
    setFilters({ ...filters, province, suburb: '' });
    if (province) {
      fetchSuburbs(province);
    } else {
      setSuburbs([]);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.location) count++;
    if (filters.province) count++;
    if (filters.suburb) count++;
    if (filters.minRating > 0) count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.verified) count++;
    if (filters.available) count++;
    return count;
  };

  const getResultsTitle = () => {
    const count = filteredWorkers.length;
    const plural = count !== 1 ? 's' : '';

    // Build location context
    let locationContext = '';

    if (filters.suburb) {
      locationContext = ` in ${filters.suburb}`;
    } else if (filters.province) {
      locationContext = ` in ${filters.province}`;
    } else if (filters.location) {
      locationContext = ` in ${filters.location}`;
    }

    // Add specialty context if filtered
    let specialtyContext = '';
    if (selectedSpeciality !== 'all') {
      const specialty = specialties.find(s => s.value === selectedSpeciality);
      if (specialty) {
        specialtyContext = ` ${specialty.name}`;
      }
    }

    // Build final title
    if (!locationContext && selectedSpeciality === 'all' && !searchQuery) {
      return 'All Professionals';
    }

    return `Found ${count}${specialtyContext} Professional${plural}${locationContext}`;
  };

  const handleViewWorker = (worker) => {
    navigation.navigate('WorkerDetails', { worker });
  };

  const handleRequestQuote = (worker) => {
    navigation.navigate('WorkerDetails', { worker });
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
            {/* Province Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Province</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.provinceScroll}
              >
                <TouchableOpacity
                  style={[
                    styles.provinceButton,
                    !filters.province && styles.provinceButtonActive,
                  ]}
                  onPress={() => handleProvinceChange('')}
                >
                  <Text
                    style={[
                      styles.provinceButtonText,
                      !filters.province && styles.provinceButtonTextActive,
                    ]}
                  >
                    All Provinces
                  </Text>
                </TouchableOpacity>
                {provinces.map((province) => (
                  <TouchableOpacity
                    key={province}
                    style={[
                      styles.provinceButton,
                      filters.province === province && styles.provinceButtonActive,
                    ]}
                    onPress={() => handleProvinceChange(province)}
                  >
                    <Text
                      style={[
                        styles.provinceButtonText,
                        filters.province === province && styles.provinceButtonTextActive,
                      ]}
                    >
                      {province}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Suburb Filter */}
            {filters.province && (
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupLabel}>
                  Suburb {loadingSuburbs ? '(Loading...)' : `(${suburbs.length})`}
                </Text>
                {loadingSuburbs ? (
                  <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
                ) : suburbs.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.suburbScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.suburbButton,
                        !filters.suburb && styles.suburbButtonActive,
                      ]}
                      onPress={() => setFilters({ ...filters, suburb: '' })}
                    >
                      <Text
                        style={[
                          styles.suburbButtonText,
                          !filters.suburb && styles.suburbButtonTextActive,
                        ]}
                      >
                        All Suburbs
                      </Text>
                    </TouchableOpacity>
                    {suburbs.map((suburb) => (
                      <TouchableOpacity
                        key={suburb.name}
                        style={[
                          styles.suburbButton,
                          filters.suburb === suburb.name && styles.suburbButtonActive,
                        ]}
                        onPress={() => setFilters({ ...filters, suburb: suburb.name })}
                      >
                        <Text
                          style={[
                            styles.suburbButtonText,
                            filters.suburb === suburb.name && styles.suburbButtonTextActive,
                          ]}
                        >
                          {suburb.name} ({suburb.worker_count || 0})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noSuburbsText}>No suburbs available for this province</Text>
                )}
              </View>
            )}

            {/* Location Filter (fallback text search) */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>Location (Text Search)</Text>
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

            {/* Currently Accepting Bookings Filter */}
            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFilters({ ...filters, available: !filters.available })}
              >
                <View style={[styles.checkbox, filters.available && styles.checkboxActive]}>
                  {filters.available && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Currently accepting new bookings</Text>
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

  // Share worker profile
  const handleShareWorker = async (worker, event) => {
    if (event) {
      event.stopPropagation();
    }

    const message = `Check out ${worker.name} on Fixxa!\n${worker.speciality}\nRating: ${parseFloat(worker.rating || 0).toFixed(1)} ⭐\n\nBook them now on Fixxa!`;

    try {
      const result = await Share.share({
        message,
        title: `${worker.name} - Fixxa Professional`,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type of result.activityType
        } else {
          // Shared
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to share worker profile');
      console.error('Error sharing:', error);
    }
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
    <TouchableOpacity
      style={[
        styles.workerCard,
        worker.is_pending && styles.workerCardPending,
      ]}
      onPress={() => handleViewWorker(worker)}
      activeOpacity={0.7}
    >
      {/* Coming Soon Banner for Pending Workers */}
      {worker.is_pending && (
        <View style={styles.comingSoonBanner}>
          <Text style={styles.comingSoonText}>COMING SOON</Text>
        </View>
      )}

      {/* Distance Badge */}
      {worker.distance !== undefined && userLocation && (
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceBadgeText}>
            {worker.distance < 1
              ? `${(worker.distance * 1000).toFixed(0)}m away`
              : `${worker.distance.toFixed(1)}km away`
            }
          </Text>
        </View>
      )}

      {/* Worker Avatar */}
      <View style={styles.avatarContainer}>
        {worker.profile_picture || worker.image ? (
          <Image
            source={{ uri: worker.profile_picture || worker.image }}
            style={[
              styles.avatarImage,
              worker.is_pending && styles.avatarImagePending,
            ]}
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

        {/* Location and Hourly Rate Row */}
        <View style={styles.locationRateRow}>
          {(worker.primary_suburb || worker.area || worker.location) && (
            <Text style={styles.workerLocation} numberOfLines={1}>
              📍 {worker.area || worker.primary_suburb || worker.location}
            </Text>
          )}

          {worker.hourly_rate && (
            <Text style={styles.hourlyRate}>
              R{parseFloat(worker.hourly_rate).toFixed(0)}/hr
            </Text>
          )}
        </View>

        {/* Rating Display */}
        <View style={styles.ratingRow}>
          <Text style={styles.ratingStars}>⭐</Text>
          <Text style={styles.ratingText}>
            {parseFloat(worker.rating || 0).toFixed(1)}
          </Text>
          {worker.review_count > 0 && (
            <Text style={styles.reviewCount}>
              ({worker.review_count})
            </Text>
          )}
        </View>

        {/* Status Badges */}
        {!worker.is_available && !worker.is_pending && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableBadgeText}>Currently Unavailable</Text>
          </View>
        )}

        {/* Action Buttons Row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => handleViewWorker(worker)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.requestQuoteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleRequestQuote(worker);
            }}
            disabled={worker.is_pending}
          >
            <Text style={styles.requestQuoteButtonText}>Request Quote</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={(e) => handleShareWorker(worker, e)}
          >
            <Text style={styles.shareButtonIcon}>📤</Text>
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
            {getResultsTitle()}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Location Banner */}
      {showLocationBanner && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationBannerText}>
            Enable location to find professionals near you
          </Text>
          <TouchableOpacity
            style={styles.enableLocationButton}
            onPress={requestLocationPermission}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.enableLocationButtonText}>Enable Location</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

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
          {loadingSpecialties ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipContainer}
            >
              {specialties.map((specialty) => (
                <SpecialityChip
                  key={specialty.value}
                  label={`${specialty.icon} ${specialty.name}`.trim()}
                  value={specialty.value}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Sort Controls */}
        <View style={styles.sortSection}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'rating' && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy('rating')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'rating' && styles.sortButtonTextActive,
                ]}
              >
                Highest Rated
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'reviews' && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy('reviews')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'reviews' && styles.sortButtonTextActive,
                ]}
              >
                Most Reviews
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'recent' && styles.sortButtonActive,
              ]}
              onPress={() => setSortBy('recent')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === 'recent' && styles.sortButtonTextActive,
                ]}
              >
                Recently Joined
              </Text>
            </TouchableOpacity>

            {userLocation && (
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  sortBy === 'distance' && styles.sortButtonActive,
                ]}
                onPress={() => setSortBy('distance')}
              >
                <Text
                  style={[
                    styles.sortButtonText,
                    sortBy === 'distance' && styles.sortButtonTextActive,
                  ]}
                >
                  Nearest
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
  locationRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  workerLocation: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    flex: 1,
    marginRight: 8,
  },
  hourlyRate: {
    fontSize: SIZES.xs,
    color: COLORS.primary,
    ...FONTS.semiBold,
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
  reviewCount: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  unavailableBadge: {
    backgroundColor: '#fef3cd',
    borderColor: '#ffc107',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  unavailableBadgeText: {
    color: '#856404',
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
  },
  comingSoonBanner: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 10,
    transform: [{ rotate: '15deg' }],
    ...SHADOWS.medium,
  },
  comingSoonText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    ...FONTS.bold,
    letterSpacing: 1,
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.info,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
    ...SHADOWS.small,
  },
  distanceBadgeText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
  },
  workerCardPending: {
    opacity: 0.7,
  },
  avatarImagePending: {
    opacity: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    width: 40,
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  shareButtonIcon: {
    fontSize: 18,
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
  requestQuoteButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestQuoteButtonText: {
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
  // Province and Suburb Styles
  provinceScroll: {
    flexDirection: 'row',
  },
  provinceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: 8,
  },
  provinceButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  provinceButtonText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  provinceButtonTextActive: {
    color: COLORS.white,
  },
  suburbScroll: {
    flexDirection: 'row',
  },
  suburbButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: 8,
  },
  suburbButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  suburbButtonText: {
    fontSize: SIZES.xs,
    ...FONTS.medium,
    color: COLORS.textSecondary,
  },
  suburbButtonTextActive: {
    color: COLORS.white,
  },
  noSuburbsText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginVertical: 12,
  },
  // Sort Styles
  sortSection: {
    paddingHorizontal: SIZES.padding,
    marginBottom: 16,
  },
  sortLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
  },
  sortButtonTextActive: {
    color: COLORS.white,
  },
  // Location Banner Styles
  locationBanner: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationBannerText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.white,
    ...FONTS.medium,
    marginRight: 12,
  },
  enableLocationButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  enableLocationButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
});

export default FindProfessionalScreen;
