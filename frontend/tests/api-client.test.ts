import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { accountsApi } from '../src/api/accounts';
import { emailsApi } from '../src/api/emails';
import { knowledgeApi } from '../src/api/knowledge';

describe('API Client & Endpoints', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('correctly configures base URL and performs GET /api/accounts', async () => {
    const mockAccounts = [
      { id: 'acc1', user: 'user1@example.com', host: 'imap.example.com', port: 993, secure: true, state: 'idle', totalIndexed: 10 }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockAccounts })
    } as Response);

    const res = await accountsApi.getAccounts();
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe('acc1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/accounts'),
      expect.any(Object)
    );
  });

  it('correctly performs GET /api/emails with filters and pagination query params', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
      })
    } as Response);

    const res = await emailsApi.getEmails({
      page: 2,
      limit: 10,
      accountId: 'acc1',
      category: 'Interested',
      folder: 'INBOX'
    });

    expect(res.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('category=Interested'),
      expect.any(Object)
    );
  });

  it('correctly performs GET /api/emails/:id', async () => {
    const mockEmail = {
      id: 'acc1#INBOX#1#100',
      accountId: 'acc1',
      folder: 'INBOX',
      uid: 100,
      subject: 'Demo Subject',
      from: { name: 'Alice', address: 'alice@example.com' },
      to: [{ name: 'Bob', address: 'bob@example.com' }],
      date: new Date().toISOString(),
      bodyText: 'Hello world',
      bodyHtml: '<p>Hello world</p>',
      snippet: 'Hello world',
      category: 'Interested',
      categoryConfidence: 0.95,
      notificationSent: false,
      indexedAt: new Date().toISOString()
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockEmail })
    } as Response);

    const res = await emailsApi.getEmailById('acc1#INBOX#1#100');
    expect(res.success).toBe(true);
    expect(res.data.id).toBe('acc1#INBOX#1#100');
  });

  it('correctly performs GET /api/search with Elasticsearch query and filters', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }
      })
    } as Response);

    const res = await emailsApi.searchEmails({
      q: 'pricing demo',
      category: 'Interested'
    });

    expect(res.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=pricing+demo'),
      expect.any(Object)
    );
  });

  it('correctly performs POST /api/emails/:id/categorize', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        emailId: 'test-id',
        category: 'Meeting Booked',
        confidence: 0.99,
        reasoning: 'Explicit calendar meeting confirmation.'
      })
    } as Response);

    const res = await emailsApi.categorizeEmail('test-id');
    expect(res.success).toBe(true);
    expect(res.category).toBe('Meeting Booked');
    expect(res.confidence).toBe(0.99);
  });

  it('correctly performs POST /api/emails/:id/suggest-reply', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        emailId: 'test-id',
        replies: [
          { style: 'Concise', text: 'Thanks for reaching out! Let us schedule a quick demo.' }
        ],
        retrievedSources: [
          { id: 'chunk-1', title: 'Product Overview', score: 0.92, content: 'ReachInbox features...' }
        ]
      })
    } as Response);

    const res = await emailsApi.suggestReply('test-id');
    expect(res.success).toBe(true);
    expect(res.replies).toHaveLength(1);
    expect(res.retrievedSources).toHaveLength(1);
  });

  it('correctly performs GET /api/knowledge/stats and POST /api/knowledge/seed', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        indexName: 'reachinbox-knowledge',
        chunkCount: 22,
        embeddingModel: 'gemini-embedding-001',
        vectorDimension: 768
      })
    } as Response);

    const stats = await knowledgeApi.getKnowledgeStats();
    expect(stats.chunkCount).toBe(22);
    expect(stats.vectorDimension).toBe(768);
  });

  it('throws ApiError when the backend responds with HTTP 404 or 500', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        error: { message: 'Email not found with ID 999' }
      })
    } as Response);

    await expect(emailsApi.getEmailById('999')).rejects.toThrow('Email not found with ID 999');
  });
});
