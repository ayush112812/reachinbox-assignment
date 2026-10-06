export interface RetrievedSource {
  id: string;
  title: string;
  category?: string;
  source?: string;
  score: number;
  content: string;
  chunkIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface SuggestedReplyOption {
  style: 'Concise' | 'Detailed' | string;
  text: string;
}

export interface RagReplyResponse {
  success: boolean;
  emailId: string;
  replies?: SuggestedReplyOption[];
  suggestedReplies?: {
    concise: string;
    detailed: string;
  };
  retrievedSources: RetrievedSource[];
}

export type SuggestedReplyResponse = RagReplyResponse;

export interface KnowledgeStatsResponse {
  success: boolean;
  indexName: string;
  chunkCount: number;
  embeddingModel: string;
  vectorDimension: number;
}

export interface KnowledgeSeedResponse {
  success: boolean;
  documentsProcessed: number;
  chunksCreated: number;
  chunksIndexed: number;
  indexName: string;
}
