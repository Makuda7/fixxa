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

const EarningsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, this_month, last_month, this_year
  const [summary, setSummary] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisYear: 0,
    pendingPayments: 0,
    completedJobs: 0,
  });
  const [earnings, setEarnings] = useState([]);

  useEffect(() => {
    fetchEarningsData();
  }, [filter]);

  const fetchEarningsData = async () => {
    try {
      const [summaryResponse, earningsResponse] = await Promise.all([
        api.get('/workers/earnings/summary'),
        api.get(`/workers/earnings?filter=${filter}`),
      ]);

      if (summaryResponse.data.summary) {
        setSummary(summaryResponse.data.summary);
      }

      if (earningsResponse.data.earnings) {
        setEarnings(earningsResponse.data.earnings);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      Alert.alert('Error', 'Failed to load earnings data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData();
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'processing':
        return COLORS.info;
      default:
        return COLORS.gray;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const EarningCard = ({ earning }) => (
    <View style={styles.earningCard}>
      <View style={styles.earningHeader}>
        <View style={styles.earningInfo}>
          <Text style={styles.earningService} numberOfLines={1}>
            {earning.service_type || 'Service'}
          </Text>
          <Text style={styles.earningClient}>
            Client: {earning.client_name || 'N/A'}
          </Text>
          <Text style={styles.earningDate}>
            {formatDate(earning.completed_date || earning.created_at)}
          </Text>
        </View>
        <View style={styles.earningAmount}>
          <Text style={styles.amountText}>{formatCurrency(earning.amount)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(earning.payment_status) },
            ]}
          >
            <Text style={styles.statusText}>
              {earning.payment_status || 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      {earning.description && (
        <Text style={styles.earningDescription} numberOfLines={2}>
          {earning.description}
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Earnings</Text>
          <Text style={styles.headerSubtitle}>
            {earnings.length} transaction{earnings.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <View style={styles.mainSummaryCard}>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <Text style={styles.summaryAmount}>
              {formatCurrency(summary.total || 0)}
            </Text>
            <Text style={styles.summarySubtext}>
              From {summary.completedJobs || 0} completed job
              {summary.completedJobs !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summarySmallCard}>
              <Text style={styles.summarySmallLabel}>This Month</Text>
              <Text style={styles.summarySmallAmount}>
                {formatCurrency(summary.thisMonth || 0)}
              </Text>
            </View>

            <View style={styles.summarySmallCard}>
              <Text style={styles.summarySmallLabel}>Last Month</Text>
              <Text style={styles.summarySmallAmount}>
                {formatCurrency(summary.lastMonth || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summarySmallCard}>
              <Text style={styles.summarySmallLabel}>This Year</Text>
              <Text style={styles.summarySmallAmount}>
                {formatCurrency(summary.thisYear || 0)}
              </Text>
            </View>

            <View style={[styles.summarySmallCard, styles.pendingCard]}>
              <Text style={styles.summarySmallLabel}>Pending</Text>
              <Text style={styles.summarySmallAmount}>
                {formatCurrency(summary.pendingPayments || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterButton label="All Time" value="all" />
            <FilterButton label="This Month" value="this_month" />
            <FilterButton label="Last Month" value="last_month" />
            <FilterButton label="This Year" value="this_year" />
          </ScrollView>
        </View>

        {/* Earnings List */}
        <View style={styles.earningsSection}>
          <Text style={styles.sectionTitle}>Transaction History</Text>

          {earnings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>No earnings yet</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'this_month'
                  ? 'No earnings this month'
                  : filter === 'last_month'
                  ? 'No earnings last month'
                  : filter === 'this_year'
                  ? 'No earnings this year'
                  : 'Complete jobs to start earning'}
              </Text>
            </View>
          ) : (
            earnings.map((earning) => (
              <EarningCard key={earning.id} earning={earning} />
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
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
  },
  summarySection: {
    padding: SIZES.padding,
  },
  mainSummaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SIZES.padding * 1.5,
    marginBottom: 12,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  summaryLabel: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 40,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: SIZES.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summarySmallCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    ...SHADOWS.small,
  },
  pendingCard: {
    backgroundColor: '#FFF3CD',
  },
  summarySmallLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  summarySmallAmount: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  filterContainer: {
    paddingHorizontal: SIZES.padding,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
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
  earningsSection: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  earningCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningInfo: {
    flex: 1,
    marginRight: 12,
  },
  earningService: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  earningClient: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  earningDate: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  earningAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.primary,
    marginBottom: 6,
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
  earningDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
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

export default EarningsScreen;
