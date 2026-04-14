import api from '@/services/api.client';
import type { AuthTokens } from '@/types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthTokens> => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (token: string, newPassword: string, confirmPassword: string) => {
    const { data } = await api.post('/auth/reset-password', { token, newPassword, confirmPassword });
    return data;
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const { data } = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return data;
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  updateMe: async (payload: { firstName?: string; lastName?: string; phone?: string }) => {
    const { data } = await api.patch('/auth/me', payload);
    return data;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },
};
