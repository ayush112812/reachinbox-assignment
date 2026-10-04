import { config } from '../../config/env.config';
import { KnowledgeDocument, RetrievedSource } from '../../types/rag.types';
import { logger } from '../../utils/logger';
import { esClient } from './elasticsearch.client';

export class EsVectorService {
  private readonly indexName: string;

  constructor() {
    this.indexName = config.ELASTICSEARCH_KNOWLEDGE_INDEX;
  }

  /**
   * Performs kNN semantic similarity search against the knowledge vector index.
   */
  public async searchSimilarChunks(
    queryVector: number[],
    k: number = 3,
    numCandidates: number = 20
  ): Promise<RetrievedSource[]> {
    if (!queryVector || queryVector.length === 0) {
      logger.warn('[ES Vector Service] Empty query vector provided for vector search.');
      return [];
    }

    try {
      const response = await esClient.search<KnowledgeDocument>({
        index: this.indexName,
        knn: {
          field: 'embedding',
          query_vector: queryVector,
          k: Math.max(1, k),
          num_candidates: Math.max(numCandidates, k * 2)
        },
        _source: ['id', 'title', 'content', 'category', 'source', 'chunkIndex', 'sourceDocument', 'createdAt']
      });

      const hits = response.hits.hits || [];
      return hits.map((hit) => {
        const source = hit._source;
        return {
          id: String(source?.id || hit._id || ''),
          title: source?.title || 'Knowledge Chunk',
          category: source?.category,
          source: source?.source,
          score: typeof hit._score === 'number' ? Number(hit._score.toFixed(4)) : 0,
          content: source?.content || '',
          chunkIndex: source?.chunkIndex
        };
      });
    } catch (err) {
      logger.error('[ES Vector Service] Error executing kNN vector search:', err);
      throw err;
    }
  }

  /**
   * Idempotently indexes or updates a batch of knowledge documents with vectors.
   */
  public async indexKnowledgeBatch(
    chunks: KnowledgeDocument[]
  ): Promise<{ indexed: number; failed: number }> {
    if (chunks.length === 0) {
      return { indexed: 0, failed: 0 };
    }

    try {
      const operations = chunks.flatMap((chunk) => [
        { index: { _index: this.indexName, _id: chunk.id } },
        chunk
      ]);

      const bulkResponse = await esClient.bulk({
        refresh: true,
        operations
      });

      let failed = 0;
      let indexed = 0;

      if (bulkResponse.errors) {
        bulkResponse.items.forEach((item) => {
          const operation = item.index || item.create || item.update;
          if (operation?.error) {
            failed++;
            logger.error(`[ES Vector Service] Bulk indexing error for doc ${operation._id}:`, operation.error);
          } else {
            indexed++;
          }
        });
      } else {
        indexed = chunks.length;
      }

      logger.info(
        `[ES Vector Service] Indexed ${indexed} chunks into '${this.indexName}' (failed: ${failed}).`
      );
      return { indexed, failed };
    } catch (err) {
      logger.error('[ES Vector Service] Failed to bulk index knowledge chunks:', err);
      throw err;
    }
  }

  /**
   * Returns the count of indexed knowledge chunks.
   */
  public async getKnowledgeChunkCount(): Promise<number> {
    try {
      const countRes = await esClient.count({ index: this.indexName });
      return countRes.count;
    } catch (err) {
      logger.warn('[ES Vector Service] Failed to get knowledge count:', err);
      return 0;
    }
  }
}

export const esVectorService = new EsVectorService();
