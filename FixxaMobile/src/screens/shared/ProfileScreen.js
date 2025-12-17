import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../styles/theme';
import { formatPhoneNumber, formatDate } from '../../utils/formatting';
import BurgerMenu from '../../components/BurgerMenu';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const ProfileItem = ({ icon, label, value }) => (
    <View style={styles.profileItem}>
      <Text style={styles.itemIcon}>{icon}</Text>
      <View style={styles.itemContent}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemValue}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );

  const MenuButton = ({ icon, title, onPress, danger }) => (
    <TouchableOpacity
      style={styles.menuButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>
        {title}
      </Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar with Burger Menu */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Profile</Text>
        <BurgerMenu navigation={navigation} />
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {user?.profile_picture ? (
              <Image
                source={{ uri: user.profile_picture }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userType}>
            {user?.type === 'client' ? 'Client Account' :
             user?.type === 'worker' ? 'Worker Account' :
             user?.type === 'admin' ? 'Admin Account' : 'User'}
          </Text>
        </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <View style={styles.card}>
          <ProfileItem icon="👤" label="Name" value={user?.name} />
          <ProfileItem icon="📧" label="Email" value={user?.email} />
          <ProfileItem
            icon="📱"
            label="Phone"
            value={user?.phone ? formatPhoneNumber(user.phone) : null}
          />
          <ProfileItem icon="📍" label="Location" value={user?.location} />
          <ProfileItem
            icon="📅"
            label="Member Since"
            value={user?.registeredAt ? formatDate(user.registeredAt) : null}
          />
        </View>
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.card}>
          <MenuButton
            icon="✏️"
            title="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <MenuButton
            icon="🔒"
            title="Change Password"
            onPress={() => Alert.alert('Coming Soon', 'Change password feature coming soon!')}
          />
          <MenuButton
            icon="🔔"
            title="Notifications"
            onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon!')}
          />
        </View>
      </View>

      {/* Help & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help & Support</Text>
        <View style={styles.card}>
          <MenuButton
            icon="🆘"
            title="Contact Support"
            onPress={() => navigation.navigate('Support')}
          />
          <MenuButton
            icon="❓"
            title="Help Center"
            onPress={() => navigation.navigate('FAQ')}
          />
          <MenuButton
            icon="📄"
            title="Terms & Conditions"
            onPress={() => navigation.navigate('Terms')}
          />
          <MenuButton
            icon="🔒"
            title="Privacy Policy"
            onPress={() => navigation.navigate('Privacy')}
          />
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Fixxa Mobile v1.0.0</Text>
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
  scrollContent: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.padding * 2,
    alignItems: 'center',
    paddingBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    ...FONTS.bold,
    color: COLORS.primary,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userName: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 4,
  },
  userType: {
    fontSize: SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    ...FONTS.semiBold,
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  profileItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  itemValue: {
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  menuTitleDanger: {
    color: COLORS.error,
  },
  menuArrow: {
    fontSize: 24,
    color: COLORS.textLight,
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
  versionContainer: {
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  versionText: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
});

export default ProfileScreen;
