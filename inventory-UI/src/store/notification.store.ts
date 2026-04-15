import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Notification, notificationsService } from '../services/notifications.service';
import { useAuthStore } from './auth.store';
import { queryClient } from '../App';
import { NotificationType } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  socket: Socket | null;
  isConnected: boolean;
  
  // Actions
  initialize: () => void;
  disconnect: () => void;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  socket: null,
  isConnected: false,

  initialize: () => {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    // Disconnect existing if any
    const existingSocket = get().socket;
    if (existingSocket) {
      existingSocket.disconnect();
    }

    // Initial fetch
    get().fetchNotifications();

    // Use environment variable, stripping /api/v1
    const rawApiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    const baseUrl = rawApiUrl.replace(/\/api\/v1\/?$/, '');

    const socket = io(baseUrl, {
      extraHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('new_notification', (newNotif: Notification) => {
      set((state) => {
        // Prevent duplicates
        if (state.notifications.some(n => n.id === newNotif.id)) return state;
        
        // --- Real-time Sync Actions ---
        const type = newNotif.type;
        
        // Sync Users/Staff
        if (type === NotificationType.USER_UPDATED || 
            type === NotificationType.ACCOUNT_ROLE_UPDATED || 
            type === NotificationType.ACCOUNT_PERMISSIONS_UPDATED) {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['auth-me'] });
        }
        
        // Sync Licenses
        if (type.startsWith('LICENSE_')) {
          queryClient.invalidateQueries({ queryKey: ['licenses'] });
        }
        
        // Sync Items/Assets
        if (type.startsWith('ITEM_') || type.startsWith('DISPOSAL_')) {
          queryClient.invalidateQueries({ queryKey: ['items'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }

        return {
          notifications: [newNotif, ...state.notifications],
          unreadCount: state.unreadCount + 1
        };
      });
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set({ socket: null, isConnected: false, notifications: [], unreadCount: 0 });
  },

  fetchNotifications: async () => {
    try {
      const [{ data }, unreadCount] = await Promise.all([
        notificationsService.getMyNotifications(1, 50),
        notificationsService.getUnreadCount()
      ]);
      set({ notifications: data, unreadCount });
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  },

  markAsRead: async (id: string) => {
    set((state) => {
      const updated = state.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      );
      const newCount = Math.max(0, state.unreadCount - 1);
      return { notifications: updated, unreadCount: newCount };
    });
    try {
      await notificationsService.markAsRead(id);
    } catch (e) {
      // Revert if failed
      get().fetchNotifications();
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0
    }));
    try {
      await notificationsService.markAllAsRead();
    } catch (e) {
      get().fetchNotifications();
    }
  },

  dismiss: async (id: string) => {
    set((state) => {
      const isUnread = state.notifications.find(n => n.id === id && !n.isRead);
      const updated = state.notifications.filter(n => n.id !== id);
      const newCount = isUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount;
      return { notifications: updated, unreadCount: newCount };
    });
    try {
      await notificationsService.dismiss(id);
    } catch (e) {
      get().fetchNotifications();
    }
  }
}));
