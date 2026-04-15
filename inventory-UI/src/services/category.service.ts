import apiClient from './api.client';

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  isActive: boolean;
}

export const categoryService = {
  getCategories: async (params?: any) => {
    const { data } = await apiClient.get('/categories', { params });
    // Handle the backend's paginated response format
    return data;
  },

  getCategory: async (id: string) => {
    const { data } = await apiClient.get(`/categories/${id}`);
    return data;
  },

  createCategory: async (category: any) => {
    const { data } = await apiClient.post('/categories', category);
    return data;
  },

  updateCategory: async (id: string, category: any) => {
    const { data } = await apiClient.patch(`/categories/${id}`, category);
    return data;
  },

  deleteCategory: async (id: string) => {
    const { data } = await apiClient.delete(`/categories/${id}`);
    return data;
  }
};
