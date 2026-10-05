import fs from 'fs';
import path from 'path';
import { config } from '../../config/env.config';
import { KnowledgeDocument, KnowledgeSeedResult } from '../../types/rag.types';
import { logger } from '../../utils/logger';
import { embeddingService } from '../ai/embedding.service';
import { indexManager } from '../elasticsearch/elasticsearch.indices';
import { esVectorService } from '../elasticsearch/es-vector.service';

interface RawKnowledgeFile {
  id: string;
  title: string;
  category: string;
  source: string;
  chunks: Array<{
    chunkIndex: number;
    title: string;
    content: string;
  }>;
}

export class KnowledgeBaseService {
  private readonly knowledgeDir: string;

  constructor() {
    this.knowledgeDir = this.resolveKnowledgeDir();
  }

  private resolveKnowledgeDir(): string {
    const candidates = [
      path.resolve(__dirname, '../../data/knowledge'),
      path.resolve(__dirname, '../../../src/data/knowledge'),
      path.resolve(process.cwd(), 'src/data/knowledge'),
      path.resolve(process.cwd(), 'data/knowledge'),
      path.resolve(process.cwd(), 'dist/data/knowledge'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        return dir;
      }
    }
    return candidates[0];
  }

  /**
   * Loads all JSON files from the knowledge directory and substitutes configurable tokens.
   */
  public loadKnowledgeFiles(): RawKnowledgeFile[] {
    if (!fs.existsSync(this.knowledgeDir)) {
      logger.warn(`[Knowledge Base] Directory '${this.knowledgeDir}' does not exist.`);
      return [];
    }

    const files = fs.readdirSync(this.knowledgeDir).filter((file) => file.endsWith('.json'));
    const documents: RawKnowledgeFile[] = [];

    for (const file of files) {
      const filePath = path.join(this.knowledgeDir, file);
      try {
        let content = fs.readFileSync(filePath, 'utf-8');
        // Substitute configurable tokens like booking URL
        content = content.replace(/\{\{BOOKING_URL\}\}/g, config.BOOKING_URL);
        const parsed = JSON.parse(content) as RawKnowledgeFile;
        documents.push(parsed);
      } catch (err) {
        logger.error(`[Knowledge Base] Failed to parse knowledge file '${file}':`, err);
      }
    }

    return documents;
  }

  /**
   * Chunks knowledge documents and assigns deterministic IDs.
   */
  public prepareChunks(documents: RawKnowledgeFile[]): Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    source: string;
    chunkIndex: number;
    sourceDocument: string;
  }> {
    const chunks: Array<{
      id: string;
      title: string;
      content: string;
      category: string;
      source: string;
      chunkIndex: number;
      sourceDocument: string;
    }> = [];

    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        // Deterministic ID ensures idempotent re-seeding
        const chunkId = `${doc.id}#chunk${chunk.chunkIndex}`;
        chunks.push({
          id: chunkId,
          title: chunk.title,
          content: chunk.content,
          category: doc.category,
          source: doc.source,
          chunkIndex: chunk.chunkIndex,
          sourceDocument: doc.id
        });
      }
    }

    return chunks;
  }

  /**
   * Seeds or updates the Elasticsearch knowledge vector index with embeddings.
   * Fully idempotent: running multiple times updates rather than duplicates documents.
   */
  public async seedKnowledgeBase(): Promise<KnowledgeSeedResult> {
    logger.info('[Knowledge Base] Starting knowledge base seeding process...');

    // Ensure knowledge index exists with vector mapping
    await indexManager.createKnowledgeIndex();

    const rawDocs = this.loadKnowledgeFiles();
    if (rawDocs.length === 0) {
      throw new Error(`No knowledge files found in '${this.knowledgeDir}'.`);
    }

    const preparedChunks = this.prepareChunks(rawDocs);
    logger.info(
      `[Knowledge Base] Loaded ${rawDocs.length} knowledge documents (${preparedChunks.length} chunks to embed).`
    );

    const documentsToInsert: KnowledgeDocument[] = [];
    const now = new Date().toISOString();

    for (const chunk of preparedChunks) {
      // Embedding input: title + content provides strong semantic coverage
      const textToEmbed = `${chunk.title}: ${chunk.content}`;
      const embedding = await embeddingService.embedText(textToEmbed);

      documentsToInsert.push({
        id: chunk.id,
        title: chunk.title,
        content: chunk.content,
        category: chunk.category,
        source: chunk.source,
        chunkIndex: chunk.chunkIndex,
        sourceDocument: chunk.sourceDocument,
        embedding,
        createdAt: now
      });
    }

    const { indexed } = await esVectorService.indexKnowledgeBatch(documentsToInsert);

    logger.info(
      `✅ [Knowledge Base] Seeding complete! Indexed ${indexed} vector chunks into '${config.ELASTICSEARCH_KNOWLEDGE_INDEX}'.`
    );

    return {
      success: true,
      documentsProcessed: rawDocs.length,
      chunksCreated: preparedChunks.length,
      chunksIndexed: indexed,
      indexName: config.ELASTICSEARCH_KNOWLEDGE_INDEX
    };
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
