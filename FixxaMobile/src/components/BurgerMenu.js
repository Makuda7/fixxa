import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS, FONTS, SIZES, SHADOWS } from '../styles/theme';

const BurgerMenu = ({ navigation }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    if (isMenuOpen) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isMenuOpen]);

  const menuItems = [
    {
      id: 'profile',
      title: 'Profile',
      icon: '👤',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('Profile');
      },
    },
    {
      id: 'reviews',
      title: 'Reviews',
      icon: '⭐',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('Reviews');
      },
    },
    {
      id: 'services',
      title: 'Browse Services',
      icon: '🛠️',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('Services');
      },
    },
    { id: 'divider1', isDivider: true },
    {
      id: 'about',
      title: 'About Us',
      icon: 'ℹ️',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('About');
      },
    },
    {
      id: 'contact',
      title: 'Contact Us',
      icon: '📧',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('Contact');
      },
    },
    {
      id: 'faq',
      title: 'FAQ',
      icon: '❓',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('FAQ');
      },
    },
    {
      id: 'terms',
      title: 'Terms & Conditions',
      icon: '📄',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('Terms');
      },
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: '🔒',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('Privacy');
      },
    },
    {
      id: 'safety',
      title: 'Safety & Security',
      icon: '🛡️',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('Safety');
      },
    },
    {
      id: 'join',
      title: 'Join as a Professional',
      icon: '👷',
      onPress: () => {
        setIsMenuOpen(false);
        navigation.navigate('JoinPro');
      },
    },
    { id: 'divider2', isDivider: true },
    {
      id: 'logout',
      title: 'Logout',
      icon: '🚪',
      onPress: async () => {
        setIsMenuOpen(false);
        await logout();
      },
    },
  ];

  const renderMenuItem = (item) => {
    if (item.isDivider) {
      return <View key={item.id} style={styles.divider} />;
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.menuItem,
          item.id === 'logout' && styles.logoutItem,
        ]}
        onPress={item.onPress}
      >
        <Text style={styles.menuIcon}>{item.icon}</Text>
        <Text
          style={[
            styles.menuText,
            item.id === 'logout' && styles.logoutText,
          ]}
        >
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Burger Menu Button */}
      <TouchableOpacity
        style={styles.burgerButton}
        onPress={() => setIsMenuOpen(true)}
      >
        <View style={styles.burgerLine} />
        <View style={styles.burgerLine} />
        <View style={styles.burgerLine} />
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={isMenuOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
        >
          <Animated.View
            style={[
              styles.menuContainer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuTitle}>Menu</Text>
                {user && (
                  <Text style={styles.userName}>
                    Hello, {user.name || 'User'}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsMenuOpen(false)}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <ScrollView style={styles.menuList}>
              {menuItems.map(renderMenuItem)}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  burgerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.padding,
  },
  burgerLine: {
    width: 24,
    height: 3,
    backgroundColor: COLORS.white,
    marginVertical: 2,
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  menuContainer: {
    backgroundColor: COLORS.white,
    width: '80%',
    height: '100%',
    ...SHADOWS.large,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding * 1.5,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuTitle: {
    fontSize: SIZES.xxl,
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  userName: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
  },
  closeIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding * 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuText: {
    fontSize: SIZES.md,
    ...FONTS.medium,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 8,
    backgroundColor: COLORS.background,
  },
  logoutItem: {
    backgroundColor: '#fff5f5',
  },
  logoutText: {
    color: COLORS.error,
    ...FONTS.semiBold,
  },
});

export default BurgerMenu;
