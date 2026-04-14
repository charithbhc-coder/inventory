import apiClient from './api.client';

export interface GlobalSearchResult {
  id: string;
  type: 'ITEM' | 'USER' | 'DEPARTMENT' | 'COMPANY' | 'CATEGORY' | 'LICENSE';
  title: string;
  subtitle: string;
  url: string;
  metadata?: any;
}

export const searchService = {
  globalSearch: async (query: string): Promise<GlobalSearchResult[]> => {
    if (!query || query.length < 2) return [];
    const { data } = await apiClient.get<GlobalSearchResult[]>('/search/global', { params: { q: query } });
    return data;
  }
};
