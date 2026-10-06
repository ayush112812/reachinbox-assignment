import request from 'supertest';
import { createApp } from '../src/app';
import { knowledgeBaseService } from '../src/services/rag/knowledge-base.service';
import { ragReplyService } from '../src/services/rag/rag-reply.service';

const app = createApp();

describe('RAG & Knowledge API Endpoints', () => {
  describe('POST /api/knowledge/seed', () => {
    it('successfully seeds knowledge and returns detailed metrics', async () => {
      const seedSpy = jest.spyOn(knowledgeBaseService, 'seedKnowledgeBase').mockResolvedValue({
        success: true,
        documentsProcessed: 8,
        chunksCreated: 22,
        chunksIndexed: 22,
        indexName: 'reachinbox-knowledge'
      });

      const response = await request(app).post('/api/knowledge/seed');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.documentsProcessed).toBe(8);
      expect(response.body.chunksCreated).toBe(22);
      expect(response.body.chunksIndexed).toBe(22);
      expect(response.body.indexName).toBe('reachinbox-knowledge');

      seedSpy.mockRestore();
    });

    it('handles seeding errors gracefully with status 500', async () => {
      const seedSpy = jest
        .spyOn(knowledgeBaseService, 'seedKnowledgeBase')
        .mockRejectedValue(new Error('Connection refused'));

      const response = await request(app).post('/api/knowledge/seed');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Connection refused');

      seedSpy.mockRestore();
    });
  });

  describe('GET /api/knowledge/stats', () => {
    it('returns knowledge vector index statistics', async () => {
      const response = await request(app).get('/api/knowledge/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.indexName).toBe('reachinbox-knowledge');
      expect(response.body.vectorDimension).toBe(768);
      expect(response.body.embeddingModel).toBeDefined();
    });
  });

  describe('POST /api/emails/:id/suggest-reply', () => {
    const validEmailId = 'sales_lead#INBOX#12345#101';
    const encodedId = encodeURIComponent(validEmailId);

    it('returns suggested replies and transparent source attribution for valid email', async () => {
      const replySpy = jest.spyOn(ragReplyService, 'generateReplyForEmail').mockResolvedValue({
        emailId: validEmailId,
        replies: [
          { style: 'Concise', text: 'Hi there, feel free to book a call: https://cal.com/example' },
          { style: 'Detailed', text: 'Hi there, ReachInbox connects multiple accounts in real time...' }
        ],
        retrievedSources: [
          {
            id: 'kb-meeting-booking#chunk1',
            title: 'Sharing the Booking Link',
            category: 'booking',
            score: 0.95,
            content: 'Share booking link...'
          }
        ]
      });

      const response = await request(app).post(`/api/emails/${encodedId}/suggest-reply`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.emailId).toBe(validEmailId);
      expect(response.body.replies).toHaveLength(2);
      expect(response.body.retrievedSources).toHaveLength(1);
      expect(response.body.retrievedSources[0].title).toBe('Sharing the Booking Link');

      replySpy.mockRestore();
    });

    it('returns 404 when email ID is not found in Elasticsearch', async () => {
      const replySpy = jest
        .spyOn(ragReplyService, 'generateReplyForEmail')
        .mockRejectedValue(new Error("Email with ID 'unknown#id' not found."));

      const response = await request(app).post('/api/emails/unknown%23id/suggest-reply');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');

      replySpy.mockRestore();
    });

    it('returns 503 when GEMINI_API_KEY is not configured', async () => {
      const replySpy = jest
        .spyOn(ragReplyService, 'generateReplyForEmail')
        .mockRejectedValue(new Error('GEMINI_API_KEY is not configured'));

      const response = await request(app).post(`/api/emails/${encodedId}/suggest-reply`);

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('GEMINI_API_KEY is not configured');

      replySpy.mockRestore();
    });
  });
});
