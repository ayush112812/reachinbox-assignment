import { HealthResponse } from '../types/api';
import { KnowledgeSeedResponse, KnowledgeStatsResponse } from '../types/rag';
import { apiClient } from './client';

export const knowledgeApi = {
  getKnowledgeStats: async (): Promise<KnowledgeStatsResponse> => {
    return apiClient.get<KnowledgeStatsResponse>('/api/knowledge/stats');
  },

  seedKnowledge: async (): Promise<KnowledgeSeedResponse> => {
    return apiClient.post<KnowledgeSeedResponse>('/api/knowledge/seed');
  },

  triggerTestWebhook: async (payload?: Record<string, unknown>): Promise<{ success: boolean; message: string; results?: unknown }> => {
    return apiClient.post<{ success: boolean; message: string; results?: unknown }>('/api/test/webhook', payload);
  },

  getHealth: async (): Promise<HealthResponse> => {
    return apiClient.get<HealthResponse>('/health');
  }
};
