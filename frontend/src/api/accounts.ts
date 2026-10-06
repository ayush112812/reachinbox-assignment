import { AccountDetailResponse, AccountListResponse } from '../types/account';
import { apiClient } from './client';

export const accountsApi = {
  getAccounts: async (): Promise<AccountListResponse> => {
    return apiClient.get<AccountListResponse>('/api/accounts');
  },

  getAccountById: async (id: string): Promise<AccountDetailResponse> => {
    return apiClient.get<AccountDetailResponse>(`/api/accounts/${id}`);
  },

  triggerSync: async (id: string, daysBack: number = 30): Promise<{ success: boolean; message: string }> => {
    return apiClient.post<{ success: boolean; message: string }>(`/api/accounts/${id}/sync`, { daysBack });
  }
};
