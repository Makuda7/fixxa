import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  withCredentials: true, // Important: Send session cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  checkSession: () => api.get('/auth/check-session'),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  register: (userData) => api.post('/auth/register', userData),
};

// Worker API calls
export const workerAPI = {
  getProfile: () => api.get('/workers/profile'),
  updateProfile: (profileData) => api.put('/workers/profile', profileData),
  uploadProfilePicture: (formData) =>
    api.post('/workers/upload-profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getBookings: () => api.get('/workers/bookings'),
  updateBookingStatus: (bookingId, status) =>
    api.put(`/workers/bookings/${bookingId}/status`, { status }),
  getEarnings: () => api.get('/workers/earnings'),
  getServiceAreas: () => api.get('/workers/service-areas'),
  updateServiceAreas: (areas) => api.put('/workers/service-areas', { areas }),
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
