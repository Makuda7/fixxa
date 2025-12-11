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

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      const response = await api.post('/login', { email, password });

      console.log('Login response:', response.data);
      console.log('Response keys:', Object.keys(response.data));

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

        return response.data;
      }

      console.log('Login was not successful:', response.data);
      return response.data;
    } catch (err) {
      console.error('Login error details:', err.response?.data || err.message);
      return {
        success: false,
        error: err.response?.data?.error || 'Login failed. Please try again.'
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
