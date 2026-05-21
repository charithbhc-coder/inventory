import apiClient from './api.client';
import {
  DisposalRequest,
  DisposalRequestStatus,
  DisposalCondition,
  DisposalMethod,
  DisposalReviewDecision,
  DisposalFinalDecision,
  DataSecurityChecklist,
} from '@/types';

export interface CreateDisposalRequestDto {
  itemId: string;
  disposalReason: string;
  disposalCondition: DisposalCondition;
  technicalEvaluation: string;
  proposedMethod: DisposalMethod;
  evidencePhotoUrls?: string[];
  notes?: string;
}

export interface L1ReviewDto {
  decision: DisposalReviewDecision;
  notes?: string;
}

export interface L2ApproveDto {
  decision: DisposalFinalDecision;
  notes?: string;
  dataSecurityChecklist?: DataSecurityChecklist;
}

export interface DisposalRequestFilters {
  status?: DisposalRequestStatus;
  companyId?: string;
  itemId?: string;
}

export interface ItemDisposalCheck {
  hasOpen: boolean;
  requestId: string | null;
  status: DisposalRequestStatus | null;
}

export const disposalRequestService = {
  create: async (dto: CreateDisposalRequestDto): Promise<DisposalRequest> => {
    const { data } = await apiClient.post('/disposal-requests', dto);
    return data;
  },

  getAll: async (filters: DisposalRequestFilters = {}): Promise<DisposalRequest[]> => {
    const { data } = await apiClient.get('/disposal-requests', { params: filters });
    return data;
  },

  getOne: async (id: string): Promise<DisposalRequest> => {
    const { data } = await apiClient.get(`/disposal-requests/${id}`);
    return data;
  },

  checkItem: async (itemId: string): Promise<ItemDisposalCheck> => {
    const { data } = await apiClient.get(`/disposal-requests/check/${itemId}`);
    return data;
  },

  l1Review: async (id: string, dto: L1ReviewDto): Promise<DisposalRequest> => {
    const { data } = await apiClient.patch(`/disposal-requests/${id}/l1-review`, dto);
    return data;
  },

  l2Approve: async (id: string, dto: L2ApproveDto): Promise<DisposalRequest> => {
    const { data } = await apiClient.patch(`/disposal-requests/${id}/l2-approve`, dto);
    return data;
  },

  cancel: async (id: string): Promise<DisposalRequest> => {
    const { data } = await apiClient.patch(`/disposal-requests/${id}/cancel`);
    return data;
  },

  uploadPhoto: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/disposal-requests/upload-photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url as string;
  },
};
