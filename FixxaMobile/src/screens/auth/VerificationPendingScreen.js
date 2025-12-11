import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const VerificationPendingScreen = ({ navigation, route }) => {
  const { email } = route.params || {};
  const [loading, setLoading] = useState(false);

  const handleResendVerification = async () => {
    if (!email) {
      Alert.alert('Error', 'Email address not found');
      return;
    }

    setLoading(true);

    try {
      console.log('Resending verification email to:', email);
      const response = await api.post('/resend-verification', { email });

      console.log('Resend verification response:', response.data);

      if (response.data.success) {
        Alert.alert(
          'Email Sent!',
          'A new verification email has been sent. Please check your inbox.'
        );
      } else {
        Alert.alert('Error', response.data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      console.error('Resend verification error:', err);
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Failed to resend verification email. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <Text style={styles.icon}>📧</Text>

        {/* Title */}
        <Text style={styles.title}>Verify Your Email</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          We've sent a verification email to:
        </Text>

        {/* Email */}
        <Text style={styles.email}>{email || 'your email address'}</Text>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Please check your inbox and click the verification link to activate your account.
          </Text>
          <Text style={styles.instructionText}>
            Don't forget to check your spam folder if you don't see it.
          </Text>
        </View>

        {/* Resend Button */}
        <TouchableOpacity
          style={[styles.resendButton, loading && styles.buttonDisabled]}
          onPress={handleResendVerification}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.resendButtonText}>Resend Verification Email</Text>
          )}
        </TouchableOpacity>

        {/* Back to Login */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            You won't be able to log in until your email is verified.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    color: 'forestgreen',
    marginBottom: 30,
    textAlign: 'center',
  },
  instructions: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  instructionText: {
    fontSize: 15,
    color: '#2c3e50',
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'center',
  },
  resendButton: {
    backgroundColor: 'forestgreen',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  resendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 12,
    marginBottom: 20,
  },
  backButtonText: {
    color: 'forestgreen',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
    width: '100%',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});

export default VerificationPendingScreen;
