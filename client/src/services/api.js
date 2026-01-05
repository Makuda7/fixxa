import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  withCredentials: true, // Important: Send session cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log API configuration for debugging
console.log('API Configuration:', {
  baseURL: process.env.REACT_APP_API_URL || '(using proxy)',
  withCredentials: true
});

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 for check-session endpoint
    const isCheckSession = error.config?.url?.includes('/check-session');

    if (error.response?.status === 401 && !isCheckSession) {
      // Unauthorized - redirect to login (except for check-session)
      console.log('401 Unauthorized - redirecting to login');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  checkSession: () => api.get('/check-session'),
  login: (email, password) => api.post('/login', { email, password }),
  logout: () => api.post('/logout'),
  register: (userData) => api.post('/register', userData),
};

// Worker API calls
export const workerAPI = {
  getProfile: () => api.get('/workers/profile'),
  updateProfile: (profileData) => api.put('/workers/profile', profileData),
  uploadProfilePicture: (formData) =>
    api.post('/workers/upload-profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getBookings: () => api.get('/workers/jobs'),
  updateBookingStatus: (bookingId, status) =>
    api.put(`/workers/bookings/${bookingId}/status`, { status }),
  getEarnings: (filter = 'all') => api.get(`/workers/earnings?filter=${filter}`),
  getEarningsSummary: () => api.get('/workers/earnings/summary'),
  getServiceAreas: () => api.get('/workers/service-areas'),
  updateServiceAreas: (areas) => api.put('/workers/service-areas', { areas }),

  // Booking Requests
  getBookingRequests: () => api.get('/worker/booking-requests'),
  respondToNewBooking: (bookingId, action, declineReason) =>
    api.post(`/worker/booking/${bookingId}/respond`, { action, declineReason }),
  respondToRequest: (requestId, action) =>
    api.post(`/worker/booking-requests/${requestId}/respond`, { action }),

  // Quotes
  sendQuote: (quoteData) => api.post('/quotes/send', quoteData),
  getBookingQuotes: (bookingId) => api.get(`/quotes/booking/${bookingId}`),

  // Completion Requests
  submitCompletionRequest: (formData) =>
    api.post('/worker/completion-request', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getCompletionRequests: () => api.get('/worker/completion-requests'),
};

// Certifications API calls
export const certificationsAPI = {
  getMyCertifications: () => api.get('/certifications/my-certifications'),
  uploadCertification: (formData) =>
    api.post('/certifications/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteCertification: (certificationId) =>
    api.delete(`/certifications/${certificationId}`),
};

// Bookings API calls
export const bookingsAPI = {
  getMyBookings: () => api.get('/bookings/my-bookings'),
  createBooking: (bookingData) => api.post('/bookings/create', bookingData),
  cancelBooking: (bookingId) => api.put(`/bookings/${bookingId}/cancel`),
  reviewWorker: (bookingId, reviewData) =>
    api.post(`/bookings/${bookingId}/review`, reviewData),
};

// Search API calls
export const searchAPI = {
  searchWorkers: (params) => api.get('/search/workers', { params }),
  getWorkerById: (workerId) => api.get(`/search/workers/${workerId}`),
  getWorkerReviews: (workerId) => api.get(`/search/workers/${workerId}/reviews`),
  getSpecialties: () => api.get('/search/specialties'),
  getLocations: () => api.get('/search/locations'),
};

export default api;
