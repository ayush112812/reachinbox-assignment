import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.config';
import { esService } from '../services/elasticsearch/elasticsearch.client';
import { indexManager } from '../services/elasticsearch/elasticsearch.indices';
import { imapConnectionManager } from '../services/imap/imap-connection-manager';

export class HealthController {
  public static async getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      const esHealth = await esService.checkHealth();
      const indicesStatus = await indexManager.checkIndicesExist();
      const latencyMs = Date.now() - startTime;
      const imapStatuses = imapConnectionManager.getAccountStatuses();

      const isDegraded = !esHealth.isHealthy;
      const statusCode = isDegraded ? 503 : 200;

      res.status(statusCode).json({
        status: isDegraded ? 'degraded' : 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.NODE_ENV,
        services: {
          elasticsearch: {
            status: esHealth.status,
            healthy: esHealth.isHealthy,
            cluster: esHealth.clusterName,
            version: esHealth.version,
            latencyMs,
            indices: {
              emailsIndex: {
                name: config.ELASTICSEARCH_EMAIL_INDEX,
                exists: indicesStatus.emails
              },
              knowledgeIndex: {
                name: config.ELASTICSEARCH_KNOWLEDGE_INDEX,
                exists: indicesStatus.knowledge
              }
            },
            ...(esHealth.error && { error: esHealth.error })
          },
          imap: {
            accountsCount: imapStatuses.length,
            accounts: imapStatuses
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
