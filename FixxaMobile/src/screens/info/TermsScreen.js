import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const TermsScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Terms & Conditions</Text>
          <Text style={styles.updated}>Last updated: January 2025</Text>

          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing and using Fixxa, you accept and agree to be bound by these Terms and Conditions.
          </Text>

          <Text style={styles.sectionTitle}>2. Use of Service</Text>
          <Text style={styles.paragraph}>
            You agree to use Fixxa only for lawful purposes and in accordance with these Terms.
          </Text>

          <Text style={styles.sectionTitle}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            You are responsible for maintaining the confidentiality of your account credentials.
          </Text>

          <Text style={styles.sectionTitle}>4. Bookings and Payments</Text>
          <Text style={styles.paragraph}>
            All bookings are subject to availability. Payments must be made through approved payment methods.
          </Text>

          <Text style={styles.sectionTitle}>5. Cancellation Policy</Text>
          <Text style={styles.paragraph}>
            Cancellations must be made according to the specific professional's cancellation policy.
          </Text>

          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            Fixxa is not liable for any damages arising from the use of our service or interactions with professionals.
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

export default TermsScreen;
