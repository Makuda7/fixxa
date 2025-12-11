import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const SupportScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    { label: 'Select a category...', value: '' },
    { label: 'Account Issues', value: 'account' },
    { label: 'Booking Problems', value: 'booking' },
    { label: 'Payment Issues', value: 'payment' },
    { label: 'Technical Issues', value: 'technical' },
    { label: 'Safety Concerns', value: 'safety' },
    { label: 'Report a Professional', value: 'complaint-professional' },
    { label: 'Report a Client', value: 'complaint-client' },
    { label: 'Feature Request', value: 'feature' },
    { label: 'General Inquiry', value: 'general' },
    { label: 'Other', value: 'other' },
  ];

  const handleSubmit = async () => {
    // Validation
    if (!category) {
      Alert.alert('Required Field', 'Please select a category.');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Required Field', 'Please enter a subject.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Required Field', 'Please describe your issue.');
      return;
    }

    if (message.trim().length < 20) {
      Alert.alert('Too Short', 'Please provide more details (minimum 20 characters).');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/support/submit', {
        name: user?.name || 'Anonymous',
        email: user?.email || 'no-email@fixxa.co.za',
        userType: user?.type || 'guest',
        category,
        subject: subject.trim(),
        message: message.trim(),
        bookingId: bookingId.trim() || 'N/A',
      });

      if (response.data.success) {
        Alert.alert(
          'Request Submitted!',
          'Your support request has been submitted. Our team will respond within 48 hours via email.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form
                setCategory('');
                setSubject('');
                setMessage('');
                setBookingId('');
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Support submission error:', error);
      Alert.alert(
        'Submission Failed',
        error.response?.data?.error ||
        'Unable to submit request. Please email us at support@fixxa.co.za'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Support</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🆘</Text>
          <Text style={styles.headerTitle}>How Can We Help?</Text>
          <Text style={styles.headerSubtitle}>
            We're here to help! Submit a support request and our team will respond within 48 hours.
          </Text>
        </View>

        {/* Support Form */}
        <View style={styles.formSection}>
          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(value) => setCategory(value)}
                style={styles.picker}
              >
                {categories.map((cat) => (
                  <Picker.Item
                    key={cat.value}
                    label={cat.label}
                    value={cat.value}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Booking ID (Optional) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Booking ID (if applicable)</Text>
            <TextInput
              style={styles.input}
              value={bookingId}
              onChangeText={setBookingId}
              placeholder="Enter booking ID..."
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>
              If your issue is related to a specific booking, enter the booking ID here.
            </Text>
          </View>

          {/* Subject */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Subject <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Brief description of your issue..."
              placeholderTextColor={COLORS.textLight}
              maxLength={100}
            />
          </View>

          {/* Message */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Message <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={message}
              onChangeText={setMessage}
              placeholder="Please describe your issue in detail. The more information you provide, the better we can help you."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <Text style={[styles.helpText, message.length < 20 && styles.helpTextWarning]}>
              {message.length} / 20 characters minimum
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 What to Expect</Text>
          <Text style={styles.infoText}>
            • We'll send a confirmation email to {user?.email || 'your email'}{'\n'}
            • Our team will review your request within 24-48 hours{'\n'}
            • You'll receive a response via email{'\n'}
            • For urgent safety concerns, call us directly
          </Text>
        </View>

        {/* Alternative Contact */}
        <View style={styles.alternativeContact}>
          <Text style={styles.alternativeTitle}>Need Immediate Help?</Text>
          <Text style={styles.alternativeText}>
            Email: support@fixxa.co.za{'\n'}
            Phone: +27 XX XXX XXXX (Mon-Fri, 9AM-5PM)
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
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
  topBar: {
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
  topBarTitle: {
    fontSize: SIZES.xl,
    ...FONTS.bold,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding * 2,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    padding: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  input: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
  },
  textArea: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    minHeight: 150,
  },
  helpText: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 6,
  },
  helpTextWarning: {
    color: COLORS.warning,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    margin: SIZES.padding,
    marginTop: 8,
    padding: SIZES.padding,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
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
  alternativeContact: {
    backgroundColor: COLORS.white,
    margin: SIZES.padding,
    marginTop: 8,
    padding: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
    alignItems: 'center',
  },
  alternativeTitle: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  alternativeText: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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

export default SupportScreen;
