import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';

const FAQScreen = ({ navigation }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const faqs = [
    {
      question: 'How do I book a service?',
      answer: 'Tap "Find a Professional" on the home screen, browse or search for the service you need, select a professional, and follow the booking process.',
    },
    {
      question: 'Are the professionals verified?',
      answer: 'Yes! All professionals on Fixxa go through a verification process including ID verification, skills assessment, and background checks.',
    },
    {
      question: 'How do payments work?',
      answer: 'You can pay securely through the app using credit/debit cards or other payment methods. Payments are processed only after you confirm the service.',
    },
    {
      question: 'Can I cancel a booking?',
      answer: 'Yes, you can cancel a booking before it starts. Cancellation policies may vary, so please check the specific terms when booking.',
    },
    {
      question: 'How do I leave a review?',
      answer: 'After a service is completed, you can leave a review and rating through the Bookings or Reviews section of the app.',
    },
    {
      question: 'What if I have an issue with a service?',
      answer: 'Contact our support team through the app or email info@fixxa.co.za. We\'re here to help resolve any issues.',
    },
  ];

  const toggleFAQ = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
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
        <Text style={styles.headerTitle}>FAQ</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.title}>Frequently Asked Questions</Text>
          <Text style={styles.subtitle}>
            Find answers to common questions about Fixxa
          </Text>
        </View>

        {faqs.map((faq, index) => (
          <TouchableOpacity
            key={index}
            style={styles.faqCard}
            onPress={() => toggleFAQ(index)}
          >
            <View style={styles.faqHeader}>
              <Text style={styles.question}>{faq.question}</Text>
              <Text style={styles.arrow}>
                {expandedIndex === index ? '▼' : '▶'}
              </Text>
            </View>
            {expandedIndex === index && (
              <Text style={styles.answer}>{faq.answer}</Text>
            )}
          </TouchableOpacity>
        ))}
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
  intro: {
    marginBottom: 20,
  },
  title: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
  },
  faqCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.padding,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    flex: 1,
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
    marginRight: 12,
  },
  arrow: {
    fontSize: 12,
    color: COLORS.primary,
  },
  answer: {
    marginTop: 12,
    fontSize: SIZES.sm,
    ...FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default FAQScreen;
