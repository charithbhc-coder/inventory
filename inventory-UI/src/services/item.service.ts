import apiClient from './api.client';

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
  company: { name: string; code: string };
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

  moveToWarehouse: async (id: string) => {
    const { data } = await apiClient.post(`/items/${id}/move-to-warehouse`);
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
  },

  printLabel: async (id: string) => {
    const { data } = await apiClient.get(`/labels/generate/${id}`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    
    // Create a hidden iframe to trigger the print dialog directly
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
      iframe.contentWindow?.print();
      // Cleanup after print dialog is closed (or after a timeout)
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.URL.revokeObjectURL(url);
      }, 1000);
    };
  }
};
