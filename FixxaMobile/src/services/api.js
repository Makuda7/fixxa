import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import activityTracker from '../utils/activityTracker';

// Use your production API
const API_BASE_URL = 'https://fixxa.co.za';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor - Add token to all requests and record activity
api.interceptors.request.use(
  async (config) => {
    // Record activity for every API call
    activityTracker.recordActivity();

    // Skip adding token for refresh-token endpoint (it adds its own)
    // Also skip if this is a retry after token refresh (marked with _retry flag)
    if (!config.url?.includes('/refresh-token') && !config._retry) {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    } else if (config._retry) {
      console.log('🔄 Retry request - keeping existing auth header');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors and attempt token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 error and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request is already refreshing the token
        // Queue this request to retry after refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            console.log('🔄 Retrying queued request with refreshed token');
            return api(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get current token
        const currentToken = await AsyncStorage.getItem('authToken');

        if (!currentToken) {
          // No token to refresh - user needs to login
          throw new Error('No token available');
        }

        // Attempt to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/refresh-token`,
          {},
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        if (response.data.success && response.data.token) {
          const newToken = response.data.token;

          // Store new token
          await AsyncStorage.setItem('authToken', newToken);

          // Update user data if provided
          if (response.data.user) {
            await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          }

          console.log('✅ Token refreshed successfully');

          // Update all queued requests with new token
          processQueue(null, newToken);

          // Retry the original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          console.log('🔄 Retrying original request with refreshed token');
          isRefreshing = false;
          return api(originalRequest);
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message);

        // Token refresh failed - clear storage and reject all queued requests
        processQueue(refreshError, null);
        isRefreshing = false;

        try {
          await AsyncStorage.multiRemove(['authToken', 'user']);
        } catch (e) {
          console.error('Error clearing storage:', e);
        }

        // Create a more user-friendly error
        const authError = new Error('SESSION_EXPIRED');
        authError.userMessage = 'Your session has expired. Please log out and log in again.';
        return Promise.reject(authError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
