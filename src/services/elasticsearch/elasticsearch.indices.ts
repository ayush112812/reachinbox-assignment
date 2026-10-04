import { config } from '../../config/env.config';
import { logger } from '../../utils/logger';
import { esClient } from './elasticsearch.client';

export class IndexManager {
  private emailIndexName: string;
  private knowledgeIndexName: string;

  constructor() {
    this.emailIndexName = config.ELASTICSEARCH_EMAIL_INDEX;
    this.knowledgeIndexName = config.ELASTICSEARCH_KNOWLEDGE_INDEX;
  }

  /**
   * Creates the email index with full mapping if it does not already exist.
   */
  public async createEmailIndex(indexName: string = this.emailIndexName): Promise<boolean> {
    try {
      const exists = await esClient.indices.exists({ index: indexName });
      if (exists) {
        logger.info(`Elasticsearch index '${indexName}' already exists.`);
        return false;
      }

      await esClient.indices.create({
        index: indexName,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              email_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop']
              }
            }
          }
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            accountId: { type: 'keyword' },
            folder: { type: 'keyword' },
            uid: { type: 'long' },
            uidValidity: { type: 'long' },
            messageId: { type: 'keyword' },
            threadId: { type: 'keyword' },
            inReplyTo: { type: 'keyword' },
            references: { type: 'keyword' },
            subject: {
              type: 'text',
              analyzer: 'email_analyzer',
              fields: {
                keyword: { type: 'keyword', ignore_above: 256 }
              }
            },
            from: {
              properties: {
                name: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } }
                },
                address: { type: 'keyword' }
              }
            },
            to: {
              properties: {
                name: { type: 'text' },
                address: { type: 'keyword' }
              }
            },
            cc: {
              properties: {
                name: { type: 'text' },
                address: { type: 'keyword' }
              }
            },
            date: { type: 'date' },
            bodyText: {
              type: 'text',
              analyzer: 'email_analyzer'
            },
            bodyHtml: {
              type: 'text',
              index: false
            },
            snippet: { type: 'text' },
            category: { type: 'keyword' },
            categoryConfidence: { type: 'float' },
            categoryReasoning: { type: 'text' },
            notificationSent: { type: 'boolean' },
            indexedAt: { type: 'date' }
          }
        }
      });

      logger.info(`✅ Elasticsearch index '${indexName}' created successfully.`);
      return true;
    } catch (err) {
      logger.error(`Failed to create Elasticsearch index '${indexName}':`, err);
      throw err;
    }
  }

  /**
   * Creates the knowledge vector index with dense_vector mapping for RAG.
   */
  public async createKnowledgeIndex(indexName: string = this.knowledgeIndexName): Promise<boolean> {
    try {
      const exists = await esClient.indices.exists({ index: indexName });
      if (exists) {
        logger.info(`Elasticsearch index '${indexName}' already exists.`);
        await esClient.indices.putMapping({
          index: indexName,
          properties: {
            source: { type: 'keyword' },
            chunkIndex: { type: 'integer' },
            sourceDocument: { type: 'keyword' }
          }
        }).catch((err) => logger.warn(`Could not update mapping for '${indexName}':`, err));
        return false;
      }

      await esClient.indices.create({
        index: indexName,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            title: { type: 'text' },
            content: { type: 'text' },
            category: { type: 'keyword' },
            source: { type: 'keyword' },
            chunkIndex: { type: 'integer' },
            sourceDocument: { type: 'keyword' },
            embedding: {
              type: 'dense_vector',
              dims: 768,
              index: true,
              similarity: 'cosine'
            },
            createdAt: { type: 'date' }
          }
        }
      });

      logger.info(`✅ Elasticsearch index '${indexName}' created successfully.`);
      return true;
    } catch (err) {
      logger.error(`Failed to create Elasticsearch index '${indexName}':`, err);
      throw err;
    }
  }

  /**
   * Initializes both indices if they don't exist.
   */
  public async ensureIndicesExist(): Promise<{ emails: boolean; knowledge: boolean }> {
    const emailsCreated = await this.createEmailIndex();
    const knowledgeCreated = await this.createKnowledgeIndex();
    return { emails: emailsCreated, knowledge: knowledgeCreated };
  }

  /**
   * Checks if required indices currently exist.
   */
  public async checkIndicesExist(): Promise<{ emails: boolean; knowledge: boolean }> {
    try {
      const [emails, knowledge] = await Promise.all([
        esClient.indices.exists({ index: this.emailIndexName }),
        esClient.indices.exists({ index: this.knowledgeIndexName })
      ]);
      return { emails: Boolean(emails), knowledge: Boolean(knowledge) };
    } catch (err) {
      logger.warn('Failed to check index existence:', err);
      return { emails: false, knowledge: false };
    }
  }
}

export const indexManager = new IndexManager();
