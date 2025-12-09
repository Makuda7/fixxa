import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const SafetyScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Safety & Security</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Safety & Security</Text>

          <Text style={styles.sectionTitle}>Our Commitment to Safety</Text>
          <Text style={styles.paragraph}>
            Your safety is our top priority. We've implemented multiple measures to ensure a secure platform.
          </Text>

          <Text style={styles.sectionTitle}>Professional Verification</Text>
          <Text style={styles.bulletPoint}>• ID verification for all professionals</Text>
          <Text style={styles.bulletPoint}>• Background checks</Text>
          <Text style={styles.bulletPoint}>• Skills verification</Text>
          <Text style={styles.bulletPoint}>• Review system for accountability</Text>

          <Text style={styles.sectionTitle}>Payment Security</Text>
          <Text style={styles.paragraph}>
            All payments are processed through secure, encrypted channels. We never store your full payment details.
          </Text>

          <Text style={styles.sectionTitle}>Safety Tips</Text>
          <Text style={styles.bulletPoint}>• Meet professionals in well-lit, public areas when possible</Text>
          <Text style={styles.bulletPoint}>• Check reviews and ratings before booking</Text>
          <Text style={styles.bulletPoint}>• Keep communication within the app</Text>
          <Text style={styles.bulletPoint}>• Report any suspicious behavior immediately</Text>

          <Text style={styles.sectionTitle}>Report Issues</Text>
          <Text style={styles.paragraph}>
            If you experience any safety concerns, contact us immediately at safety@fixxa.co.za or through the app.
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
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.textPrimary, marginBottom: 16 },
  sectionTitle: { fontSize: SIZES.md, ...FONTS.bold, color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  paragraph: { fontSize: SIZES.sm, ...FONTS.regular, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 8 },
  bulletPoint: { fontSize: SIZES.sm, ...FONTS.regular, color: COLORS.textSecondary, lineHeight: 24, marginLeft: 8 },
});

export default SafetyScreen;
