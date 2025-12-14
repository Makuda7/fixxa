import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatDate, formatCurrency, formatPhoneNumber } from '../../utils/formatting';

const BookingDetailScreen = ({ route, navigation }) => {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingQuote, setProcessingQuote] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
    fetchQuote();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      if (response.data.booking) {
        setBooking(response.data.booking);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      Alert.alert('Error', 'Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuote = async () => {
    try {
      const response = await api.get(`/quotes/booking/${bookingId}`);
      if (response.data.success && response.data.quote) {
        setQuote(response.data.quote);
      }
    } catch (error) {
      // Quote might not exist yet, which is fine
      console.log('No quote found for this booking');
    }
  };

  const handleCall = () => {
    if (booking?.worker_phone) {
      Linking.openURL(`tel:${booking.worker_phone}`);
    }
  };

  const handleSMS = () => {
    if (booking?.worker_phone) {
      Linking.openURL(`sms:${booking.worker_phone}`);
    }
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post(`/bookings/${bookingId}/cancel`);
              if (response.data.success) {
                Alert.alert('Success', 'Booking cancelled successfully.');
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking.');
            }
          },
        },
      ]
    );
  };

  const handleWriteReview = () => {
    navigation.navigate('CreateReview', { booking });
  };

  const handleAcceptQuote = () => {
    Alert.alert(
      'Accept Quote',
      `Are you sure you want to accept this quote for ${formatCurrency(quote.total_amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setProcessingQuote(true);
            try {
              const response = await api.post(`/quotes/${quote.id}/respond`, {
                action: 'accept'
              });
              if (response.data.success) {
                Alert.alert('Success', 'Quote accepted successfully!');
                fetchQuote(); // Refresh quote status
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to accept quote.');
            } finally {
              setProcessingQuote(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectQuote = () => {
    Alert.alert(
      'Decline Quote',
      'Are you sure you want to decline this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingQuote(true);
            try {
              const response = await api.post(`/quotes/${quote.id}/respond`, {
                action: 'reject'
              });
              if (response.data.success) {
                Alert.alert('Success', 'Quote declined.');
                fetchQuote(); // Refresh quote status
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to decline quote.');
            } finally {
              setProcessingQuote(false);
            }
          },
        },
      ]
    );
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(booking.status) },
            ]}
          >
            <Text style={styles.statusText}>{booking.status}</Text>
          </View>
        </View>

        {/* Service Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Service Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service Type:</Text>
            <Text style={styles.infoValue}>{booking.service_type}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(booking.booking_date)}</Text>
          </View>
          {booking.price && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Price:</Text>
              <Text style={[styles.infoValue, styles.price]}>
                {formatCurrency(booking.price)}
              </Text>
            </View>
          )}
          {booking.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.description}>{booking.description}</Text>
            </View>
          )}
        </View>

        {/* Worker Info */}
        {booking.worker_name && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Worker Information</Text>
            <View style={styles.workerHeader}>
              <View style={styles.workerAvatar}>
                <Text style={styles.workerAvatarText}>
                  {booking.worker_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{booking.worker_name}</Text>
                {booking.worker_speciality && (
                  <Text style={styles.workerSpeciality}>
                    {booking.worker_speciality}
                  </Text>
                )}
              </View>
            </View>

            {booking.worker_phone && (
              <View style={styles.contactButtons}>
                <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                  <Text style={styles.contactIcon}>📞</Text>
                  <Text style={styles.contactText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactButton} onPress={handleSMS}>
                  <Text style={styles.contactIcon}>💬</Text>
                  <Text style={styles.contactText}>Message</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Quote Section */}
        {quote && (
          <View style={[
            styles.quoteCard,
            quote.status === 'pending' ? styles.quotePending :
            quote.status === 'accepted' ? styles.quoteAccepted :
            styles.quoteRejected
          ]}>
            <View style={styles.quoteHeader}>
              <Text style={styles.quoteIcon}>💰</Text>
              <Text style={[
                styles.quoteTitle,
                quote.status === 'pending' ? styles.quoteTitlePending :
                quote.status === 'accepted' ? styles.quoteTitleAccepted :
                styles.quoteTitleRejected
              ]}>
                Quote {quote.status === 'accepted' ? 'Accepted' : quote.status === 'rejected' ? 'Declined' : 'Received'}
              </Text>
            </View>

            {/* Line Items */}
            {quote.line_items && Array.isArray(quote.line_items) && (
              <View style={styles.lineItemsContainer}>
                {quote.line_items.map((item, index) => (
                  <View key={index} style={styles.lineItem}>
                    <Text style={styles.lineItemDescription}>{item.description}</Text>
                    <Text style={styles.lineItemAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Total */}
            <View style={[
              styles.quoteTotal,
              quote.status === 'pending' ? styles.quoteTotalPending :
              quote.status === 'accepted' ? styles.quoteTotalAccepted :
              styles.quoteTotalRejected
            ]}>
              <Text style={styles.quoteTotalLabel}>Total:</Text>
              <Text style={styles.quoteTotalAmount}>{formatCurrency(quote.total_amount)}</Text>
            </View>

            {/* Payment Methods */}
            {quote.payment_methods && quote.payment_methods.length > 0 && (
              <Text style={styles.quotePayment}>
                <Text style={styles.quotePaymentLabel}>Payment: </Text>
                {quote.payment_methods.join(', ').toUpperCase()}
              </Text>
            )}

            {/* Notes */}
            {quote.notes && (
              <Text style={styles.quoteNotes}>"{quote.notes}"</Text>
            )}

            {/* Valid Until */}
            {quote.status === 'pending' && quote.valid_until && (
              <Text style={styles.quoteValidity}>
                Valid until: {formatDate(quote.valid_until)}
              </Text>
            )}

            {/* Action Buttons */}
            {quote.status === 'pending' && (
              <View style={styles.quoteActions}>
                <TouchableOpacity
                  style={[styles.quoteButton, styles.acceptButton]}
                  onPress={handleAcceptQuote}
                  disabled={processingQuote}
                >
                  {processingQuote ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.quoteButtonIcon}>✅</Text>
                      <Text style={styles.quoteButtonText}>Accept Quote</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quoteButton, styles.declineButton]}
                  onPress={handleRejectQuote}
                  disabled={processingQuote}
                >
                  {processingQuote ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.quoteButtonIcon}>❌</Text>
                      <Text style={styles.quoteButtonText}>Decline Quote</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {booking.status?.toLowerCase() === 'completed' && !booking.has_review && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleWriteReview}>
              <Text style={styles.primaryButtonText}>Write a Review</Text>
            </TouchableOpacity>
          )}

          {booking.status?.toLowerCase() === 'pending' && (
            <TouchableOpacity style={styles.dangerButton} onPress={handleCancelBooking}>
              <Text style={styles.dangerButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  errorText: {
    fontSize: SIZES.lg,
    color: COLORS.textSecondary,
    marginBottom: 20,
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
  },
  backIcon: {
    fontSize: 28,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: SIZES.padding,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  cardTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  infoValue: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    flex: 1,
    textAlign: 'right',
  },
  price: {
    color: COLORS.primary,
    fontSize: SIZES.md,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  description: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    marginTop: 8,
    lineHeight: 20,
  },
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  workerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workerAvatarText: {
    fontSize: 24,
    ...FONTS.bold,
    color: COLORS.white,
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
  workerSpeciality: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  contactText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  actionsContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.small,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  dangerButton: {
    backgroundColor: COLORS.error,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  dangerButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  // Quote Styles
  quoteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  quotePending: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#2196F3',
  },
  quoteAccepted: {
    backgroundColor: '#d4edda',
    borderLeftColor: '#28a745',
  },
  quoteRejected: {
    backgroundColor: '#f8d7da',
    borderLeftColor: '#dc3545',
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  quoteIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  quoteTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
  },
  quoteTitlePending: {
    color: '#0d47a1',
  },
  quoteTitleAccepted: {
    color: '#155724',
  },
  quoteTitleRejected: {
    color: '#721c24',
  },
  lineItemsContainer: {
    marginBottom: 12,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  lineItemDescription: {
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  lineItemAmount: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  quoteTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 2,
  },
  quoteTotalPending: {
    borderTopColor: '#2196F3',
  },
  quoteTotalAccepted: {
    borderTopColor: '#28a745',
  },
  quoteTotalRejected: {
    borderTopColor: '#dc3545',
  },
  quoteTotalLabel: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  quoteTotalAmount: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  quotePayment: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  quotePaymentLabel: {
    ...FONTS.semiBold,
  },
  quoteNotes: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  quoteValidity: {
    fontSize: SIZES.xs,
    color: COLORS.gray,
    marginTop: 8,
  },
  quoteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  quoteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  declineButton: {
    backgroundColor: '#dc3545',
  },
  quoteButtonIcon: {
    fontSize: 16,
  },
  quoteButtonText: {
    color: COLORS.white,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
  },
});

export default BookingDetailScreen;
