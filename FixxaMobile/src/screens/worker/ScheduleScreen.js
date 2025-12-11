import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatCurrency } from '../../utils/formatting';
import BurgerMenu from '../../components/BurgerMenu';

const ScheduleScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('upcoming'); // upcoming, today, this_week, all

  useEffect(() => {
    fetchScheduledJobs();
  }, [filter]);

  const fetchScheduledJobs = async () => {
    try {
      const response = await api.get(`/workers/schedule?filter=${filter}`);
      if (response.data.jobs) {
        setJobs(response.data.jobs);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      Alert.alert('Error', 'Failed to load schedule');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchScheduledJobs();
  };

  const getDateDisplay = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    // Check if it's tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    // Otherwise return formatted date
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'accepted':
        return COLORS.success;
      case 'in-progress':
      case 'in progress':
        return COLORS.info;
      case 'pending':
        return COLORS.warning;
      case 'completed':
        return '#4CAF50';
      default:
        return COLORS.gray;
    }
  };

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
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

  const JobCard = ({ job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
      activeOpacity={0.7}
    >
      {/* Date Badge */}
      <View style={styles.dateBadge}>
        <Text style={styles.dateDay}>
          {new Date(job.scheduled_date || job.created_at).getDate()}
        </Text>
        <Text style={styles.dateMonth}>
          {new Date(job.scheduled_date || job.created_at).toLocaleDateString(
            'en-US',
            { month: 'short' }
          )}
        </Text>
      </View>

      {/* Job Details */}
      <View style={styles.jobDetails}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobService} numberOfLines={1}>
            {job.service_type}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(job.status) },
            ]}
          >
            <Text style={styles.statusText}>{job.status}</Text>
          </View>
        </View>

        <Text style={styles.jobClient}>
          👤 {job.client_name || 'Client'}
        </Text>

        <Text style={styles.jobTime}>
          🕐 {getTimeDisplay(job.scheduled_date || job.created_at)}
        </Text>

        {job.location && (
          <Text style={styles.jobLocation} numberOfLines={1}>
            📍 {job.location}
          </Text>
        )}

        {job.price && (
          <Text style={styles.jobPrice}>{formatCurrency(job.price)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📅</Text>
      <Text style={styles.emptyText}>No scheduled jobs</Text>
      <Text style={styles.emptySubtext}>
        {filter === 'today'
          ? 'You have no jobs scheduled for today'
          : filter === 'this_week'
          ? 'You have no jobs scheduled this week'
          : 'Accepted jobs will appear here'}
      </Text>
    </View>
  );

  const groupJobsByDate = (jobs) => {
    const grouped = {};
    jobs.forEach((job) => {
      const date = new Date(job.scheduled_date || job.created_at);
      const dateKey = date.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(job);
    });
    return grouped;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const groupedJobs = groupJobsByDate(jobs);
  const dateKeys = Object.keys(groupedJobs).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>My Schedule</Text>
          <Text style={styles.headerSubtitle}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} scheduled
          </Text>
        </View>
        <BurgerMenu navigation={navigation} />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton label="Upcoming" value="upcoming" />
          <FilterButton label="Today" value="today" />
          <FilterButton label="This Week" value="this_week" />
          <FilterButton label="All Jobs" value="all" />
        </ScrollView>
      </View>

      {/* Jobs List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {dateKeys.length === 0 ? (
          renderEmptyState()
        ) : (
          dateKeys.map((dateKey) => (
            <View key={dateKey} style={styles.dateSection}>
              <Text style={styles.dateSectionHeader}>
                {getDateDisplay(dateKey)}
              </Text>
              {groupedJobs[dateKey].map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </View>
          ))
        )}
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
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: 8,
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
  content: {
    flex: 1,
    padding: SIZES.padding,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateSectionHeader: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 12,
    flexDirection: 'row',
    ...SHADOWS.medium,
  },
  dateBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateDay: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  dateMonth: {
    fontSize: SIZES.xs,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  jobDetails: {
    flex: 1,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  jobService: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  jobClient: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  jobTime: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  jobLocation: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  jobPrice: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.primary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
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

export default ScheduleScreen;
