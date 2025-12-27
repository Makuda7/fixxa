import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState } from 'react-native';
import api from '../services/api';
import activityTracker from '../utils/activityTracker';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount (only once)
  useEffect(() => {
    checkAuth();
  }, []);

  // Track app state changes for activity monitoring
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && user) {
        // User brought app to foreground - record activity
        activityTracker.recordActivity();
      }
    });

    return () => {
      appStateSubscription?.remove();
    };
  }, [user]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (token && storedUser) {
        let parsedUser = JSON.parse(storedUser);

        // Normalize user type: backend uses 'professional' but mobile app uses 'worker'
        if (parsedUser.type === 'professional') {
          parsedUser = { ...parsedUser, type: 'worker' };
        }

        setUser(parsedUser);

        // Verify token is still valid
        try {
          const response = await api.get('/check-session');
          if (response.data.authenticated) {
            let userData = response.data.user;

            // Normalize user type: backend uses 'professional' but mobile app uses 'worker'
            if (userData.type === 'professional') {
              userData = { ...userData, type: 'worker' };
            }

            setUser(userData);
            await AsyncStorage.setItem('user', JSON.stringify(userData));

            // Start activity tracking for existing logged-in users
            activityTracker.start(handleInactivityLogout, 30);
          } else {
            // Token invalid - clear storage
            await AsyncStorage.multiRemove(['authToken', 'user']);
            setUser(null);
          }
        } catch (err) {
          console.error('Token verification failed:', err);
          await AsyncStorage.multiRemove(['authToken', 'user']);
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInactivityLogout = async () => {
    console.log('Auto-logout triggered due to inactivity');
    Alert.alert(
      'Session Expired',
      'You have been logged out due to inactivity. Please log in again.',
      [
        {
          text: 'OK',
          onPress: () => logout(),
        },
      ]
    );
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      console.log('API Base URL:', api.defaults.baseURL);
      const response = await api.post('/login', { email, password });

      console.log('Login response status:', response.status);
      console.log('Login response:', response.data);
      console.log('Response keys:', Object.keys(response.data));
      console.log('Success field:', response.data.success);

      if (response.data.success) {
        let userData = response.data.user;
        const token = response.data.token;

        console.log('User data received:', userData);
        console.log('User type:', userData?.type);
        console.log('Token received:', token ? 'YES' : 'NO');

        // Normalize user type: backend uses 'professional' but mobile app uses 'worker'
        if (userData.type === 'professional') {
          userData = { ...userData, type: 'worker' };
          console.log('Normalized type from "professional" to "worker"');
        }

        setUser(userData);

        // Store both token and user data (only if token exists)
        if (token) {
          await AsyncStorage.setItem('authToken', token);
        } else {
          console.warn('No token received from login response');
        }

        await AsyncStorage.setItem('user', JSON.stringify(userData));

        // Start activity tracking for auto-logout (30 minutes of inactivity)
        activityTracker.start(handleInactivityLogout, 30);

        return response.data;
      }

      console.log('Login was not successful:', response.data);
      return response.data;
    } catch (err) {
      console.error('=== LOGIN ERROR DEBUG ===');
      console.error('Error message:', err.message);
      console.error('Error response status:', err.response?.status);
      console.error('Error response data:', JSON.stringify(err.response?.data, null, 2));
      console.error('Error config URL:', err.config?.url);
      console.error('Error config baseURL:', err.config?.baseURL);
      console.error('========================');
      return {
        success: false,
        error: err.response?.data?.error || err.message || 'Login failed. Please try again.'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/register', userData);

      if (response.data.success) {
        // If registration returns a token, log the user in
        if (response.data.token) {
          const user = response.data.user;
          const token = response.data.token;

          setUser(user);
          await AsyncStorage.setItem('authToken', token);
          await AsyncStorage.setItem('user', JSON.stringify(user));

          // Start activity tracking after registration
          activityTracker.start(handleInactivityLogout, 30);
        }
      }

      return response.data;
    } catch (err) {
      console.error('Registration failed:', err);
      return {
        success: false,
        error: err.response?.data?.error || 'Registration failed. Please try again.'
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      // Stop activity tracking
      activityTracker.stop();

      setUser(null);
      await AsyncStorage.multiRemove(['authToken', 'user']);
    }
  };

  const updateUser = async (updatedUserData) => {
    try {
      // Update local state
      setUser(updatedUserData);

      // Update AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));

      return { success: true };
    } catch (err) {
      console.error('Update user failed:', err);
      return {
        success: false,
        error: 'Failed to update user data locally'
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
        updateUser,
      }}
    >
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
