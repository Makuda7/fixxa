import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const JoinProScreen = ({ navigation }) => {
  const handleApply = () => {
    Linking.openURL('https://fixxa.co.za/join-professional');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join as a Professional</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Become a Fixxa Professional</Text>
          <Text style={styles.subtitle}>
            Join South Africa's leading platform for skilled professionals
          </Text>

          <Text style={styles.sectionTitle}>Why Join Fixxa?</Text>
          <Text style={styles.bulletPoint}>• Access to thousands of potential clients</Text>
          <Text style={styles.bulletPoint}>• Flexible working hours</Text>
          <Text style={styles.bulletPoint}>• Secure payment processing</Text>
          <Text style={styles.bulletPoint}>• Build your reputation with reviews</Text>
          <Text style={styles.bulletPoint}>• Marketing and support from Fixxa</Text>

          <Text style={styles.sectionTitle}>Requirements</Text>
          <Text style={styles.bulletPoint}>• Valid South African ID</Text>
          <Text style={styles.bulletPoint}>• Relevant skills and experience</Text>
          <Text style={styles.bulletPoint}>• Professional tools and equipment</Text>
          <Text style={styles.bulletPoint}>• Smartphone with internet access</Text>
          <Text style={styles.bulletPoint}>• Clean criminal record</Text>

          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.paragraph}>
            1. Apply online{'\n'}
            2. Complete verification process{'\n'}
            3. Set up your profile{'\n'}
            4. Start receiving booking requests{'\n'}
            5. Build your reputation and grow your business
          </Text>

          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>

          <Text style={styles.contactText}>
            Questions? Contact us at careers@fixxa.co.za
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
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 20 },
  sectionTitle: { fontSize: SIZES.md, ...FONTS.bold, color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  paragraph: { fontSize: SIZES.sm, ...FONTS.regular, color: COLORS.textSecondary, lineHeight: 24, marginBottom: 8 },
  bulletPoint: { fontSize: SIZES.sm, ...FONTS.regular, color: COLORS.textSecondary, lineHeight: 24, marginLeft: 8 },
  applyButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  applyButtonText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.bold },
  contactText: { fontSize: SIZES.xs, color: COLORS.textLight, textAlign: 'center' },
});

export default JoinProScreen;
