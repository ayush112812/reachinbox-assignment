import { config } from '../src/config/env.config';
import { IEmbeddingService } from '../src/services/ai/embedding.interface';
import { embeddingService } from '../src/services/ai/embedding.service';
import { GeminiEmbeddingService } from '../src/services/ai/gemini-embedding.service';
import { esVectorService } from '../src/services/elasticsearch/es-vector.service';
import { knowledgeBaseService } from '../src/services/rag/knowledge-base.service';

describe('Knowledge Base & Embedding Pipeline', () => {
  it('loads all knowledge base files and replaces {{BOOKING_URL}} placeholder', () => {
    const files = knowledgeBaseService.loadKnowledgeFiles();
    expect(files.length).toBeGreaterThanOrEqual(8);

    // Verify booking URL substitution in the booking document
    const bookingDoc = files.find((f) => f.id === 'kb-meeting-booking');
    expect(bookingDoc).toBeDefined();
    expect(bookingDoc?.chunks[0].content).toContain(config.BOOKING_URL);
    expect(bookingDoc?.chunks[0].content).not.toContain('{{BOOKING_URL}}');
  });

  it('chunks documents deterministically with unique, predictable IDs', () => {
    const files = knowledgeBaseService.loadKnowledgeFiles();
    const chunks = knowledgeBaseService.prepareChunks(files);

    expect(chunks.length).toBeGreaterThanOrEqual(20);

    // Verify deterministic ID structure: {docId}#chunk{chunkIndex}
    const firstChunk = chunks[0];
    expect(firstChunk.id).toMatch(/^[\w-]+#chunk\d+$/);
    expect(firstChunk.chunkIndex).toBeGreaterThanOrEqual(1);
    expect(firstChunk.content).toBeDefined();
    expect(firstChunk.category).toBeDefined();
    expect(firstChunk.source).toBeDefined();
  });

  it('embedding service generates and validates 768-dimensional vectors with mock provider', async () => {
    const dummy768Vector = new Array(768).fill(0.05);

    const mockEmbeddingProvider: IEmbeddingService = {
      embedText: jest.fn().mockResolvedValue(dummy768Vector),
      embedBatch: jest.fn().mockResolvedValue([dummy768Vector]),
      getDimension: () => 768,
      getModelName: () => 'gemini-embedding-001'
    };

    embeddingService.setProvider(mockEmbeddingProvider);

    const vector = await embeddingService.embedText('What is ReachInbox?');
    expect(vector).toHaveLength(768);
    expect(vector[0]).toBe(0.05);
    expect(embeddingService.getDimension()).toBe(768);
    expect(embeddingService.getModelName()).toBe('gemini-embedding-001');
  });

  it('gemini embedding service throws error when API key is missing', async () => {
    const originalKey = config.GEMINI_API_KEY;
    (config as { GEMINI_API_KEY?: string }).GEMINI_API_KEY = undefined;

    const realService = new GeminiEmbeddingService();
    await expect(realService.embedText('Test query')).rejects.toThrow(
      'GEMINI_API_KEY is not configured'
    );

    // Restore key
    (config as { GEMINI_API_KEY?: string }).GEMINI_API_KEY = originalKey;
  });

  it('gemini embedding service rejects empty text input', async () => {
    const dummyProvider: IEmbeddingService = {
      embedText: jest.fn().mockImplementation((text: string) => {
        if (!text || text.trim() === '') {
          return Promise.reject(new Error('Cannot generate embedding for empty text.'));
        }
        return Promise.resolve(new Array(768).fill(0.01));
      }),
      embedBatch: jest.fn().mockResolvedValue([]),
      getDimension: () => 768,
      getModelName: () => 'gemini-embedding-001'
    };

    embeddingService.setProvider(dummyProvider);
    await expect(embeddingService.embedText('   ')).rejects.toThrow(
      'Cannot generate embedding for empty text'
    );
  });

  it('performs idempotent seeding into Elasticsearch', async () => {
    const dummy768Vector = new Array(768).fill(0.02);

    embeddingService.setProvider({
      embedText: jest.fn().mockResolvedValue(dummy768Vector),
      embedBatch: jest.fn().mockResolvedValue([dummy768Vector]),
      getDimension: () => 768,
      getModelName: () => 'gemini-embedding-001'
    });

    const indexSpy = jest.spyOn(esVectorService, 'indexKnowledgeBatch').mockImplementation(
      async (chunks) => ({ indexed: chunks.length, failed: 0 })
    );

    // First seed
    const result1 = await knowledgeBaseService.seedKnowledgeBase();
    expect(result1.success).toBe(true);
    expect(result1.chunksIndexed).toBeGreaterThanOrEqual(20);

    // Second seed (idempotent verification)
    const result2 = await knowledgeBaseService.seedKnowledgeBase();
    expect(result2.success).toBe(true);
    expect(result2.chunksIndexed).toBe(result1.chunksIndexed);

    indexSpy.mockRestore();
  });
});
