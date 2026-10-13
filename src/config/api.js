import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';



const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Try player token first, then admin token
    const playerToken = localStorage.getItem('accessToken');
    const adminToken = localStorage.getItem('adminAccessToken');
    
    const token = playerToken || adminToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh and auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Check if we're using player or admin token
        const playerRefreshToken = localStorage.getItem('refreshToken');
        const adminRefreshToken = localStorage.getItem('adminRefreshToken');
        
        if (adminRefreshToken) {
          // Try admin token refresh
          const response = await axios.post(`${API_BASE_URL}/admin/auth/refresh-token`, {
            refreshToken: adminRefreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('adminAccessToken', accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } else if (playerRefreshToken) {
          // Try player token refresh
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken: playerRefreshToken,
          });

          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('No refresh token available');
        }
      } catch (refreshError) {
        // Refresh failed - don't redirect, just reject
        // Let ProtectedRoute handle the redirect
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
