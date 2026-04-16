import api from '@/services/api.client';
import { useAuthStore } from '@/store/auth.store';
import { API_BASE_URL } from '@/lib/config';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ReportFilters {
  companyId?: string;
  departmentId?: string;
  categoryId?: string;
  status?: string;
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface SendEmailPayload {
  recipientEmails: string[];
  subject: string;
  body: string;
  reportType?: string;
  fileFormat?: 'PDF' | 'EXCEL' | 'BOTH';
  filters?: ReportFilters;
}

export interface ScheduledReport {
  id: string;
  reportType: string;
  subject: string;
  bodyMessage?: string | null;
  recipientEmails: string[];
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timeOfDay: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  fileFormat: 'PDF' | 'EXCEL' | 'BOTH';
  filters?: ReportFilters;
  isActive: boolean;
  lastSentAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
}

export interface CreateSchedulePayload {
  reportType: string;
  subject: string;
  bodyMessage?: string;
  recipientEmails: string[];
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  timeOfDay: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  fileFormat: 'PDF' | 'EXCEL' | 'BOTH';
  filters?: ReportFilters;
}

// ─── Download helper (uses token in query param) ────────────────────────────

export function downloadReport(reportType: string, format: 'excel' | 'pdf', filters: ReportFilters = {}) {
  const token = useAuthStore.getState().accessToken;
  const params = new URLSearchParams();

  if (filters.companyId)    params.append('companyId', filters.companyId);
  if (filters.departmentId) params.append('departmentId', filters.departmentId);
  if (filters.categoryId)   params.append('categoryId', filters.categoryId);
  if (filters.status)       params.append('status', filters.status);
  if (filters.assignedTo)   params.append('assignedTo', filters.assignedTo);
  if (filters.dateFrom)     params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo)       params.append('dateTo', filters.dateTo);
  if (filters.search)       params.append('search', filters.search);
  
  const url = `${API_BASE_URL}/reports/${reportType}/${format}?${params.toString()}${token ? `&token=${token}` : ''}`;

  if (format === 'pdf') {
    // Direct Print for PDF
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }, 500);
    };
  } else {
    // Normal download for Excel
    window.open(url, '_blank');
  }
}

// ─── API calls ──────────────────────────────────────────────────────────────

export const reportsService = {
  sendEmail: async (payload: SendEmailPayload) => {
    const { data } = await api.post('/reports/send-email', payload);
    return data;
  },

  getSchedules: async (): Promise<ScheduledReport[]> => {
    const { data } = await api.get('/reports/schedules');
    return data;
  },

  createSchedule: async (payload: CreateSchedulePayload): Promise<ScheduledReport> => {
    const { data } = await api.post('/reports/schedules', payload);
    return data;
  },

  updateSchedule: async (id: string, payload: Partial<CreateSchedulePayload> & { isActive?: boolean }): Promise<ScheduledReport> => {
    const { data } = await api.patch(`/reports/schedules/${id}`, payload);
    return data;
  },

  deleteSchedule: async (id: string): Promise<void> => {
    await api.delete(`/reports/schedules/${id}`);
  },
};
