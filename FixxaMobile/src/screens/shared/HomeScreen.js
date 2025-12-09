import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONTS, SIZES } from '../../styles/theme';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🔧</Text>
        <Text style={styles.title}>Fixxa</Text>
        <Text style={styles.subtitle}>Welcome, {user?.name || 'User'}!</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.greeting}>
          You're logged in as a {user?.type || 'user'}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    padding: SIZES.padding * 2,
    paddingTop: 60,
    alignItems: 'center',
  },
  logo: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: SIZES.xxxl,
    ...FONTS.bold,
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: SIZES.padding * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: SIZES.lg,
    color: COLORS.textPrimary,
    ...FONTS.medium,
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: COLORS.error,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.md,
    ...FONTS.bold,
  },
});

export default HomeScreen;
