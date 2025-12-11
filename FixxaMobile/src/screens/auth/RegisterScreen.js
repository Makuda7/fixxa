import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';

export default function RegisterScreen({ navigation }) {
  const [userType, setUserType] = useState('client'); // 'client' or 'worker'
  const [loading, setLoading] = useState(false);

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');

  // Worker-specific fields
  const [suburb, setSuburb] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [experience, setExperience] = useState('');

  // Terms and referral
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [referralSource, setReferralSource] = useState('');

  const specialties = [
    'Plumber',
    'Electrician',
    'Carpenter',
    'Painter',
    'Gardener',
    'Cleaner',
    'Handyman',
    'Mechanic',
    'Appliance Repair',
    'Other',
  ];

  const referralSources = [
    'Google Search',
    'Social Media',
    'Friend/Family',
    'Advertisement',
    'Other',
  ];

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }

    if (!city.trim()) {
      Alert.alert('Validation Error', 'Please enter your city');
      return false;
    }

    if (userType === 'worker') {
      if (!suburb.trim()) {
        Alert.alert('Validation Error', 'Please enter your suburb');
        return false;
      }

      if (!specialty) {
        Alert.alert('Validation Error', 'Please select your specialty');
        return false;
      }

      if (!experience.trim()) {
        Alert.alert('Validation Error', 'Please enter your years of experience');
        return false;
      }

      const expNum = parseInt(experience);
      if (isNaN(expNum) || expNum < 0 || expNum > 99) {
        Alert.alert('Validation Error', 'Please enter a valid number of years (0-99)');
        return false;
      }
    }

    if (!password) {
      Alert.alert('Validation Error', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }

    if (!acceptTerms) {
      Alert.alert('Validation Error', 'Please accept the Terms of Service');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        type: userType,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        city: city.trim(),
        password,
        acceptTerms,
        referralSource: referralSource || 'Not specified',
      };

      // Add worker-specific fields
      if (userType === 'worker') {
        registrationData.suburb = suburb.trim();
        registrationData.speciality = specialty; // Note: backend uses 'speciality'
        registrationData.experience = experience.trim();
      }

      console.log('Submitting registration:', { ...registrationData, password: '[HIDDEN]' });

      const response = await api.post('/register', registrationData);

      console.log('Registration response:', response.data);

      if (response.data.success) {
        if (response.data.requiresVerification) {
          // Navigate to verification pending screen
          navigation.navigate('VerificationPending', {
            email: registrationData.email
          });
        } else {
          // Direct to login if no verification required
          Alert.alert(
            'Registration Successful!',
            'Your account has been created. You can now log in.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('Login'),
              },
            ]
          );
        }
      } else {
        Alert.alert('Registration Failed', response.data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        'Registration failed. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Fixxa today</Text>
        </View>

        {/* User Type Toggle */}
        <View style={styles.typeToggleContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              userType === 'client' && styles.typeButtonActive,
            ]}
            onPress={() => setUserType('client')}
          >
            <Text
              style={[
                styles.typeButtonText,
                userType === 'client' && styles.typeButtonTextActive,
              ]}
            >
              Client
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              userType === 'worker' && styles.typeButtonActive,
            ]}
            onPress={() => setUserType('worker')}
          >
            <Text
              style={[
                styles.typeButtonText,
                userType === 'worker' && styles.typeButtonTextActive,
              ]}
            >
              Professional
            </Text>
          </TouchableOpacity>
        </View>

        {/* Common Fields */}
        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="0XX XXX XXXX"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Enter your city"
            autoCapitalize="words"
          />

          {/* Worker-Specific Fields */}
          {userType === 'worker' && (
            <>
              <Text style={styles.label}>Suburb *</Text>
              <TextInput
                style={styles.input}
                value={suburb}
                onChangeText={setSuburb}
                placeholder="Enter your suburb"
                autoCapitalize="words"
              />

              <Text style={styles.label}>Specialty *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={specialty}
                  onValueChange={(itemValue) => setSpecialty(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select your specialty..." value="" />
                  {specialties.map((spec) => (
                    <Picker.Item key={spec} label={spec} value={spec} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Years of Experience *</Text>
              <TextInput
                style={styles.input}
                value={experience}
                onChangeText={setExperience}
                placeholder="e.g., 5"
                keyboardType="numeric"
              />
            </>
          )}

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 6 characters"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>How did you hear about us?</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={referralSource}
              onValueChange={(itemValue) => setReferralSource(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Select an option..." value="" />
              {referralSources.map((source) => (
                <Picker.Item key={source} label={source} value={source} />
              ))}
            </Picker>
          </View>

          {/* Terms Acceptance */}
          <View style={styles.termsContainer}>
            <Switch
              value={acceptTerms}
              onValueChange={setAcceptTerms}
              trackColor={{ false: '#767577', true: '#90EE90' }}
              thumbColor={acceptTerms ? 'forestgreen' : '#f4f3f4'}
            />
            <View style={styles.termsTextContainer}>
              <Text style={styles.termsText}>I accept the </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
                <Text style={styles.termsLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}>, </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Privacy')}>
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}>, and </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Safety')}>
                <Text style={styles.termsLink}>Safety Guidelines</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  typeToggleContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'forestgreen',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'forestgreen',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'forestgreen',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 10,
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 10,
    paddingTop: Platform.OS === 'ios' ? 0 : 5,
  },
  termsText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  termsLink: {
    fontSize: 14,
    color: 'forestgreen',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: 'forestgreen',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  loginLink: {
    fontSize: 14,
    color: 'forestgreen',
    fontWeight: '600',
  },
});
