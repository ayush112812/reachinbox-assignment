import { EmailFilterParams, SearchFilterParams, SearchResultResponse } from '../types/api';
import { CategorizeEmailResponse, EmailDetailResponse, EmailListResponse } from '../types/email';
import { SuggestedReplyResponse } from '../types/rag';
import { apiClient } from './client';

export const emailsApi = {
  getEmails: async (params: EmailFilterParams = {}): Promise<EmailListResponse> => {
    return apiClient.get<EmailListResponse>('/api/emails', {
      page: params.page,
      limit: params.limit,
      accountId: params.accountId,
      folder: params.folder,
      category: params.category
    });
  },

  getEmailById: async (id: string): Promise<EmailDetailResponse> => {
    return apiClient.get<EmailDetailResponse>(`/api/emails/${encodeURIComponent(id)}`);
  },

  searchEmails: async (params: SearchFilterParams = {}): Promise<SearchResultResponse> => {
    return apiClient.get<SearchResultResponse>('/api/search', {
      q: params.q,
      page: params.page,
      limit: params.limit,
      accountId: params.accountId,
      folder: params.folder,
      category: params.category
    });
  },

  categorizeEmail: async (id: string): Promise<CategorizeEmailResponse> => {
    return apiClient.post<CategorizeEmailResponse>(`/api/emails/${encodeURIComponent(id)}/categorize`);
  },

  suggestReply: async (id: string): Promise<SuggestedReplyResponse> => {
    return apiClient.post<SuggestedReplyResponse>(`/api/emails/${encodeURIComponent(id)}/suggest-reply`);
  }
};
