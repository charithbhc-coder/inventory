import apiClient from './api.client';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  companyId?: string;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
    limit: number;
  };
}

export const auditLogService = {
  getLogs: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    startDate?: string;
    endDate?: string;
    action?: string; 
    userId?: string; 
    entityType?: string; 
    entityId?: string;
    companyId?: string;
  }) => {
    const { data } = await apiClient.get<PaginatedAuditLogs>('/audit-logs', { params });
    return data;
  },
};
