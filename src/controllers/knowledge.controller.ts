import { Request, Response } from 'express';
import { config } from '../config/env.config';
import { esVectorService } from '../services/elasticsearch/es-vector.service';
import { knowledgeBaseService } from '../services/rag/knowledge-base.service';
import { logger } from '../utils/logger';

export class KnowledgeController {
  /**
   * POST /api/knowledge/seed
   * Idempotently chunks, embeds, and seeds the product knowledge base into Elasticsearch.
   */
  public async seedKnowledge(_req: Request, res: Response): Promise<void> {
    try {
      if (!config.GEMINI_API_KEY && config.NODE_ENV !== 'test') {
        res.status(503).json({
          success: false,
          error: 'GEMINI_API_KEY is not configured. Cannot generate vector embeddings for seeding.'
        });
        return;
      }

      const result = await knowledgeBaseService.seedKnowledgeBase();
      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('[Knowledge Controller] Failed to seed knowledge base:', err);
      res.status(500).json({
        success: false,
        error: `Knowledge base seeding failed: ${msg}`
      });
    }
  }

  /**
   * GET /api/knowledge/stats
   * Returns current vector index statistics.
   */
  public async getKnowledgeStats(_req: Request, res: Response): Promise<void> {
    try {
      const chunkCount = await esVectorService.getKnowledgeChunkCount();
      res.status(200).json({
        success: true,
        indexName: config.ELASTICSEARCH_KNOWLEDGE_INDEX,
        chunkCount,
        embeddingModel: config.EMBEDDING_MODEL,
        vectorDimension: 768
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({
        success: false,
        error: `Failed to fetch knowledge statistics: ${msg}`
      });
    }
  }
}

export const knowledgeController = new KnowledgeController();
