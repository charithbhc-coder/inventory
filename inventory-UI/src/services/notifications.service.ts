import api from './api.client';

export type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  isRead: boolean;
  isDismissed: boolean;
  actionUrl?: string;
  createdAt: string;
}

export const notificationsService = {
  getMyNotifications: async (page = 1, limit = 50): Promise<{ data: Notification[], meta: any }> => {
    const { data } = await api.get('/notifications', { params: { page, limit } });
    return data;
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get('/notifications/unread-count');
    return data.count;
  },

  markAsRead: async (id: string) => {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.patch('/notifications/mark-all-read');
    return data;
  },
  
  dismiss: async (id: string) => {
    const { data } = await api.patch(`/notifications/${id}/dismiss`);
    return data;
  }
};
