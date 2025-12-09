import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';
import api from '../../services/api';

const ContactScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email || !message) {
      Alert.alert('Required Fields', 'Please fill in all fields.');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/contact', { name, email, message });
      if (response.data.success) {
        Alert.alert('Success', 'Your message has been sent!');
        setName('');
        setEmail('');
        setMessage('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
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
        <Text style={styles.headerTitle}>Contact Us</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.title}>Get In Touch</Text>
          <Text style={styles.paragraph}>
            We'd love to hear from you. Send us a message and we'll respond as
            soon as possible.
          </Text>

          <View style={styles.contactMethods}>
            <TouchableOpacity
              style={styles.contactMethod}
              onPress={() => Linking.openURL('mailto:info@fixxa.co.za')}
            >
              <Text style={styles.contactIcon}>📧</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>info@fixxa.co.za</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactMethod}
              onPress={() => Linking.openURL('tel:+27111234567')}
            >
              <Text style={styles.contactIcon}>📞</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>+27 (0)11 123 4567</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.contactMethod}>
              <Text style={styles.contactIcon}>📍</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Location</Text>
                <Text style={styles.contactValue}>Johannesburg, South Africa</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Form */}
        <View style={styles.card}>
          <Text style={styles.subtitle}>Send us a message</Text>

          <TextInput
            style={styles.input}
            placeholder="Your Name"
            placeholderTextColor={COLORS.textLight}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Your Email"
            placeholderTextColor={COLORS.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="Your Message"
            placeholderTextColor={COLORS.textLight}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, sending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={sending}
          >
            <Text style={styles.submitButtonText}>
              {sending ? 'Sending...' : 'Send Message'}
            </Text>
          </TouchableOpacity>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding * 1.5,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  title: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  paragraph: {
    fontSize: SIZES.sm,
    ...FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  contactMethods: {
    gap: 16,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  contactIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: SIZES.xs,
    ...FONTS.medium,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageInput: {
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOWS.small,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
});

export default ContactScreen;
