import apiClient from './api.client';

export interface GatePass {
  id: string;
  referenceNo: string;
  destination: string;
  reason?: string;
  authorizedBy?: string;
  status: 'ACTIVE' | 'RETURNED' | 'CANCELLED';
  items: { id: string; name: string; barcode: string; status: string }[];
  createdAt: string;
}

export interface CreateGatePassPayload {
  itemIds: string[];
  destination: string;
  reason?: string;
  authorizedBy?: string;
}

const gatePassService = {
  create: async (payload: CreateGatePassPayload): Promise<GatePass> => {
    const { data } = await apiClient.post('/gate-passes', payload);
    return data;
  },

  getActive: async (): Promise<GatePass[]> => {
    const { data } = await apiClient.get('/gate-passes/active');
    return data;
  },

  append: async (id: string, itemIds: string[]): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/append`, { itemIds });
    return data;
  },

  markReturned: async (id: string, notes?: string): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/return`, { notes });
    return data;
  },
};

export default gatePassService;
