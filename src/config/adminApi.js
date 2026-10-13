/**
 * Admin API Configuration
 * Separate API instance for admin routes
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';



// Create admin API instance
const adminApi = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add admin access token
adminApi.interceptors.request.use(
  (config) => {
    const adminAccessToken = localStorage.getItem('adminAccessToken');
    if (adminAccessToken) {
      config.headers.Authorization = `Bearer ${adminAccessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('adminRefreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${API_BASE_URL}/admin/auth/refresh-token`,
            { refreshToken }
          );

          if (response.data.success) {
            const newAccessToken = response.data.data.accessToken;
            localStorage.setItem('adminAccessToken', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return adminApi(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('adminAccessToken');
        localStorage.removeItem('adminRefreshToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    // If still 401 or refresh failed, clear and redirect
    if (error.response?.status === 401) {
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin/login';
    } else if (error.response?.status === 403) {
      // Forbidden - not an admin
      console.error('Access denied: Admin privileges required');
    }
    
    return Promise.reject(error);
  }
);

export default adminApi;
