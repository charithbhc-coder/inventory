import api from './api.client';

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface License {
  id: string;
  softwareName: string;
  vendor: string;
  licenseKey?: string | null;
  purchaseDate?: string | null;
  expiryDate: string;
  maxUsers?: number | null;
  status: LicenseStatus;
  contactEmail?: string | null;
  category?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedLicenses {
  data: License[];
  meta: { total: number; page: number; limit: number; lastPage: number };
}

export interface GetLicensesParams {
  status?: LicenseStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export const licenseService = {
  getLicenses: async (params: GetLicensesParams = {}): Promise<PaginatedLicenses> => {
    const { data } = await api.get('/licenses', { params });
    return data;
  },

  getLicense: async (id: string): Promise<License> => {
    const { data } = await api.get(`/licenses/${id}`);
    return data;
  },

  createLicense: async (payload: Partial<License>): Promise<License> => {
    const { data } = await api.post('/licenses', payload);
    return data;
  },

  updateLicense: async (id: string, payload: Partial<License>): Promise<License> => {
    const { data } = await api.patch(`/licenses/${id}`, payload);
    return data;
  },

  deleteLicense: async (id: string): Promise<void> => {
    await api.delete(`/licenses/${id}`);
  },
};
