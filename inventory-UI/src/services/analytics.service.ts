import api from '@/services/api.client';

export const analyticsService = {
  getAssetsByCompany: async () => {
    const { data } = await api.get('/analytics/assets-by-company');
    return data;
  },

  getAssetStatus: async (companyId?: string) => {
    const { data } = await api.get('/analytics/asset-status', {
      params: { companyId },
    });
    return data;
  },

  getItemsByDepartment: async (companyId?: string) => {
    const { data } = await api.get('/analytics/by-department', {
      params: { companyId },
    });
    return data;
  },

  getItemsByCategory: async (companyId?: string) => {
    const { data } = await api.get('/analytics/by-category', {
      params: { companyId },
    });
    return data;
  },

  getRecentActivity: async (limit: number = 10) => {
    const { data } = await api.get('/analytics/recent-activity', {
      params: { limit },
    });
    return data;
  },

  getAuditHeatmap: async () => {
    const { data } = await api.get('/analytics/audit-activity');
    return data;
  },
};
