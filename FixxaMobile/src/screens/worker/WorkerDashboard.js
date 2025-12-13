import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatCurrency } from '../../utils/formatting';
import BurgerMenu from '../../components/BurgerMenu';

const WorkerDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalEarnings: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchAvailabilityStatus();
    fetchUnreadCount();
    fetchQuoteRequests();

    // Refresh unread count when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUnreadCount();
      fetchQuoteRequests();
    });

    return unsubscribe;
  }, [navigation]);

  // Check if should show welcome video on first visit
  useEffect(() => {
    const checkFirstVisit = async () => {
      try {
        const hasSeenWelcomeVideo = await AsyncStorage.getItem('hasSeenWelcomeVideo');
        if (!hasSeenWelcomeVideo && user) {
          // Small delay to let dashboard load first
          setTimeout(() => {
            setShowWelcomeVideo(true);
          }, 1000);
        }
      } catch (error) {
        console.error('Error checking welcome video status:', error);
      }
    };

    checkFirstVisit();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, jobsResponse] = await Promise.all([
        api.get('/workers/stats'),
        api.get('/workers/jobs?limit=5'),
      ]);

      if (statsResponse.data.stats) {
        setStats(statsResponse.data.stats);
      }

      if (jobsResponse.data.jobs) {
        setRecentJobs(jobsResponse.data.jobs);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAvailabilityStatus = async () => {
    try {
      const response = await api.get('/workers/profile');
      if (response.data.worker) {
        setIsAvailable(response.data.worker.is_available || false);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = !isAvailable;

    setUpdatingAvailability(true);
    try {
      const response = await api.put('/workers/availability', {
        is_available: newStatus,
      });

      if (response.data.success) {
        setIsAvailable(newStatus);
        Alert.alert(
          'Success',
          `You are now ${newStatus ? 'available' : 'unavailable'} for new jobs`
        );
      } else {
        Alert.alert('Error', 'Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/messages/worker/unread-count');
      if (response.data.unreadCount !== undefined) {
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchQuoteRequests = async () => {
    try {
      console.log('Fetching quote requests...');
      const response = await api.get('/quotes/requests');
      console.log('Quote requests response:', response.data);

      if (response.data.success && response.data.requests) {
        console.log('Total requests:', response.data.requests.length);
        // Only show pending requests
        const pending = response.data.requests.filter(req => req.status === 'pending');
        console.log('Pending requests:', pending.length);
        setQuoteRequests(pending);
      } else {
        console.log('No success or no requests in response');
      }
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchUnreadCount();
    fetchQuoteRequests();
  };

  const handleCloseWelcomeVideo = async () => {
    try {
      await AsyncStorage.setItem('hasSeenWelcomeVideo', 'true');
      setShowWelcomeVideo(false);
    } catch (error) {
      console.error('Error saving welcome video status:', error);
      setShowWelcomeVideo(false);
    }
  };

  const handleWatchVideo = () => {
    Linking.openURL('https://www.youtube.com/watch?v=eloSnb-dKRE');
  };

  const StatCard = ({ icon, label, value, color, onPress }) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickActionButton = ({ icon, label, onPress, color, badge }) => (
    <TouchableOpacity
      style={[styles.actionButton, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View>
        <Text style={styles.actionIcon}>{icon}</Text>
        {badge > 0 && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const QuoteRequestCard = ({ request }) => {
    const timeAgo = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);

      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    };

    const handleSendMessage = () => {
      // Navigate to messages with this client
      navigation.navigate('Messages', {
        recipientId: request.client_id,
        recipientName: request.client_name
      });
    };

    const handleCreateQuote = () => {
      navigation.navigate('CreateQuote', {
        requestId: request.id,
        clientName: request.client_name
      });
    };

    return (
      <View style={styles.quoteRequestCard}>
        <View style={styles.quoteRequestHeader}>
          <View style={styles.quoteRequestClient}>
            <Text style={styles.quoteRequestClientIcon}>👤</Text>
            <View>
              <Text style={styles.quoteRequestClientName}>{request.client_name}</Text>
              <Text style={styles.quoteRequestTime}>{timeAgo(request.created_at)}</Text>
            </View>
          </View>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        </View>

        <Text style={styles.quoteRequestDescription}>
          {request.description}
        </Text>

        {request.notes && (
          <Text style={styles.quoteRequestNotes}>
            📝 Additional details: {request.notes}
          </Text>
        )}

        {/* Action buttons */}
        <View style={styles.quoteRequestActions}>
          <TouchableOpacity
            style={styles.quoteRequestMessageButton}
            onPress={handleSendMessage}
          >
            <Text style={styles.quoteRequestMessageIcon}>💬</Text>
            <Text style={styles.quoteRequestMessageText}>Send Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quoteRequestQuoteButton}
            onPress={handleCreateQuote}
          >
            <Text style={styles.quoteRequestQuoteIcon}>💰</Text>
            <Text style={styles.quoteRequestQuoteText}>Create Quote</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const JobCard = ({ job }) => {
    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'completed':
          return COLORS.success;
        case 'in-progress':
        case 'in progress':
          return COLORS.info;
        case 'pending':
          return COLORS.warning;
        default:
          return COLORS.gray;
      }
    };

    return (
      <TouchableOpacity
        style={styles.jobCard}
        onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
      >
        <View style={styles.jobHeader}>
          <Text style={styles.jobService}>{job.service_type}</Text>
          <View
            style={[
              styles.jobStatusBadge,
              { backgroundColor: getStatusColor(job.status) },
            ]}
          >
            <Text style={styles.jobStatusText}>{job.status}</Text>
          </View>
        </View>
        <Text style={styles.jobClient}>Client: {job.client_name}</Text>
        {job.price && (
          <Text style={styles.jobPrice}>{formatCurrency(job.price)}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'Professional'}</Text>
          </View>
          <BurgerMenu navigation={navigation} />
        </View>
        <Text style={styles.headerSubtitle}>Worker Dashboard</Text>

        {/* Availability Toggle */}
        <View style={styles.availabilityContainer}>
          <View style={styles.availabilityInfo}>
            <Text style={styles.availabilityLabel}>Availability Status</Text>
            <Text style={styles.availabilityStatus}>
              {isAvailable ? '🟢 Available for Jobs' : '🔴 Unavailable'}
            </Text>
          </View>
          {updatingAvailability ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={toggleAvailability}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={isAvailable ? COLORS.white : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
            />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsSection}>
          <StatCard
            icon="📋"
            label="Pending Requests"
            value={stats.pendingJobs}
            color={COLORS.warning}
            onPress={() => navigation.navigate('JobRequests')}
          />
          <StatCard
            icon="⚡"
            label="Active Jobs"
            value={stats.activeJobs}
            color={COLORS.info}
            onPress={() => navigation.navigate('MyJobs')}
          />
          <StatCard
            icon="✅"
            label="Completed"
            value={stats.completedJobs}
            color={COLORS.success}
            onPress={() => navigation.navigate('MyJobs')}
          />
          <StatCard
            icon="💰"
            label="Total Earnings"
            value={formatCurrency(stats.totalEarnings)}
            color={COLORS.primary}
            onPress={() => navigation.navigate('Earnings')}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <QuickActionButton
              icon="📋"
              label="Job Requests"
              color={COLORS.primary}
              onPress={() => navigation.navigate('JobRequests')}
            />
            <QuickActionButton
              icon="📅"
              label="My Schedule"
              color={COLORS.info}
              onPress={() => navigation.navigate('Schedule')}
            />
            <QuickActionButton
              icon="📸"
              label="Portfolio"
              color="#9C27B0"
              onPress={() => navigation.navigate('Portfolio')}
            />
            <QuickActionButton
              icon="💬"
              label="Messages"
              color={COLORS.success}
              badge={unreadCount}
              onPress={() => navigation.navigate('Messages')}
            />
            <QuickActionButton
              icon="⭐"
              label="My Reviews"
              color={COLORS.warning}
              onPress={() => navigation.navigate('Reviews')}
            />
          </View>
        </View>

        {/* Quote Requests */}
        {quoteRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                💰 Quote Requests
                {quoteRequests.length > 0 && (
                  <Text style={styles.requestCount}> ({quoteRequests.length})</Text>
                )}
              </Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Clients are interested in your services
            </Text>

            {quoteRequests.map((request) => (
              <QuoteRequestCard key={request.id} request={request} />
            ))}
          </View>
        )}

        {/* Recent Jobs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyJobs')}>
              <Text style={styles.seeAllText}>See All →</Text>
            </TouchableOpacity>
          </View>

          {recentJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No recent jobs</Text>
              <Text style={styles.emptySubtext}>
                Jobs you accept will appear here
              </Text>
            </View>
          ) : (
            recentJobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </View>
      </ScrollView>

      {/* Welcome Video Modal */}
      <Modal
        visible={showWelcomeVideo}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseWelcomeVideo}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎬 Welcome to Fixxa!</Text>

            <Text style={styles.modalText}>
              Before you dive in, we've prepared a helpful tutorial to get you started.
              Watch the video to learn how to:
            </Text>

            <View style={styles.featuresList}>
              <Text style={styles.featureItem}>📱 Navigate the platform</Text>
              <Text style={styles.featureItem}>💼 Manage your bookings</Text>
              <Text style={styles.featureItem}>💬 Communicate with clients</Text>
              <Text style={styles.featureItem}>📈 Grow your business</Text>
            </View>

            <Text style={styles.modalNote}>
              💡 You can always access this video from the Getting Started section.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.watchButton}
                onPress={handleWatchVideo}
              >
                <Text style={styles.watchButtonText}>▶️ Watch Tutorial</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleCloseWelcomeVideo}
              >
                <Text style={styles.skipButtonText}>Skip for Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding * 1.5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: SIZES.md,
    color: 'rgba(255,255,255,0.9)',
  },
  userName: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  availabilityInfo: {
    flex: 1,
  },
  availabilityLabel: {
    fontSize: SIZES.xs,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  availabilityStatus: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  statsSection: {
    padding: SIZES.padding,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    borderLeftWidth: 4,
    ...SHADOWS.small,
  },
  statIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    padding: SIZES.padding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  requestCount: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  sectionSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: -8,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    padding: SIZES.padding,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  actionIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  actionLabel: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobService: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  jobStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  jobStatusText: {
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
  jobPrice: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    ...FONTS.bold,
  },
  // Quote Request Card Styles
  quoteRequestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.small,
  },
  quoteRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteRequestClient: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quoteRequestClientIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  quoteRequestClientName: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  quoteRequestTime: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  newBadgeText: {
    color: COLORS.white,
    fontSize: SIZES.xs,
    ...FONTS.bold,
  },
  quoteRequestDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  quoteRequestNotes: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  quoteRequestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  quoteRequestMessageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  quoteRequestMessageIcon: {
    fontSize: 16,
  },
  quoteRequestMessageText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.primary,
  },
  quoteRequestQuoteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  quoteRequestQuoteIcon: {
    fontSize: 16,
  },
  quoteRequestQuoteText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.white,
  },
  // Welcome Video Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SIZES.padding * 2,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.padding,
  },
  modalText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.padding,
  },
  featuresList: {
    backgroundColor: COLORS.background,
    padding: SIZES.padding,
    borderRadius: 12,
    marginBottom: SIZES.padding,
  },
  featureItem: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 20,
  },
  modalNote: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SIZES.padding * 1.5,
    paddingHorizontal: SIZES.padding,
  },
  modalButtons: {
    gap: 12,
  },
  watchButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  watchButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  skipButton: {
    backgroundColor: COLORS.background,
    padding: SIZES.padding,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.md,
    ...FONTS.medium,
  },
});

export default WorkerDashboard;
