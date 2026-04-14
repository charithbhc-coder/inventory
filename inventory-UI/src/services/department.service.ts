import apiClient from './api.client';

export interface Department {
  id: string;
  name: string;
  code: string;
  companyId: string;
  company?: { id: string; name: string };
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedDepartments {
  data: Department[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export const departmentService = {
  getDepartments: async (companyId?: string, params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get<PaginatedDepartments>('/departments', {
      params: { ...(companyId && { companyId }), ...params },
    });
    return data;
  },

  getDepartment: async (id: string) => {
    const { data } = await apiClient.get<Department>(`/departments/${id}`);
    return data;
  },

  createDepartment: async (companyId: string, payload: Pick<Department, 'name' | 'code'> & { location?: string }) => {
    const { data } = await apiClient.post<Department>('/departments', payload, {
      params: { companyId },
    });
    return data;
  },

  updateDepartment: async (id: string, payload: Partial<Pick<Department, 'name' | 'location' | 'isActive'>>) => {
    const { data } = await apiClient.patch<Department>(`/departments/${id}`, payload);
    return data;
  },
  
  deleteDepartment: async (id: string) => {
    const { data } = await apiClient.delete(`/departments/${id}`);
    return data;
  },
};
