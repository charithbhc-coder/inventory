import apiClient from './api.client';

export interface Company {
  id: string;
  name: string;
  code: string;
  address?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedCompanies {
  data: Company[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export const companyService = {
  getCompanies: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get<PaginatedCompanies | Company[]>('/companies', { params });
    return data;
  },
  
  getCompany: async (id: string) => {
    const { data } = await apiClient.get<Company>(`/companies/${id}`);
    return data;
  },

  createCompany: async (payload: Partial<Company>) => {
    const { data } = await apiClient.post<Company>('/companies', payload);
    return data;
  },

  updateCompany: async (id: string, payload: Partial<Company>) => {
    const { data } = await apiClient.patch<Company>(`/companies/${id}`, payload);
    return data;
  },

  getBranding: async (): Promise<{ id: string; name: string; code: string; logoUrl?: string }[]> => {
    const { data } = await apiClient.get('/companies/branding');
    return data;
  },

  uploadLogo: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<{ message: string, logoUrl: string }>(`/companies/${id}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};
