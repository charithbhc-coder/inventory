import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '@/lib/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401 — do not attempt refresh
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      toast.error('Your session has expired. Please sign in again.', {
        duration: 4000,
        icon: '🔒',
        id: 'session-expired', // Prevent duplicate toasts
      });
      useAuthStore.getState().logout();
      setTimeout(() => { window.location.href = '/login'; }, 1000);
    }
    return Promise.reject(error);
  }
);

export default api;
