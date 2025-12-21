import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency } from '../../utils/formatting';

const QuotesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuotes = async () => {
    try {
      const response = await api.get('/quotes/client');
      if (response.data.success && response.data.quotes) {
        setQuotes(response.data.quotes);
      }
    } catch (error) {
      console.error('Error fetching quotes:', error);
      Alert.alert('Error', 'Failed to fetch quotes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQuotes();

    // Refresh when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchQuotes();
    });

    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuotes();
  };

  const handleAcceptQuote = (quote) => {
    // Navigate to AcceptQuoteScreen with quote details
    navigation.navigate('AcceptQuote', { quote });
  };

  const handleDeclineQuote = async (quoteId) => {
    Alert.alert(
      'Decline Quote',
      'Are you sure you want to decline this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post(`/quotes/${quoteId}/decline`);
              if (response.data.success) {
                Alert.alert('Success', 'Quote declined.');
                fetchQuotes();
              }
            } catch (error) {
              console.error('Error declining quote:', error);
              Alert.alert('Error', 'Failed to decline quote. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'declined':
        return COLORS.error;
      default:
        return COLORS.gray;
    }
  };

  const getStatusText = (status) => {
    return status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown';
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-ZA', options);
  };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Quotes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {quotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No quotes yet</Text>
            <Text style={styles.emptySubtext}>
              When professionals send you quotes, they'll appear here.
            </Text>
            <TouchableOpacity
              style={styles.findProButton}
              onPress={() => navigation.navigate('Find')}
            >
              <Text style={styles.findProButtonText}>Find Professionals</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.quotesContainer}>
            {quotes.map((quote) => (
              <View key={quote.id} style={styles.quoteCard}>
                {/* Quote Header */}
                <View style={styles.quoteHeader}>
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{quote.worker_name}</Text>
                    {quote.speciality && (
                      <Text style={styles.speciality}>{quote.speciality}</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(quote.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusText(quote.status)}
                    </Text>
                  </View>
                </View>

                {/* Service Description */}
                {quote.service_description && (
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceLabel}>Service:</Text>
                    <Text style={styles.serviceDescription}>
                      {quote.service_description}
                    </Text>
                  </View>
                )}

                {/* Location */}
                {quote.service_location && (
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationIcon}>📍</Text>
                    <Text style={styles.locationText}>{quote.service_location}</Text>
                  </View>
                )}

                {/* Quote Amount */}
                <View style={styles.amountContainer}>
                  <Text style={styles.amountLabel}>Quote Amount:</Text>
                  <Text style={styles.amountValue}>
                    {formatCurrency(quote.total_amount)}
                  </Text>
                </View>

                {/* Available Start Dates */}
                {quote.available_dates && quote.available_dates.length > 0 && (
                  <View style={styles.availableDatesContainer}>
                    <Text style={styles.availableDatesLabel}>Available Start Dates:</Text>
                    <View style={styles.datesGrid}>
                      {quote.available_dates.map((dateString, index) => (
                        <View key={index} style={styles.availableDateChip}>
                          <Text style={styles.availableDateText}>
                            📅 {formatDateDisplay(dateString)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Notes */}
                {quote.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes from professional:</Text>
                    <Text style={styles.notesText}>{quote.notes}</Text>
                  </View>
                )}

                {/* Payment Methods */}
                {quote.payment_methods && quote.payment_methods.length > 0 && (
                  <View style={styles.paymentContainer}>
                    <Text style={styles.paymentLabel}>Accepted Payment Methods:</Text>
                    <View style={styles.paymentMethods}>
                      {quote.payment_methods.map((method, index) => (
                        <View key={index} style={styles.paymentBadge}>
                          <Text style={styles.paymentBadgeText}>{method}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Line Items */}
                {quote.line_items && quote.line_items.length > 0 && (
                  <View style={styles.lineItemsContainer}>
                    <Text style={styles.lineItemsLabel}>Quote Breakdown:</Text>
                    {quote.line_items.map((item, index) => (
                      <View key={index} style={styles.lineItem}>
                        <View style={styles.lineItemLeft}>
                          <Text style={styles.lineItemDescription}>
                            {item.description}
                          </Text>
                          {item.quantity > 1 && (
                            <Text style={styles.lineItemQuantity}>
                              Qty: {item.quantity}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.lineItemPrice}>
                          {formatCurrency(item.price)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Date */}
                <Text style={styles.quoteDate}>
                  Received: {formatDate(quote.created_at)}
                </Text>

                {/* Action Buttons - Only show for pending quotes */}
                {quote.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleDeclineQuote(quote.id)}
                    >
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptQuote(quote)}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Contact Worker Button */}
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() =>
                    navigation.navigate('ChatScreen', {
                      workerId: quote.worker_id,
                      workerName: quote.worker_name,
                    })
                  }
                >
                  <Text style={styles.contactButtonText}>
                    💬 Message {quote.worker_name}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
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
  header: {
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
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: COLORS.white,
    ...FONTS.bold,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 80,
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
    marginBottom: 24,
  },
  findProButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  findProButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.semiBold,
  },
  quotesContainer: {
    padding: SIZES.padding,
  },
  quoteCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  speciality: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: SIZES.xs,
    ...FONTS.semiBold,
    color: COLORS.white,
  },
  serviceInfo: {
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  locationText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  amountContainer: {
    backgroundColor: '#f0f8f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  amountLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  amountValue: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: '#1a5f1a',
  },
  notesContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  paymentContainer: {
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentBadgeText: {
    fontSize: SIZES.xs,
    color: COLORS.white,
    ...FONTS.semiBold,
  },
  lineItemsContainer: {
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  lineItemsLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lineItemLeft: {
    flex: 1,
  },
  lineItemDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
  },
  lineItemQuantity: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lineItemPrice: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.primary,
    marginLeft: 12,
  },
  quoteDate: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  declineButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.error,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  acceptButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.white,
  },
  contactButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.white,
  },
  availableDatesContainer: {
    marginBottom: 12,
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  availableDatesLabel: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  datesGrid: {
    gap: 8,
  },
  availableDateChip: {
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  availableDateText: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
});

export default QuotesScreen;
