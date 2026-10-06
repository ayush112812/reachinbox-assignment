import { esClient, esService } from '../src/services/elasticsearch/elasticsearch.client';
import { indexManager } from '../src/services/elasticsearch/elasticsearch.indices';

describe('Elasticsearch Index Manager & Health Check', () => {
  afterAll(async () => {
    await esService.close();
  });

  it('verifies Elasticsearch health check format', async () => {
    const health = await esService.checkHealth();
    expect(health).toHaveProperty('isHealthy');
    expect(health).toHaveProperty('status');
  });

  it('ensures indices can be verified or created', async () => {
    const health = await esService.checkHealth();
    if (health.isHealthy) {
      const results = await indexManager.ensureIndicesExist();
      expect(results).toHaveProperty('emails');
      expect(results).toHaveProperty('knowledge');

      const status = await indexManager.checkIndicesExist();
      expect(status.emails).toBe(true);
      expect(status.knowledge).toBe(true);

      // Verify email index mapping has expected key properties
      const emailMapping = await esClient.indices.getMapping({ index: 'reachinbox-emails' });
      const emailProps = (emailMapping as any)['reachinbox-emails']?.mappings?.properties;
      expect(emailProps).toBeDefined();
      expect(emailProps.id.type).toBe('keyword');
      expect(emailProps.subject.type).toBe('text');
      expect(emailProps.category.type).toBe('keyword');
      expect(emailProps.bodyText.type).toBe('text');

      // Verify knowledge index mapping has dense_vector
      const knowledgeMapping = await esClient.indices.getMapping({ index: 'reachinbox-knowledge' });
      const knowledgeProps = (knowledgeMapping as any)['reachinbox-knowledge']?.mappings?.properties;
      expect(knowledgeProps).toBeDefined();
      expect(knowledgeProps.embedding.type).toBe('dense_vector');
      expect(knowledgeProps.embedding.dims).toBe(768);
    } else {
      console.warn('Elasticsearch not currently reachable in test environment; skipped live mapping assertions.');
    }
  });
});
