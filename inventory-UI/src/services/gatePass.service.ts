import apiClient from './api.client';
import { GatePassStatus } from '@/types';

export interface GatePassUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface GatePassItem {
  id: string;
  name: string;
  barcode: string;
  status: string;
  serialNumber?: string;
  category?: string;
}

export interface GatePass {
  id: string;
  referenceNo: string;
  companyId: string;
  destination: string;
  reason?: string;
  authorizedBy?: string;
  status: GatePassStatus;
  createdByUserId: string;
  createdByUser: GatePassUser;
  approvedByUserId?: string | null;
  approvedByUser?: GatePassUser | null;
  approvedAt?: string | null;
  rejectionNotes?: string | null;
  items: GatePassItem[];
  createdAt: string;
  updatedAt: string;
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

  getAll: async (filters?: { status?: GatePassStatus }): Promise<GatePass[]> => {
    const { data } = await apiClient.get('/gate-passes', { params: filters });
    return data;
  },

  getActive: async (): Promise<GatePass[]> => {
    const { data } = await apiClient.get('/gate-passes/active');
    return data;
  },

  getMyRequests: async (): Promise<GatePass[]> => {
    const { data } = await apiClient.get('/gate-passes/my-requests');
    return data;
  },

  getOne: async (id: string): Promise<GatePass> => {
    const { data } = await apiClient.get(`/gate-passes/${id}`);
    return data;
  },

  approve: async (id: string): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/approve`);
    return data;
  },

  reject: async (id: string, rejectionNotes: string): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/reject`, { rejectionNotes });
    return data;
  },

  cancel: async (id: string): Promise<GatePass> => {
    const { data } = await apiClient.post(`/gate-passes/${id}/cancel`);
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
