import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      setLoading(true);
      const response = await authAPI.checkSession();
      console.log('Check session response:', response.data);

      if (response.data.authenticated) {
        console.log('User is logged in:', response.data.user);
        console.log('User type:', response.data.user?.type);
        console.log('User isAdmin:', response.data.user?.isAdmin);
        setUser(response.data.user);
      } else {
        console.log('User is not logged in');
        setUser(null);
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      console.log('AuthContext - Login response:', response.data);
      console.log('AuthContext - User from response:', response.data.user);
      console.log('AuthContext - Redirect from response:', response.data.redirect);

      if (response.data.success) {
        console.log('AuthContext - Login successful, setting user:', response.data.user);
        setUser(response.data.user);
        console.log('AuthContext - User state updated');
        return {
          success: true,
          user: response.data.user,
          redirect: response.data.redirect
        };
      } else {
        setError(response.data.error || 'Login failed');
        return { success: false, error: response.data.error };
      }
    } catch (err) {
      console.error('AuthContext - Login error:', err);
      const errorMessage = err.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      setUser(null);
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await authAPI.register(userData);

      if (response.data.success) {
        return { success: true, message: response.data.message };
      } else {
        setError(response.data.error || 'Registration failed');
        return { success: false, error: response.data.error };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    checkSession,
    isAuthenticated: !!user,
    isWorker: user?.type === 'professional',
    isClient: user?.type === 'client',
    isAdmin: user?.isAdmin === true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
