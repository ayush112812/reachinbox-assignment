import { Client } from '@elastic/elasticsearch';
import { config } from '../../config/env.config';
import { logger } from '../../utils/logger';

export interface ElasticsearchHealthResult {
  isHealthy: boolean;
  status: 'green' | 'yellow' | 'red' | 'offline';
  clusterName?: string;
  version?: string;
  error?: string;
}

export class ElasticsearchService {
  private static instance: ElasticsearchService;
  public client: Client;

  private constructor() {
    this.client = new Client({
      node: config.ELASTICSEARCH_NODE,
      maxRetries: 3,
      requestTimeout: 10000,
    });
  }

  public static getInstance(): ElasticsearchService {
    if (!ElasticsearchService.instance) {
      ElasticsearchService.instance = new ElasticsearchService();
    }
    return ElasticsearchService.instance;
  }

  public async checkHealth(): Promise<ElasticsearchHealthResult> {
    try {
      const ping = await this.client.ping();
      if (!ping) {
        return { isHealthy: false, status: 'offline', error: 'Ping failed' };
      }

      const [clusterHealth, info] = await Promise.all([
        this.client.cluster.health({}),
        this.client.info(),
      ]);

      const status = clusterHealth.status as 'green' | 'yellow' | 'red';
      return {
        isHealthy: status === 'green' || status === 'yellow',
        status,
        clusterName: info.cluster_name,
        version: info.version.number,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Elasticsearch health check failed:', errorMessage);
      return {
        isHealthy: false,
        status: 'offline',
        error: errorMessage,
      };
    }
  }

  public async close(): Promise<void> {
    try {
      await this.client.close();
      logger.info('Elasticsearch client closed successfully');
    } catch (err) {
      logger.error('Error closing Elasticsearch client:', err);
    }
  }
}

export const esService = ElasticsearchService.getInstance();
export const esClient = esService.client;
