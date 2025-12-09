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
        setUser(JSON.parse(storedUser));

        // Verify token is still valid
        try {
          const response = await api.get('/check-session');
          if (response.data.authenticated) {
            const userData = response.data.user;
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
      const response = await api.post('/login', { email, password });

      if (response.data.success) {
        const userData = response.data.user;
        const token = response.data.token;

        setUser(userData);

        // Store both token and user data
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));

        return response.data;
      }

      return response.data;
    } catch (err) {
      console.error('Login failed:', err);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        checkAuth,
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
