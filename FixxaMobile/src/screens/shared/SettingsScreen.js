import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import BurgerMenu from '../../components/BurgerMenu';
import ProfileButton from '../../components/ProfileButton';

const SettingsScreen = ({ navigation }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  const settingsSections = [
    {
      title: 'Notifications',
      items: [
        {
          label: 'Push Notifications',
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled,
        },
        {
          label: 'Email Notifications',
          value: emailNotifications,
          onValueChange: setEmailNotifications,
        },
        {
          label: 'SMS Notifications',
          value: smsNotifications,
          onValueChange: setSmsNotifications,
        },
      ],
    },
  ];

  const renderSettingItem = (item, index) => (
    <View key={index} style={styles.settingItem}>
      <Text style={styles.settingLabel}>{item.label}</Text>
      <Switch
        value={item.value}
        onValueChange={item.onValueChange}
        trackColor={{ false: '#d0d0d0', true: COLORS.primary }}
        thumbColor={Platform.OS === 'ios' ? COLORS.white : item.value ? COLORS.primary : '#f4f3f4'}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BurgerMenu navigation={navigation} />
        <Text style={styles.headerTitle}>Settings</Text>
        <ProfileButton navigation={navigation} />
      </View>

      <ScrollView style={styles.content}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                // Navigate to change password screen
              }}
            >
              <Text style={styles.actionIcon}>🔑</Text>
              <Text style={styles.actionText}>Change Password</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                // Navigate to delete account screen
              }}
            >
              <Text style={styles.actionIcon}>⚠️</Text>
              <Text style={[styles.actionText, { color: COLORS.error }]}>
                Delete Account
              </Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.card}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
            </View>
          </View>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textPrimary,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textPrimary,
  },
  actionArrow: {
    fontSize: 24,
    color: COLORS.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding,
  },
  infoLabel: {
    fontSize: SIZES.sm,
    ...FONTS.medium,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: SIZES.sm,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
});

export default SettingsScreen;
