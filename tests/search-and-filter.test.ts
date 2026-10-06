import request from 'supertest';
import { createApp } from '../src/app';
import { esEmailService } from '../src/services/elasticsearch/es-email.service';
import { EmailDocument } from '../src/types/email.types';

describe('Elasticsearch Search, Filter, and Pagination APIs', () => {
  const app = createApp();

  const testDoc1: EmailDocument = {
    id: 'test_alpha#INBOX#1#1001',
    accountId: 'test_alpha',
    folder: 'INBOX',
    uid: 1001,
    uidValidity: 1,
    messageId: '<test-1001@example.com>',
    subject: 'Enterprise Pricing and Plans Discussion',
    from: { name: 'Alice Walker', address: 'alice@enterprise.org' },
    to: [{ name: 'Sales', address: 'sales@reachinbox.test' }],
    date: new Date('2026-10-01T10:00:00Z'),
    bodyText: 'We would like to see your pricing tiers for large organizations and enterprise security features.',
    bodyHtml: '<p>We would like to see your pricing tiers for large organizations.</p>',
    snippet: 'We would like to see your pricing tiers for large organizations...',
    category: 'Interested',
    categoryConfidence: 0.95,
    notificationSent: false,
    indexedAt: new Date().toISOString()
  };

  const testDoc2: EmailDocument = {
    id: 'test_alpha#INBOX#1#1002',
    accountId: 'test_alpha',
    folder: 'INBOX',
    uid: 1002,
    uidValidity: 1,
    messageId: '<test-1002@example.com>',
    subject: 'Scheduled Demo Meeting Confirmation',
    from: { name: 'Bob Roberts', address: 'bob@techcorp.io' },
    to: [{ name: 'Sales', address: 'sales@reachinbox.test' }],
    date: new Date('2026-10-01T11:00:00Z'),
    bodyText: 'Let us schedule a demo call on Zoom tomorrow afternoon to finalize the contract.',
    bodyHtml: '<p>Let us schedule a demo call on Zoom tomorrow afternoon.</p>',
    snippet: 'Let us schedule a demo call on Zoom tomorrow afternoon...',
    category: 'Meeting Booked',
    categoryConfidence: 0.98,
    notificationSent: false,
    indexedAt: new Date().toISOString()
  };

  const testDoc3: EmailDocument = {
    id: 'test_beta#ARCHIVE#1#1003',
    accountId: 'test_beta',
    folder: 'ARCHIVE',
    uid: 1003,
    uidValidity: 1,
    messageId: '<test-1003@example.com>',
    subject: 'Unsubscribe from Outreach Emails',
    from: { name: 'Charlie Dean', address: 'charlie@decline.net' },
    to: [{ name: 'Outreach', address: 'contact@reachinbox.test' }],
    date: new Date('2026-10-01T08:00:00Z'),
    bodyText: 'Please remove me from your mailing list, not interested at all in cold tools.',
    bodyHtml: '<p>Please remove me from your mailing list, not interested at all.</p>',
    snippet: 'Please remove me from your mailing list, not interested at all...',
    category: 'Not Interested',
    categoryConfidence: 0.99,
    notificationSent: false,
    indexedAt: new Date().toISOString()
  };

  const testDoc4: EmailDocument = {
    id: 'test_beta#INBOX#1#1004',
    accountId: 'test_beta',
    folder: 'INBOX',
    uid: 1004,
    uidValidity: 1,
    messageId: '<test-1004@example.com>',
    subject: 'Special Crypto Loans Promotion',
    from: { name: 'Spammer Bot', address: 'promo@junkmail.biz' },
    to: [{ name: 'Support', address: 'support@reachinbox.test' }],
    date: new Date('2026-10-01T07:00:00Z'),
    bodyText: 'Buy cheap crypto loans now with zero collateral and instant wire transfers.',
    bodyHtml: '<p>Buy cheap crypto loans now.</p>',
    snippet: 'Buy cheap crypto loans now with zero collateral...',
    category: 'Spam',
    categoryConfidence: 0.97,
    notificationSent: false,
    indexedAt: new Date().toISOString()
  };

  beforeAll(async () => {
    // Seed test documents into Elasticsearch
    await esEmailService.bulkIndexEmails([testDoc1, testDoc2, testDoc3, testDoc4]);
  });

  afterAll(async () => {
    // Clean up test documents
    await Promise.all([
      esEmailService.deleteEmailById(testDoc1.id),
      esEmailService.deleteEmailById(testDoc2.id),
      esEmailService.deleteEmailById(testDoc3.id),
      esEmailService.deleteEmailById(testDoc4.id)
    ]);
  });

  describe('GET /api/emails', () => {
    it('returns paginated emails with total count', async () => {
      const res = await request(app).get('/api/emails?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(4);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('filters emails strictly by accountId', async () => {
      const res = await request(app).get('/api/emails?accountId=test_alpha');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((e: EmailDocument) => e.accountId === 'test_alpha')).toBe(true);
    });

    it('filters emails strictly by folder', async () => {
      const res = await request(app).get('/api/emails?folder=ARCHIVE');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((e: EmailDocument) => e.id === testDoc3.id)).toBe(true);
      expect(res.body.data.every((e: EmailDocument) => e.folder === 'ARCHIVE')).toBe(true);
    });

    it('filters emails strictly by category', async () => {
      const res = await request(app).get('/api/emails?category=Meeting%20Booked');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(testDoc2.id);
      expect(res.body.data[0].category).toBe('Meeting Booked');
    });

    it('filters by combined accountId, folder, and category', async () => {
      const res = await request(app).get('/api/emails?accountId=test_alpha&folder=INBOX&category=Interested');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(testDoc1.id);
    });

    it('rejects invalid category with 400', async () => {
      const res = await request(app).get('/api/emails?category=NonExistentCategory');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toHaveProperty('category');
    });

    it('rejects excessive limit with 400', async () => {
      const res = await request(app).get('/api/emails?limit=1000');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toHaveProperty('limit');
    });
  });

  describe('GET /api/emails/:id', () => {
    it('returns full document for valid existing ID', async () => {
      const res = await request(app).get(`/api/emails/${encodeURIComponent(testDoc1.id)}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testDoc1.id);
      expect(res.body.data.subject).toBe(testDoc1.subject);
      expect(res.body.data.bodyHtml).toBeDefined();
      expect(res.body.data.from.address).toBe('alice@enterprise.org');
    });

    it('returns 404 for non-existent ID', async () => {
      const res = await request(app).get('/api/emails/non_existent_doc_id_99999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('not found');
    });
  });

  describe('GET /api/search', () => {
    it('searches full-text query matching subject with high score and highlights', async () => {
      const res = await request(app).get('/api/search?q=pricing');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const hit = res.body.data.find((e: any) => e.id === testDoc1.id);
      expect(hit).toBeDefined();
      expect(hit.highlight).toBeDefined();
      // Verify <mark> tags are present in subject or body highlight
      const hasMark = (hit.highlight.subject && hit.highlight.subject[0].includes('<mark>')) ||
                      (hit.highlight.bodyText && hit.highlight.bodyText[0].includes('<mark>'));
      expect(hasMark).toBe(true);
    });

    it('searches full-text query matching body content', async () => {
      const res = await request(app).get('/api/search?q=Zoom');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((e: any) => e.id === testDoc2.id)).toBe(true);
    });

    it('searches full-text query matching sender name', async () => {
      const res = await request(app).get('/api/search?q=Alice');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.some((e: any) => e.id === testDoc1.id)).toBe(true);
    });

    it('combines full-text search with exact account and category filters', async () => {
      const res = await request(app).get('/api/search?q=demo&accountId=test_alpha&category=Meeting%20Booked');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(testDoc2.id);
    });

    it('returns empty results when search term has no match', async () => {
      const res = await request(app).get('/api/search?q=xyzUnicornNonExistentTerm123');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
      expect(res.body.pagination.total).toBe(0);
    });

    it('delegates to listing when q is empty or absent', async () => {
      const res = await request(app).get('/api/search?folder=INBOX');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
