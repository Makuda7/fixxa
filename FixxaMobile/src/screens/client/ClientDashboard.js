import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency } from '../../utils/formatting';
import { DashboardSkeleton } from '../../components/LoadingSkeleton';
import BurgerMenu from '../../components/BurgerMenu';
import FloatingSearchButton from '../../components/FloatingSearchButton';

const ClientDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [allBookings, setAllBookings] = useState([]); // For counters
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);

  const fetchAllData = async () => {
    try {
      // Fetch all data in parallel
      const [bookingsRes, unreadRes, messagesRes] = await Promise.allSettled([
        api.get('/bookings'),
        api.get('/api/messages/client/unread-count'),
        api.get('/api/messages')
      ]);

      // Handle bookings
      if (bookingsRes.status === 'fulfilled' && bookingsRes.value.data.success) {
        const allBookingsData = bookingsRes.value.data.bookings || [];
        setAllBookings(allBookingsData);
        setBookings(allBookingsData.slice(0, 2));
      }

      // Handle unread count
      if (unreadRes.status === 'fulfilled' && unreadRes.value.data.unreadCount !== undefined) {
        setUnreadCount(unreadRes.value.data.unreadCount);
      }

      // Handle conversations
      if (messagesRes.status === 'fulfilled' && messagesRes.value.data.messages) {
        const conversationMap = {};

        messagesRes.value.data.messages.forEach(msg => {
          const professionalId = msg.professional_id;

          if (!conversationMap[professionalId]) {
            conversationMap[professionalId] = {
              id: professionalId,
              professional_name: msg.professional_name,
              messages: []
            };
          }
          conversationMap[professionalId].messages.push(msg);
        });

        const conversationsList = Object.values(conversationMap)
          .map(conv => ({
            ...conv,
            messages: conv.messages.sort((a, b) =>
              new Date(b.datetime || b.created_at) - new Date(a.datetime || a.created_at)
            ).slice(0, 3)
          }))
          .sort((a, b) => {
            const aTime = new Date(a.messages[0].datetime || a.messages[0].created_at);
            const bTime = new Date(b.messages[0].datetime || b.messages[0].created_at);
            return bTime - aTime;
          })
          .slice(0, 2);

        setConversations(conversationsList);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Refresh all data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAllData();
    });

    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Top Bar with Burger Menu */}
      <View style={styles.topBar}>
        <View style={{ width: 40 }} />
        <Text style={styles.topBarTitle}>Fixxa</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name}! 👋</Text>
          <Text style={styles.subtitle}>Welcome back to Fixxa</Text>
        </View>

      {/* Find Professional - STAR OF THE SHOW */}
      <View style={styles.heroContainer}>
        <TouchableOpacity
          style={styles.findProButton}
          onPress={() => navigation.navigate('Find')}
          activeOpacity={0.8}
        >
          <View style={styles.findProContent}>
            <View style={styles.findProTextContainer}>
              <Text style={styles.findProTitle}>Find a Professional</Text>
              <Text style={styles.findProSubtitle}>
                Get help from verified experts near you
              </Text>
            </View>
            <View style={styles.findProIconContainer}>
              <Text style={styles.findProIcon}>🔍</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{allBookings.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {allBookings.filter((b) => b.status?.toLowerCase() === 'confirmed').length}
          </Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {allBookings.filter((b) => b.status?.toLowerCase() === 'pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Recent Bookings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>
              Start by creating your first booking!
            </Text>
          </View>
        ) : (
          bookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingTitle}>{booking.service_type}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(booking.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>
              <Text style={styles.bookingWorker}>
                Professional: {booking.professional_name || booking.worker_name || 'Not assigned'}
              </Text>
              <Text style={styles.bookingDate}>
                📅 {formatDate(booking.booking_date)}
              </Text>
              {booking.booking_amount && (
                <Text style={styles.bookingPrice}>
                  💰 {formatCurrency(booking.booking_amount)}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* Recent Inquiries */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Recent Inquiries</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyInquiries}>
            <Text style={styles.emptyText}>No inquiries yet.</Text>
            <Text style={styles.emptySubtext}>
              Browse our services and connect with professionals to get started!
            </Text>
            <TouchableOpacity
              style={styles.findServicesButton}
              onPress={() => navigation.navigate('Find')}
            >
              <Text style={styles.findServicesButtonText}>Find Services</Text>
            </TouchableOpacity>
          </View>
        ) : (
          conversations.map((conversation) => (
            <View key={conversation.id} style={styles.conversationGroup}>
              <Text style={styles.conversationHeader}>
                Conversation with {conversation.professional_name}
              </Text>

              <View style={styles.messagesContainer}>
                {conversation.messages.slice(0, 3).reverse().map((msg, index) => (
                  <View
                    key={index}
                    style={[
                      styles.inquiryCard,
                      msg.sender_type === 'client'
                        ? styles.inquiryCardClient
                        : styles.inquiryCardProfessional
                    ]}
                  >
                    <Text style={styles.inquirySender}>
                      {msg.sender_type === 'client' ? 'You' : conversation.professional_name}:
                    </Text>
                    <Text style={styles.inquiryContent}>{msg.content}</Text>
                    <Text style={styles.inquiryTime}>
                      {formatDate(msg.datetime || msg.created_at)}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.continueConversationButton}
                onPress={() =>
                  navigation.navigate('ChatScreen', {
                    workerId: conversation.id,
                    workerName: conversation.professional_name,
                    conversation: conversation,
                  })
                }
              >
                <Text style={styles.continueConversationText}>Continue Conversation</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Quotes')}
        >
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionText}>My Quotes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Messages')}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.actionIcon}>💬</Text>
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.actionText}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Bookings')}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>View All Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('CompletionApprovals')}
        >
          <Text style={styles.actionIcon}>✅</Text>
          <Text style={styles.actionText}>Job Completion Approvals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Reviews')}
        >
          <Text style={styles.actionIcon}>⭐</Text>
          <Text style={styles.actionText}>My Reviews</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.actionIcon}>👤</Text>
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      {/* Floating Search Button */}
      <FloatingSearchButton navigation={navigation} />
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
  topBarTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  scrollContent: {
    flex: 1,
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
    paddingBottom: 30,
  },
  greeting: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: 'rgba(255,255,255,0.9)',
  },
  heroContainer: {
    padding: SIZES.padding,
    paddingTop: SIZES.padding * 1.5,
  },
  findProButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    ...SHADOWS.medium,
    elevation: 8,
  },
  findProContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  findProTextContainer: {
    flex: 1,
  },
  findProTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 6,
  },
  findProSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  findProIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  findProIcon: {
    fontSize: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statNumber: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
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
  seeAll: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    ...FONTS.semiBold,
  },
  bookingCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTitle: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
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
  bookingWorker: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  bookingPrice: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.primary,
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
  actionButton: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
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
  // Recent Inquiries Styles
  emptyInquiries: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  findServicesButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  findServicesButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  conversationGroup: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  conversationHeader: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 12,
  },
  messagesContainer: {
    marginBottom: 12,
  },
  inquiryCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '90%',
  },
  inquiryCardClient: {
    backgroundColor: '#d0eaff',
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    alignSelf: 'flex-end',
  },
  inquiryCardProfessional: {
    backgroundColor: '#e0ffe0',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    alignSelf: 'flex-start',
  },
  inquirySender: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  inquiryContent: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    marginBottom: 4,
    lineHeight: 18,
  },
  inquiryTime: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
  },
  continueConversationButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueConversationText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
});

export default ClientDashboard;
