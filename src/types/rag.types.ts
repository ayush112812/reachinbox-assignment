export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  chunkIndex: number;
  sourceDocument: string;
  embedding?: number[];
  createdAt: string | Date;
}

export interface KnowledgeDocument extends KnowledgeChunk {
  embedding: number[];
}

export interface RetrievedSource {
  id: string;
  title: string;
  category?: string;
  source?: string;
  score: number;
  content: string;
  chunkIndex?: number;
}

export interface SuggestedReplyOption {
  style: 'Concise' | 'Detailed' | string;
  text: string;
}

export interface SuggestedReplyResult {
  emailId: string;
  replies: SuggestedReplyOption[];
  retrievedSources: RetrievedSource[];
}

export interface KnowledgeSeedResult {
  success: boolean;
  documentsProcessed: number;
  chunksCreated: number;
  chunksIndexed: number;
  indexName: string;
}
