import apiClient from './api.client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: string;
  company?: { name: string; code: string };
  phone?: string;
  avatarUrl?: string | null;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsers {
  data: User[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export const userService = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string; companyId?: string }) => {
    const { data } = await apiClient.get<PaginatedUsers | User[]>('/users', { params });
    return data;
  },

  getUser: async (id: string) => {
    const { data } = await apiClient.get<User>(`/users/${id}`);
    return data;
  },

  createUser: async (payload: Partial<User>) => {
    const { data } = await apiClient.post<User>('/users', payload);
    return data;
  },

  updateUser: async (id: string, payload: Partial<User>) => {
    const { data } = await apiClient.patch<User>(`/users/${id}`, payload);
    return data;
  },

  updatePermissions: async (id: string, permissions: string[]) => {
    const { data } = await apiClient.patch<User>(`/users/${id}/permissions`, { permissions });
    return data;
  },

  setStatus: async (id: string, isActive: boolean) => {
    const { data } = await apiClient.patch<User>(`/users/${id}/status`, { isActive });
    return data;
  },
};
