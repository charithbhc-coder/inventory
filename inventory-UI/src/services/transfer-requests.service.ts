import api from './api.client';

export interface PendingTransferRequest {
  id: string;
  itemId: string;
  targetType: 'PERSON' | 'DEPARTMENT' | 'COMPANY';
  newAssignedToName: string | null;
  newAssignedToEmployeeId: string | null;
  reason: string;
  requestedByUserId: string;
  requestedByUser: { id: string; name: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  item: {
    id: string;
    name: string;
    barcode: string;
    assignedToName: string | null;
    assignedToEmployeeId: string | null;
  };
}

export const transferRequestsService = {
  getPending: async (): Promise<PendingTransferRequest[]> => {
    const { data } = await api.get('/transfer-requests/pending');
    return data;
  },

  getHistory: async (page = 1, limit = 20) => {
    const { data } = await api.get('/transfer-requests/history', { params: { page, limit } });
    return data;
  },

  approve: async (id: string, notes?: string) => {
    const { data } = await api.patch(`/transfer-requests/${id}/approve`, { notes });
    return data;
  },

  reject: async (id: string, notes: string) => {
    const { data } = await api.patch(`/transfer-requests/${id}/reject`, { notes });
    return data;
  },

  cancel: async (itemId: string) => {
    const { data } = await api.delete(`/transfer-requests/${itemId}/cancel`);
    return data;
  },
};
