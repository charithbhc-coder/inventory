import api from './api.client';

export interface SystemSetting {
  key: string;
  value: any;
  category: string;
}

export const settingsService = {
  getSettings: async (): Promise<SystemSetting[]> => {
    const { data } = await api.get('/system-configs');
    return data;
  },

  updateSetting: async (key: string, value: any, category: string = 'GENERAL') => {
    const { data } = await api.post('/system-configs', { key, value, category });
    return data;
  },

  updateBulk: async (settings: { key: string; value: any; category?: string }[]) => {
    const { data } = await api.post('/system-configs/bulk', settings);
    return data;
  }
};
