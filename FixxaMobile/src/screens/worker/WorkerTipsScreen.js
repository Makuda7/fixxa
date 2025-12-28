import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';

const WorkerTipsScreen = ({ navigation }) => {
  const tips = [
    {
      id: 1,
      icon: '📸',
      title: 'Complete Your Portfolio',
      description: 'Upload high-quality before and after photos of your work. Clients are 3x more likely to book professionals with complete portfolios.',
      tips: [
        'Use good lighting when taking photos',
        'Show the transformation clearly',
        'Include at least 5-10 diverse examples',
        'Update regularly with recent work',
      ],
    },
    {
      id: 2,
      icon: '⭐',
      title: 'Build Your Reputation',
      description: 'Reviews are the #1 factor clients consider when choosing a professional.',
      tips: [
        'Always deliver quality work on time',
        'Politely ask satisfied clients to leave reviews',
        'Respond professionally to all feedback',
        'Maintain a rating of 4.5 stars or higher',
      ],
    },
    {
      id: 3,
      icon: '💬',
      title: 'Respond Quickly',
      description: 'Fast responses win more jobs. Aim to reply to quote requests within 2 hours.',
      tips: [
        'Enable push notifications for new requests',
        'Check the app multiple times daily',
        'Send professional, detailed quotes',
        'Be available to answer client questions',
      ],
    },
    {
      id: 4,
      icon: '💰',
      title: 'Price Competitively',
      description: 'Fair pricing attracts more clients and builds long-term relationships.',
      tips: [
        'Research what similar professionals charge',
        'Be transparent about all costs upfront',
        'Offer package deals for repeat clients',
        'Don\'t undervalue your expertise',
      ],
    },
    {
      id: 5,
      icon: '👤',
      title: 'Optimize Your Profile',
      description: 'A complete, professional profile builds trust and credibility.',
      tips: [
        'Add a clear, professional profile photo',
        'Write a detailed bio highlighting experience',
        'List all your certifications and skills',
        'Keep your availability calendar updated',
      ],
    },
    {
      id: 6,
      icon: '🛠️',
      title: 'Showcase Your Expertise',
      description: 'Demonstrate your knowledge and professionalism in every interaction.',
      tips: [
        'Provide detailed service descriptions',
        'Explain your process to clients',
        'Offer professional advice when needed',
        'Share tips on maintenance after service',
      ],
    },
    {
      id: 7,
      icon: '📅',
      title: 'Stay Organized',
      description: 'Reliable scheduling and punctuality set you apart from competitors.',
      tips: [
        'Keep your schedule up to date',
        'Always arrive on time for appointments',
        'Send confirmation messages before jobs',
        'Communicate proactively if delays occur',
      ],
    },
    {
      id: 8,
      icon: '🤝',
      title: 'Professionalism Matters',
      description: 'How you present yourself affects your success on the platform.',
      tips: [
        'Communicate clearly and politely',
        'Dress appropriately for the job',
        'Respect client property and privacy',
        'Follow through on all commitments',
      ],
    },
  ];

  const renderTipCard = (tip) => (
    <View key={tip.id} style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <Text style={styles.tipIcon}>{tip.icon}</Text>
        <Text style={styles.tipTitle}>{tip.title}</Text>
      </View>
      <Text style={styles.tipDescription}>{tip.description}</Text>
      <View style={styles.tipsList}>
        {tip.tips.map((item, index) => (
          <View key={index} style={styles.tipItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.tipText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tips & Tricks</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro Section */}
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Grow Your Business</Text>
          <Text style={styles.introText}>
            Follow these proven strategies to attract more clients, earn better reviews, and build a thriving business on Fixxa.
          </Text>
        </View>

        {/* Tips Cards */}
        {tips.map(renderTipCard)}

        {/* Footer Note */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            💡 Pro Tip: Professionals who follow these tips earn 60% more and receive 2x more bookings than those who don't.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
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
    paddingBottom: SIZES.padding * 1.5,
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
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  introSection: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding * 1.5,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  introTitle: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  introText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  tipCard: {
    backgroundColor: COLORS.white,
    padding: SIZES.padding * 1.5,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  tipTitle: {
    flex: 1,
    fontSize: SIZES.lg,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  tipDescription: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    marginRight: 8,
    marginTop: 2,
    ...FONTS.bold,
  },
  tipText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  footerSection: {
    backgroundColor: '#e8f5e9',
    padding: SIZES.padding * 1.5,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  footerText: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default WorkerTipsScreen;
