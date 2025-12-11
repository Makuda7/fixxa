import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';

const CreateBookingScreen = ({ route, navigation }) => {
  const { worker } = route.params || {};

  if (!worker) {
    Alert.alert('Error', 'Worker information not found');
    navigation.goBack();
    return null;
  }

  const [bookingDate, setBookingDate] = useState(new Date());
  const [bookingTime, setBookingTime] = useState(new Date());
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format time to HH:MM
  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Display formatted date
  const displayDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-ZA', options);
  };

  // Display formatted time
  const displayTime = (date) => {
    return date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBookingDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setBookingTime(selectedTime);
    }
  };

  const handleSubmit = async () => {
    // Validation
    const now = new Date();
    const selectedDateTime = new Date(bookingDate);
    selectedDateTime.setHours(bookingTime.getHours(), bookingTime.getMinutes());

    if (selectedDateTime < now) {
      Alert.alert('Invalid Date/Time', 'Please select a future date and time.');
      return;
    }

    if (!note.trim()) {
      Alert.alert(
        'Add Details',
        'Please describe what you need help with.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/bookings', {
        workerId: worker.id,
        booking_date: formatDate(bookingDate),
        booking_time: formatTime(bookingTime),
        note: note.trim(),
      });

      if (response.data.success) {
        Alert.alert(
          'Booking Created!',
          `Your booking request has been sent to ${worker.name}. They will review and respond soon.`,
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
      } else {
        Alert.alert('Error', response.data.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Booking creation error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Unable to create booking. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Book Professional</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Professional Info */}
        <View style={styles.professionalCard}>
          <View style={styles.avatarContainer}>
            {worker.profile_picture ? (
              <Image
                source={{ uri: worker.profile_picture }}
                style={styles.avatar}
              />
            ) : (
              <Text style={styles.avatarText}>
                {worker.name?.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.professionalInfo}>
            <Text style={styles.professionalName}>{worker.name}</Text>
            <Text style={styles.professionalSpecialty}>
              {worker.speciality || 'Professional'}
            </Text>
            {worker.rating && (
              <Text style={styles.professionalRating}>
                ⭐ {parseFloat(worker.rating).toFixed(1)}
              </Text>
            )}
          </View>
        </View>

        {/* Booking Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Booking Details</Text>

          {/* Date Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select Date</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeIcon}>📅</Text>
              <Text style={styles.dateTimeText}>{displayDate(bookingDate)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={bookingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* Time Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Select Time</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.dateTimeIcon}>🕐</Text>
              <Text style={styles.dateTimeText}>{displayTime(bookingTime)}</Text>
            </TouchableOpacity>
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={bookingTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}

          {/* Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Describe what you need help with <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={note}
              onChangeText={setNote}
              placeholder="E.g., Fix leaking tap in kitchen, Install ceiling fan in bedroom..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.helpText}>
              Please do not include contact information. All communication should happen on the platform.
            </Text>
          </View>
        </View>

        {/* Important Information */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 Important Information</Text>
          <Text style={styles.infoText}>
            • Your booking request will be sent to {worker.name}{'\n'}
            • They will review and either accept or decline{'\n'}
            • Once accepted, you'll provide your service address{'\n'}
            • Payment is made directly to the professional after service completion
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating Booking...' : 'Request Booking'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  professionalCard: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    padding: SIZES.padding,
    margin: SIZES.padding,
    marginBottom: 8,
    borderRadius: 12,
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
  professionalInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  professionalName: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  professionalSpecialty: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  professionalRating: {
    fontSize: SIZES.sm,
    color: COLORS.warning,
  },
  formSection: {
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    marginTop: 8,
    padding: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  dateTimeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  dateTimeText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  textArea: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    minHeight: 120,
  },
  helpText: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 6,
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    margin: SIZES.padding,
    marginTop: 8,
    padding: SIZES.padding,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoTitle: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    margin: SIZES.padding,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  bottomPadding: {
    height: 20,
  },
});

export default CreateBookingScreen;
