import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const PrivacyScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.updated}>Last updated: January 2025</Text>

          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly, including name, email, phone number, and payment information.
          </Text>

          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use your information to provide services, process payments, communicate with you, and improve our platform.
          </Text>

          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.paragraph}>
            We share information with professionals to fulfill bookings and with service providers who help us operate.
          </Text>

          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement security measures to protect your data, though no system is 100% secure.
          </Text>

          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to access, update, or delete your personal information. Contact us to exercise these rights.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.padding,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backIcon: { fontSize: 28, color: COLORS.white },
  headerTitle: { fontSize: SIZES.xl, ...FONTS.bold, color: COLORS.white },
  content: { flex: 1, padding: SIZES.padding },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding * 1.5,
    ...SHADOWS.small,
  },
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.textPrimary, marginBottom: 8 },
  updated: { fontSize: SIZES.xs, color: COLORS.textLight, marginBottom: 20 },
  sectionTitle: { fontSize: SIZES.md, ...FONTS.bold, color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  paragraph: { fontSize: SIZES.sm, ...FONTS.regular, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 8 },
});

export default PrivacyScreen;
