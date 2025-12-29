import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatCurrency, formatDate } from '../../utils/formatting';
import SafetyTipsModal from '../../components/SafetyTipsModal';

const AcceptQuoteScreen = ({ route, navigation }) => {
  const { quote } = route.params;
  const { user } = useAuth();

  const [serviceAddress, setServiceAddress] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);

  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      // Check if the selected date is in the available dates
      const dateString = date.toISOString().split('T')[0];
      const availableDates = quote.available_dates || [];

      if (availableDates.length > 0 && !availableDates.includes(dateString)) {
        Alert.alert(
          'Date Not Available',
          'Please select one of the available dates marked by the professional.',
          [{ text: 'OK' }]
        );
        return;
      }

      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
    }
  };

  const validateForm = () => {
    if (!serviceAddress.trim()) {
      Alert.alert('Missing Information', 'Please provide the service address.');
      return false;
    }

    if (!termsAccepted) {
      Alert.alert('Terms Required', 'Please accept the terms and conditions to proceed.');
      return false;
    }

    // Check if selected date is in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    if (selected < now) {
      Alert.alert('Invalid Date', 'Please select a date that is today or in the future.');
      return false;
    }

    // Check if selected date is in available dates (if worker specified available dates)
    const availableDates = quote.available_dates || [];
    if (availableDates.length > 0) {
      const selectedDateString = selectedDate.toISOString().split('T')[0];
      if (!availableDates.includes(selectedDateString)) {
        Alert.alert(
          'Invalid Date',
          'Please select one of the available dates marked by the professional.'
        );
        return false;
      }
    }

    return true;
  };

  const handleInitiateAcceptance = () => {
    if (!validateForm()) {
      return;
    }
    // Show safety tips before proceeding
    setShowSafetyModal(true);
  };

  const handleProceedToAccept = async () => {
    setShowSafetyModal(false);
    setLoading(true);

    try {
      // Format date and time
      const bookingDate = selectedDate.toISOString().split('T')[0];
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const bookingTime = `${hours}:${minutes}`;

      // Accept quote and create booking
      const response = await api.post(`/quotes/${quote.id}/accept`, {
        service_address: serviceAddress.trim(),
        booking_date: bookingDate,
        booking_time: bookingTime,
        additional_notes: additionalNotes.trim() || null,
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Quote accepted successfully! A booking has been created and the professional has been notified.',
          [
            {
              text: 'View Bookings',
              onPress: () => navigation.navigate('Bookings'),
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error accepting quote:', error);
      const errorMessage = error.response?.data?.error || 'Failed to accept quote. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeDisplay = (time) => {
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-ZA', options);
  };

  return (
    <View style={styles.container}>
      {/* Safety Tips Modal */}
      <SafetyTipsModal
        visible={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        onProceed={handleProceedToAccept}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accept Quote</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Quote Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Professional:</Text>
              <Text style={styles.summaryValue}>{quote.worker_name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service:</Text>
              <Text style={styles.summaryValue}>{quote.service_description}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Amount:</Text>
              <Text style={[styles.summaryValue, styles.amountText]}>
                {formatCurrency(quote.total_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Service Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Service Address <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.helperText}>
            Where should the professional come to provide the service?
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter full service address"
            placeholderTextColor={COLORS.textLight}
            value={serviceAddress}
            onChangeText={setServiceAddress}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Available Dates */}
        {quote.available_dates && quote.available_dates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Start Dates</Text>
            <Text style={styles.helperText}>
              The professional is available to start on the following dates:
            </Text>
            <View style={styles.availableDatesContainer}>
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

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Preferred Start Date <Text style={styles.required}>*</Text>
          </Text>
          {quote.available_dates && quote.available_dates.length > 0 && (
            <Text style={styles.helperText}>
              Please select one of the available dates shown above
            </Text>
          )}
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              📅 {formatDate(selectedDate)}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Preferred Start Time <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              🕐 {formatTimeDisplay(selectedTime)}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <Text style={styles.helperText}>
            Any special instructions or requirements for the professional?
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Gate code, parking instructions, etc."
            placeholderTextColor={COLORS.textLight}
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Terms and Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <View style={styles.termsBox}>
            <Text style={styles.termsText}>
              By accepting this quote, you agree to:
            </Text>
            <Text style={styles.termsBullet}>
              • Allow the professional to begin work on the scheduled date and time
            </Text>
            <Text style={styles.termsBullet}>
              • Pay the quoted amount of {formatCurrency(quote.total_amount)} upon job completion
            </Text>
            <Text style={styles.termsBullet}>
              • Provide access to the service address at the scheduled time
            </Text>
            <Text style={styles.termsBullet}>
              • Follow Fixxa's terms of service and community guidelines
            </Text>
            <Text style={styles.termsBullet}>
              • Communicate through the Fixxa platform for your protection
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and agree to the terms and conditions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Information */}
        {quote.payment_methods && quote.payment_methods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accepted Payment Methods</Text>
            <View style={styles.paymentMethods}>
              {quote.payment_methods.map((method, index) => (
                <View key={index} style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>{method.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Accept Button */}
        <TouchableOpacity
          style={[
            styles.acceptButton,
            (!termsAccepted || loading) && styles.acceptButtonDisabled,
          ]}
          onPress={handleInitiateAcceptance}
          disabled={!termsAccepted || loading}
        >
          <Text style={styles.acceptButtonText}>
            {loading ? 'Processing...' : 'Accept Quote & Create Booking'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  required: {
    color: COLORS.error,
  },
  helperText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  summaryValue: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  amountText: {
    fontSize: SIZES.lg,
    color: COLORS.primary,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.regular,
  },
  dateButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  termsBox: {
    backgroundColor: '#fffbf0',
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  termsText: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  termsBullet: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.bold,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    ...FONTS.medium,
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
  acceptButton: {
    backgroundColor: COLORS.success,
    margin: SIZES.padding,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  acceptButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
  },
  acceptButtonText: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.white,
  },
  availableDatesContainer: {
    marginTop: 8,
  },
  availableDateChip: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  availableDateText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
});

export default AcceptQuoteScreen;
