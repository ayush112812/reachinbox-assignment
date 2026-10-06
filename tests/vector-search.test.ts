import { esClient } from '../src/services/elasticsearch/elasticsearch.client';
import { esVectorService } from '../src/services/elasticsearch/es-vector.service';

describe('Elasticsearch Vector Search (kNN)', () => {
  it('constructs correct kNN query parameters and maps hits into RetrievedSource format', async () => {
    const dummyVector = new Array(768).fill(0.03);

    const mockEsResponse = {
      hits: {
        total: { value: 2, relation: 'eq' },
        max_score: 0.942,
        hits: [
          {
            _id: 'kb-meeting-booking#chunk1',
            _score: 0.9421,
            _source: {
              id: 'kb-meeting-booking#chunk1',
              title: 'Sharing the Booking Link',
              content: 'Whenever a prospect shows interest, share the link: https://cal.com/example',
              category: 'booking',
              source: 'reachinbox-knowledge-base',
              chunkIndex: 1,
              sourceDocument: 'kb-meeting-booking'
            }
          },
          {
            _id: 'kb-product-overview#chunk1',
            _score: 0.8845,
            _source: {
              id: 'kb-product-overview#chunk1',
              title: 'Platform Overview & Purpose',
              content: 'ReachInbox is a centralized email synchronization platform.',
              category: 'product',
              source: 'reachinbox-knowledge-base',
              chunkIndex: 1,
              sourceDocument: 'kb-product-overview'
            }
          }
        ]
      }
    };

    const searchSpy = jest.spyOn(esClient, 'search').mockResolvedValue(mockEsResponse as any);

    const sources = await esVectorService.searchSimilarChunks(dummyVector, 2, 20);

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        index: expect.any(String),
        knn: {
          field: 'embedding',
          query_vector: dummyVector,
          k: 2,
          num_candidates: 20
        }
      })
    );

    expect(sources).toHaveLength(2);
    expect(sources[0].id).toBe('kb-meeting-booking#chunk1');
    expect(sources[0].title).toBe('Sharing the Booking Link');
    expect(sources[0].category).toBe('booking');
    expect(sources[0].score).toBe(0.9421);
    expect(sources[0].content).toContain('https://cal.com/example');

    expect(sources[1].id).toBe('kb-product-overview#chunk1');
    expect(sources[1].score).toBe(0.8845);

    searchSpy.mockRestore();
  });

  it('handles empty query vector gracefully without crashing', async () => {
    const searchSpy = jest.spyOn(esClient, 'search');
    const sources = await esVectorService.searchSimilarChunks([], 3);

    expect(sources).toEqual([]);
    expect(searchSpy).not.toHaveBeenCalled();
    searchSpy.mockRestore();
  });

  it('handles bulk indexing errors and counts correctly', async () => {
    const mockBulkResponse = {
      errors: false,
      items: [
        { index: { _id: 'chunk1', status: 201 } },
        { index: { _id: 'chunk2', status: 200 } }
      ]
    };

    const bulkSpy = jest.spyOn(esClient, 'bulk').mockResolvedValue(mockBulkResponse as any);

    const dummyChunks = [
      {
        id: 'chunk1',
        title: 'Title 1',
        content: 'Content 1',
        category: 'product',
        source: 'source',
        chunkIndex: 1,
        sourceDocument: 'doc1',
        embedding: new Array(768).fill(0.01),
        createdAt: new Date().toISOString()
      },
      {
        id: 'chunk2',
        title: 'Title 2',
        content: 'Content 2',
        category: 'product',
        source: 'source',
        chunkIndex: 2,
        sourceDocument: 'doc1',
        embedding: new Array(768).fill(0.01),
        createdAt: new Date().toISOString()
      }
    ];

    const result = await esVectorService.indexKnowledgeBatch(dummyChunks);
    expect(result.indexed).toBe(2);
    expect(result.failed).toBe(0);

    bulkSpy.mockRestore();
  });
});
