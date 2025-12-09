# React Native Migration Guide - Fixxa App

## Overview
Step-by-step guide to migrate your Fixxa React web app to React Native mobile apps (iOS & Android).

**Target**: Complete native mobile apps with all current features
**Approach**: Expo (managed workflow) for easier development
**Timeline**: 8-12 weeks for full migration
**Code Reuse**: ~65% of business logic

---

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Project Structure](#project-structure)
3. [Shared Code Migration](#shared-code-migration)
4. [Component-by-Component Migration](#component-by-component-migration)
5. [Navigation Setup](#navigation-setup)
6. [Mobile-Specific Features](#mobile-specific-features)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Guide](#deployment-guide)

---

## Initial Setup

### 1. Install Prerequisites

```bash
# Install Node.js (you already have this)
# Install Expo CLI globally
npm install -g expo-cli

# Install iOS Simulator (Mac only)
# Download Xcode from App Store
xcode-select --install

# Install Android Studio
# Download from https://developer.android.com/studio
```

### 2. Create Expo Project

```bash
# Create new Expo app
npx create-expo-app FixxaMobile
cd FixxaMobile

# Install essential dependencies
npx expo install react-native-safe-area-context
npx expo install @react-navigation/native
npx expo install @react-navigation/native-stack
npx expo install @react-navigation/bottom-tabs
npx expo install @react-native-async-storage/async-storage
npx expo install axios
npx expo install expo-image-picker
npx expo install expo-camera
npx expo install expo-notifications
npx expo install expo-location
npx expo install react-native-maps
npx expo install expo-secure-store
```

### 3. Project Structure

```
FixxaMobile/
├── App.js                          # Entry point
├── app.json                        # Expo configuration
├── package.json
├── src/
│   ├── components/                 # Reusable components
│   │   ├── BookingCard.js
│   │   ├── ReviewCard.js
│   │   ├── StarRating.js
│   │   ├── Toast.js
│   │   └── LoadingSpinner.js
│   ├── screens/                    # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── client/
│   │   │   ├── ClientDashboardScreen.js
│   │   │   ├── BookingDetailsScreen.js
│   │   │   └── ReviewsScreen.js
│   │   ├── worker/
│   │   │   └── WorkerDashboardScreen.js
│   │   ├── admin/
│   │   │   └── AdminDashboardScreen.js
│   │   └── shared/
│   │       ├── HomeScreen.js
│   │       ├── ProfileScreen.js
│   │       └── MessagesScreen.js
│   ├── navigation/                 # Navigation setup
│   │   ├── AppNavigator.js
│   │   ├── AuthNavigator.js
│   │   └── ClientNavigator.js
│   ├── contexts/                   # React Context (reusable!)
│   │   └── AuthContext.js
│   ├── services/                   # API services (reusable!)
│   │   └── api.js
│   ├── utils/                      # Utilities (reusable!)
│   │   ├── validation.js
│   │   ├── formatting.js
│   │   └── constants.js
│   └── styles/                     # Shared styles
│       ├── colors.js
│       └── typography.js
└── assets/
    ├── images/
    └── fonts/
```

---

## Shared Code Migration

### 1. API Service (95% Reusable!)

**Web Version** (`services/api.js`):
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://fixxa.co.za',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

**Mobile Version** (`src/services/api.js`):
```javascript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'https://fixxa.co.za',
  headers: { 'Content-Type': 'application/json' }
  // Note: No withCredentials needed - use token auth
});

api.interceptors.request.use(async (config) => {
  // Replace localStorage with AsyncStorage
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear and redirect to login
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      // Navigation will be handled by AuthContext
    }
    return Promise.reject(error);
  }
);

export default api;
```

**Changes Made**:
- ✅ `localStorage` → `AsyncStorage` (async/await)
- ✅ Removed `withCredentials` (use token auth instead)
- ✅ Added proper error handling

### 2. AuthContext (90% Reusable!)

**Web Version** (`contexts/AuthContext.js`):
```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/check-session');
      if (response.data.authenticated) {
        setUser(response.data.user);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/login', { email, password });
    if (response.data.success) {
      setUser(response.data.user);
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  };

  const logout = async () => {
    await api.post('/logout');
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**Mobile Version** (`src/contexts/AuthContext.js`):
```javascript
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check for stored token
      const token = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));

        // Verify token is still valid
        const response = await api.get('/check-session');
        if (response.data.authenticated) {
          setUser(response.data.user);
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        } else {
          // Token invalid - clear storage
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      if (response.data.success) {
        const userData = response.data.user;
        const token = response.data.token;

        setUser(userData);

        // Store both token and user data
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      }
      return response.data;
    } catch (err) {
      console.error('Login failed:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setUser(null);
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/register', userData);
      if (response.data.success && response.data.token) {
        await login(userData.email, userData.password);
      }
      return response.data;
    } catch (err) {
      console.error('Registration failed:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      register,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**Changes Made**:
- ✅ `localStorage` → `AsyncStorage` (with JSON parse/stringify)
- ✅ Added token validation check
- ✅ Store user data locally for offline access
- ✅ Added `register` function
- ✅ Better error handling

### 3. Utility Functions (100% Reusable!)

**Date Formatting** (`src/utils/formatting.js`):
```javascript
// Same code works in both web and mobile!
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatCurrency = (amount) => {
  return `R ${parseFloat(amount).toFixed(2)}`;
};

export const formatPhoneNumber = (phone) => {
  // Format: 012 345 6789
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
};
```

**Validation Functions** (`src/utils/validation.js`):
```javascript
// Same code works in both!
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password && password.length >= 8;
};

export const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

export const validateSAIDNumber = (idNumber) => {
  if (!idNumber || idNumber.length !== 13) return false;
  return /^\d{13}$/.test(idNumber);
};
```

**Constants** (`src/utils/constants.js`):
```javascript
// Same code works in both!
export const BOOKING_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const USER_TYPES = {
  CLIENT: 'client',
  PROFESSIONAL: 'professional',
  ADMIN: 'admin'
};

export const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape'
];
```

---

## Component-by-Component Migration

### Component 1: Login Screen

**Web Version** (`pages/Login.js` - simplified):
```jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(result.redirect || '/client-dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1>Fixxa</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <Link to="/register">Sign up</Link>
    </div>
  );
};

export default Login;
```

**Mobile Version** (`src/screens/auth/LoginScreen.js`):
```jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/validation';
import { COLORS, FONTS } from '../../styles/theme';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        // Navigation handled by App.js based on user type
        // No need to manually navigate
      } else {
        setError(result.error || 'Incorrect email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Fixxa</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Text style={styles.toggleIcon}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
          >
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            disabled={loading}
          >
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'forestgreen',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    borderLeftWidth: 4,
    borderLeftColor: '#c00',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#c00',
    fontSize: 14,
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  toggleButton: {
    padding: 14,
  },
  toggleIcon: {
    fontSize: 20,
  },
  forgotPassword: {
    color: 'forestgreen',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: 24,
  },
  button: {
    backgroundColor: 'forestgreen',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signupText: {
    fontSize: 14,
    color: '#666',
  },
  signupLink: {
    fontSize: 14,
    color: 'forestgreen',
    fontWeight: '600',
  },
});

export default LoginScreen;
```

**Key Changes**:
1. ✅ `div` → `View`
2. ✅ `input` → `TextInput`
3. ✅ `button` → `TouchableOpacity`
4. ✅ CSS classes → StyleSheet
5. ✅ `Link` → `navigation.navigate()`
6. ✅ Added `KeyboardAvoidingView` for better mobile UX
7. ✅ Added `ScrollView` for scroll support
8. ✅ Added `ActivityIndicator` for loading state
9. ✅ Added email validation
10. ✅ Better accessibility with proper labels

---

### Component 2: Booking Card

**Web Version** (`components/BookingCard.js` - from ClientDashboard):
```jsx
// Inside ClientDashboard.js
<div className="booking-card" key={booking.id}>
  <div className="booking-header">
    <h3>{booking.service_type}</h3>
    <span className={`status-badge ${booking.status}`}>
      {booking.status}
    </span>
  </div>
  <div className="booking-details">
    <p><strong>Professional:</strong> {booking.worker_name}</p>
    <p><strong>Date:</strong> {formatDate(booking.scheduled_date)}</p>
    <p><strong>Time:</strong> {booking.scheduled_time}</p>
  </div>
  <button
    className="btn-primary"
    onClick={() => handleOpenBookingDetails(booking)}
  >
    View Details
  </button>
</div>
```

**Mobile Version** (`src/components/BookingCard.js`):
```jsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { formatDate } from '../utils/formatting';

const BookingCard = ({ booking, onPress }) => {
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return { bg: '#fff3cd', text: '#856404', border: '#ffc107' };
      case 'confirmed':
        return { bg: '#d4edda', text: '#155724', border: '#28a745' };
      case 'in-progress':
        return { bg: '#cfe2ff', text: '#084298', border: '#0d6efd' };
      case 'completed':
        return { bg: '#d1ecf1', text: '#0c5460', border: '#17a2b8' };
      case 'cancelled':
        return { bg: '#f8d7da', text: '#721c24', border: '#dc3545' };
      default:
        return { bg: '#e2e3e5', text: '#383d41', border: '#6c757d' };
    }
  };

  const statusColors = getStatusColor(booking.status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(booking)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {booking.service_type}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusColors.bg,
              borderColor: statusColors.border,
            }
          ]}
        >
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {booking.status}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Professional:</Text>
          <Text style={styles.detailValue} numberOfLines={1}>
            {booking.worker_name}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {formatDate(booking.scheduled_date)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>
            {booking.scheduled_time}
          </Text>
        </View>
      </View>

      {/* Address Alert */}
      {(booking.status === 'confirmed' && !booking.service_address) && (
        <View style={styles.addressAlert}>
          <Text style={styles.addressAlertIcon}>📍</Text>
          <Text style={styles.addressAlertText}>
            Service address required
          </Text>
        </View>
      )}

      {/* Quote Display */}
      {booking.quote && (
        <View
          style={[
            styles.quoteContainer,
            {
              backgroundColor: booking.quote.status === 'pending'
                ? '#e3f2fd'
                : booking.quote.status === 'accepted'
                ? '#d4edda'
                : '#f8d7da',
            }
          ]}
        >
          <Text style={styles.quoteTitle}>
            💰 Quote {booking.quote.status === 'accepted' ? 'Accepted' : 'Received'}
          </Text>
          <Text style={styles.quoteAmount}>
            R {parseFloat(booking.quote.total_amount).toFixed(2)}
          </Text>
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity style={styles.button} onPress={() => onPress(booking)}>
        <Text style={styles.buttonText}>View Details</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android shadow
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: 'forestgreen',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontWeight: '600',
    color: '#333',
    width: 100,
  },
  detailValue: {
    flex: 1,
    color: '#666',
  },
  addressAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    borderWidth: 1,
    borderColor: '#ffc107',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  addressAlertIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  addressAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
  },
  quoteContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  quoteTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  quoteAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  button: {
    backgroundColor: 'forestgreen',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BookingCard;
```

**Key Changes**:
1. ✅ Extracted to reusable component
2. ✅ Used `StyleSheet` for styling
3. ✅ Added proper shadows (iOS + Android)
4. ✅ `activeOpacity` for touch feedback
5. ✅ `numberOfLines` for text truncation
6. ✅ Dynamic status colors
7. ✅ Better spacing and layout

---

### Component 3: Star Rating

**Web Version** (from ClientDashboard):
```jsx
// Inline rating display
<div className="rating">
  {[1, 2, 3, 4, 5].map((star) => (
    <span
      key={star}
      className={star <= rating ? 'star active' : 'star'}
    >
      ★
    </span>
  ))}
</div>
```

**Mobile Version** (`src/components/StarRating.js`):
```jsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const StarRating = ({
  rating = 0,
  maxStars = 5,
  size = 24,
  color = '#ffc107',
  editable = false,
  onRatingChange,
}) => {
  const handlePress = (value) => {
    if (editable && onRatingChange) {
      onRatingChange(value);
    }
  };

  const renderStar = (position) => {
    const filled = position <= rating;

    if (editable) {
      return (
        <TouchableOpacity
          key={position}
          onPress={() => handlePress(position)}
          style={styles.starButton}
        >
          <Text style={[styles.star, { fontSize: size, color: filled ? color : '#ddd' }]}>
            ★
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text
        key={position}
        style={[styles.star, { fontSize: size, color: filled ? color : '#ddd' }]}
      >
        ★
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, i) => renderStar(i + 1))}
      {rating > 0 && (
        <Text style={styles.ratingText}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    marginRight: 2,
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});

export default StarRating;
```

**Usage**:
```jsx
// Display only
<StarRating rating={4.5} />

// Editable
<StarRating
  rating={formData.quality_rating}
  editable={true}
  onRatingChange={(value) => setFormData({
    ...formData,
    quality_rating: value
  })}
  size={32}
/>
```

---

### Component 4: Client Dashboard Screen

This is the biggest conversion. I'll show the structure:

**Mobile Version** (`src/screens/client/ClientDashboardScreen.js`):
```jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import BookingCard from '../../components/BookingCard';
import Toast from '../../components/Toast';

const ClientDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchBookings(),
        fetchReviews(),
      ]);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      showToast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings/my-bookings');
      setBookings(response.data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews/my-reviews');
      setReviews(response.data.reviews || []);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    }
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type }]);
  };

  const handleBookingPress = (booking) => {
    navigation.navigate('BookingDetails', { booking });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="forestgreen" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="forestgreen"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Welcome back, {user?.name || 'Client'}!
          </Text>
          <Text style={styles.subtitle}>
            Manage your bookings and reviews
          </Text>
        </View>

        {/* Active Bookings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Bookings</Text>
          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No bookings yet</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.emptyButtonText}>Find Services</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onPress={handleBookingPress}
              />
            ))
          )}
        </View>

        {/* Recent Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Reviews')}
            >
              <Text style={styles.seeAllText}>See all →</Text>
            </TouchableOpacity>
          </View>
          {reviews.slice(0, 3).map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <Text style={styles.reviewWorker}>{review.worker_name}</Text>
              <StarRating rating={review.overall_rating} />
              <Text style={styles.reviewText} numberOfLines={2}>
                {review.review_text}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToasts(toasts.filter(t => t.id !== toast.id))}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'forestgreen',
    padding: 24,
    paddingTop: 60, // Account for status bar
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: 'forestgreen',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: 'forestgreen',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reviewWorker: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default ClientDashboardScreen;
```

**Key Features**:
1. ✅ Pull-to-refresh (native mobile gesture)
2. ✅ Loading states
3. ✅ Empty states
4. ✅ Navigation integration
5. ✅ Reusable components
6. ✅ Safe area handling
7. ✅ ScrollView for content

---

## Continue in Part 2?

This is getting very long! Should I continue with:

1. **Navigation Setup** - Complete navigation structure
2. **Photo Upload** - Mobile camera/gallery integration
3. **Push Notifications** - Real-time alerts
4. **Offline Mode** - AsyncStorage caching
5. **Build & Deploy** - App store submission

Or would you like me to focus on a specific component/feature next? Let me know! 🚀
