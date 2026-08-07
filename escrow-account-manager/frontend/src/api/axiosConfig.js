import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s — needed for AI/OCR document analysis endpoints
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const getErrorMessage = (error) => {
  const data = error.response?.data;
  return data?.message || data?.error || error.message || 'Something went wrong';
};

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config || {};
    const message = getErrorMessage(error);
    const status = error.response?.status;
    const isSilentAuthProbe =
      config.skipErrorToast ||
      (config.url && String(config.url).includes('/auth/me'));

    if (isSilentAuthProbe) {
      return Promise.reject(error);
    }

    // Handle authentication errors
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        toast.error('Session expired. Please login again.');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      } else {
        toast.error(message);
      }
    } else if (status === 429) {
      toast.error(message);
    } else if (!config.skipErrorToast) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
