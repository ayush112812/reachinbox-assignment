import request from 'supertest';
import { createApp } from '../src/app';
import { imapConnectionManager } from '../src/services/imap/imap-connection-manager';

describe('Accounts API Endpoints', () => {
  const app = createApp();

  beforeAll(async () => {
    // Register two mock accounts into the connection manager for API test coverage
    await imapConnectionManager.initialize([
      {
        id: 'test_account_1',
        user: 'user1@reachinbox.test',
        pass: 'pass1',
        host: '127.0.0.1',
        port: 993,
        secure: true
      },
      {
        id: 'test_account_2',
        user: 'user2@reachinbox.test',
        pass: 'pass2',
        host: '127.0.0.1',
        port: 993,
        secure: true
      }
    ]);
  });

  afterAll(async () => {
    await imapConnectionManager.shutdown();
  });

  it('GET /api/accounts returns list of configured accounts', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThanOrEqual(2);

    const acc1 = res.body.data.find((a: any) => a.id === 'test_account_1');
    expect(acc1).toBeDefined();
    expect(acc1.user).toBe('user1@reachinbox.test');
    expect(acc1).toHaveProperty('status');
    expect(acc1).toHaveProperty('isIdling');
    expect(acc1).not.toHaveProperty('pass'); // Secrets must not leak
  });

  it('GET /api/accounts/:id returns single account status', async () => {
    const res = await request(app).get('/api/accounts/test_account_1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('test_account_1');
    expect(res.body.data.host).toBe('127.0.0.1');
  });

  it('GET /api/accounts/:id returns 404 for unknown account', async () => {
    const res = await request(app).get('/api/accounts/non_existent_account');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/accounts/:id/sync triggers manual sync request', async () => {
    const res = await request(app)
      .post('/api/accounts/test_account_1/sync')
      .send({ daysBack: 15 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Synchronization triggered');
  });
});
