import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const AboutScreen = ({ navigation }) => {
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
        <Text style={styles.headerTitle}>About Us</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>About Fixxa</Text>

          <Text style={styles.subtitle}>Our Story</Text>
          <Text style={styles.paragraph}>
            Fixxa started as a vision to connect skilled professionals directly
            with customers who need reliable services. We believe in quality,
            trust, and convenience, making it easy to find experts who care.
          </Text>
          <Text style={styles.paragraph}>
            From humble beginnings, our team has grown steadily with a passion
            for helping communities access dependable and affordable services.
          </Text>

          <Image
            source={{ uri: 'https://fixxa.co.za/images/happy%20family.jpg' }}
            style={styles.storyImage}
            resizeMode="cover"
          />

          <Text style={styles.subtitle}>Our Aim</Text>
          <Text style={styles.paragraph}>
            We strive to empower professionals by providing a platform to showcase
            their skills and connect with clients. Our aim is to build lasting
            relationships and help everyone achieve their goals through quality
            service.
          </Text>
          <Text style={styles.paragraph}>
            We are committed to innovation and continuous improvement, ensuring
            a seamless and trustworthy experience for all users.
          </Text>

          <Image
            source={{ uri: 'https://fixxa.co.za/images/happy%20home.jpeg' }}
            style={styles.aimImage}
            resizeMode="cover"
          />

          <Text style={styles.subtitle}>Why Choose Fixxa?</Text>
          <Text style={styles.bulletPoint}>• Verified professionals</Text>
          <Text style={styles.bulletPoint}>• Secure payments</Text>
          <Text style={styles.bulletPoint}>• Customer reviews and ratings</Text>
          <Text style={styles.bulletPoint}>• 24/7 customer support</Text>
          <Text style={styles.bulletPoint}>• Wide range of services</Text>

          <Text style={styles.subtitle}>Contact Information</Text>
          <Text style={styles.paragraph}>
            Email: info@fixxa.co.za{'\n'}
            Phone: +27 (0)11 123 4567{'\n'}
            Address: Johannesburg, South Africa
          </Text>
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
    ...SHADOWS.small,
  },
  title: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: SIZES.sm,
    ...FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: SIZES.sm,
    ...FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginLeft: 8,
  },
  storyImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 16,
    ...SHADOWS.small,
  },
  aimImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginVertical: 16,
    ...SHADOWS.small,
  },
});

export default AboutScreen;
