import apiClient from './api.client';
import { useAuthStore } from '@/store/auth.store';
import { API_BASE_URL } from '@/lib/config';

export interface Item {
  id: string;
  name: string;
  barcode: string;
  serialNumber?: string;
  status: string;
  condition: string;
  purchasePrice?: number | string;
  purchaseDate?: string;
  purchasedFrom?: string;
  warrantyExpiresAt?: string;
  imageUrl?: string;
  location?: string;
  notes?: string;
  isWorking: boolean;
  needsRepair: boolean;
  categoryId: string;
  companyId: string;
  departmentId?: string;
  assignedToName?: string;
  assignedToEmployeeId?: string;
  category: { name: string; code: string };
  company: { name: string; code: string; logoUrl?: string };
  department?: { name: string };
  createdAt: string;
  warrantyCardUrls?: string[];
  invoiceUrls?: string[];
  parentItemId?: string | null;
  parentItem?: { id: string; name: string; barcode: string; category?: { name: string } } | null;
  childItems?: { id: string; name: string; barcode: string; category?: { name: string } }[];
}

export const itemService = {
  getItems: async (params: any) => {
    const { data } = await apiClient.get('/items', { params });
    return data;
  },

  getItemTimeline: async (barcodeOrId: string) => {
    const { data } = await apiClient.get(`/items/${barcodeOrId}`);
    return data;
  },

  previewBarcode: async (companyId: string, categoryId: string) => {
    const { data } = await apiClient.get('/items/preview-barcode', {
      params: { companyId, categoryId }
    });
    return data;
  },

  createItem: async (item: any) => {
    const { data } = await apiClient.post('/items', item);
    return data;
  },

  updateItem: async (id: string, item: any) => {
    const { data } = await apiClient.patch(`/items/${id}`, item);
    return data;
  },

  assignItem: async (id: string, dto: any) => {
    const { data } = await apiClient.post(`/items/${id}/assign`, dto);
    return data;
  },

  assignBulk: async (dto: { itemIds: string[]; departmentId?: string; assignedToName?: string; assignedToEmployeeId?: string; notes?: string }) => {
    const { data } = await apiClient.post('/items/assign-bulk', dto);
    return data;
  },

  unassignItem: async (id: string) => {
    const { data } = await apiClient.post(`/items/${id}/unassign`);
    return data;
  },

  markForRepair: async (id: string, dto: any) => {
    const { data } = await apiClient.post(`/items/${id}/repair`, dto);
    return data;
  },

  returnFromRepair: async (id: string, dto: any) => {
    const { data } = await apiClient.post(`/items/${id}/return-from-repair`, dto);
    return data;
  },

  disposeItem: async (id: string, dto: any) => {
    const { data } = await apiClient.post(`/items/${id}/dispose`, dto);
    return data;
  },

  reportLost: async (id: string, notes: string) => {
    const { data } = await apiClient.post(`/items/${id}/lost`, { notes });
    return data;
  },

  moveToWarehouse: async (id: string, notes?: string) => {
    const { data } = await apiClient.post(`/items/${id}/move-to-warehouse`, { notes });
    return data;
  },

  uploadWarranty: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`/items/${id}/warranty`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  uploadInvoice: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`/items/${id}/invoice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  
  uploadImage: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(`/items/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },

  downloadLabel: async (id: string, barcode?: string) => {
    try {
      const { data } = await apiClient.get(`/labels/generate/${id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `label-${barcode || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  },

  printLabel: async (id: string) => {
    try {
      // Fetch the PDF blob
      const { data } = await apiClient.get(`/labels/generate/${id}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create hidden iframe for printing
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
          // Cleanup after printing dialog is closed (approximation)
          setTimeout(() => {
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(url);
          }, 2000);
        }, 500);
      };
    } catch (error) {
      console.error('Direct print failed:', error);
      // Fallback: Open in new window if iframe print fails
      const token = (useAuthStore.getState() as any).accessToken;
      const url = `${API_BASE_URL}/labels/generate/${id}${token ? `?token=${token}` : ''}`;
      window.open(url, '_blank');
    }
  }
};

