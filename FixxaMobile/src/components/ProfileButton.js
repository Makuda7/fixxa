import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../styles/theme';

const ProfileButton = ({ navigation }) => {
  const { user } = useAuth();

  const getInitials = () => {
    if (!user?.name) return '?';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  return (
    <TouchableOpacity
      style={styles.profileButton}
      onPress={() => navigation.navigate('Profile')}
    >
      <Text style={styles.initials}>{getInitials()}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  initials: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileButton;
