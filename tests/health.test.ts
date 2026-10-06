import http from 'http';
import request from 'supertest';
import { createApp } from '../src/app';

describe('Health API Integration', () => {
  const app = createApp();

  it('GET /health returns health status payload', async () => {
    const res = await request(app).get('/health');
    // Even if ES is starting up or healthy, HTTP endpoint should respond with appropriate JSON structure
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('services');
    expect(res.body.services).toHaveProperty('elasticsearch');
    expect(res.body.services.elasticsearch.indices).toHaveProperty('emailsIndex');
    expect(res.body.services.elasticsearch.indices).toHaveProperty('knowledgeIndex');
  });

  it('GET /non-existent-route returns 404 JSON', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        message: 'Route not found: GET /non-existent-route'
      }
    });
  });

  it('GET /api/events establishes SSE connection with event-stream header', (done) => {
    const server = http.createServer(app);
    let serverSocket: import('net').Socket | null = null;
    server.on('connection', (socket) => {
      serverSocket = socket;
    });

    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 4000;

      const req = http.get(`http://localhost:${port}/api/events`, (res) => {
        expect(res.headers['content-type']).toContain('text/event-stream');
        expect(res.headers['cache-control']).toContain('no-cache');

        const finish = () => {
          server.close(() => {
            done();
          });
        };

        if (serverSocket) {
          (serverSocket as import('net').Socket).once('close', () => {
            setTimeout(finish, 20);
          });
        }

        res.on('data', () => {
          req.destroy();
          if (!serverSocket) {
            setTimeout(finish, 50);
          }
        });
      });
    });
  });
});
