import http from 'http';
import { createApp } from './app';
import { config } from './config/env.config';
import { esService } from './services/elasticsearch/elasticsearch.client';
import { indexManager } from './services/elasticsearch/elasticsearch.indices';
import { imapConnectionManager } from './services/imap/imap-connection-manager';
import { emailProcessor } from './services/ai/email-processor';
import { logger } from './utils/logger';

const startServer = async (): Promise<http.Server> => {
  const app = createApp();
  const server = http.createServer(app);

  try {
    logger.info('Checking Elasticsearch connectivity...');
    const esHealth = await esService.checkHealth();
    if (esHealth.isHealthy) {
      logger.info(`Connected to Elasticsearch cluster '${esHealth.clusterName}' (v${esHealth.version}) with status: ${esHealth.status}`);
      await indexManager.ensureIndicesExist();
    } else {
      logger.warn(`Elasticsearch is not currently available (${esHealth.status}). Server will start, but ES-dependent features will wait.`);
    }

    // Initialize AI email processing and notification pipeline
    emailProcessor.initialize();

    // Initialize multi-account persistent IMAP connections
    await imapConnectionManager.initialize();

    server.listen(config.PORT, () => {
      logger.info(`🚀 ReachInbox Backend server running on http://localhost:${config.PORT} [${config.NODE_ENV}]`);
      logger.info(`Health check available at http://localhost:${config.PORT}/health`);
      logger.info(`Accounts status available at http://localhost:${config.PORT}/api/accounts`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await imapConnectionManager.shutdown();
          await esService.close();
          logger.info('Graceful shutdown completed successfully.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', err);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        logger.error('Graceful shutdown timed out, forcing exit.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    return server;
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export { startServer };
