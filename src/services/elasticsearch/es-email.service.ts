import { config } from '../../config/env.config';
import { EmailDocument, EmailSearchResultItem, SearchEmailsOptions, SearchEmailsResult } from '../../types/email.types';
import { logger } from '../../utils/logger';
import { esClient } from './elasticsearch.client';

export class EsEmailService {
  private indexName: string;

  constructor() {
    this.indexName = config.ELASTICSEARCH_EMAIL_INDEX;
  }

  /**
   * Idempotently indexes or updates an email by its deterministic ID.
   */
  public async indexEmail(email: EmailDocument): Promise<void> {
    try {
      await esClient.index({
        index: this.indexName,
        id: email.id,
        document: email,
        refresh: 'wait_for'
      });
      logger.info(`[ES] Indexed email id=${email.id} (account: ${email.accountId}, subject: "${email.subject.slice(0, 30)}")`);
    } catch (err) {
      logger.error(`[ES] Failed to index email id=${email.id}:`, err);
      throw err;
    }
  }

  /**
   * Bulk indexes multiple emails efficiently.
   */
  public async bulkIndexEmails(emails: EmailDocument[]): Promise<{ indexed: number; errors: number }> {
    if (emails.length === 0) {
      return { indexed: 0, errors: 0 };
    }

    try {
      const operations = emails.flatMap(doc => [
        { index: { _index: this.indexName, _id: doc.id } },
        doc
      ]);

      const response = await esClient.bulk({
        refresh: true,
        operations
      });

      let errorCount = 0;
      if (response.errors) {
        for (const item of response.items) {
          if (item.index && item.index.error) {
            errorCount++;
            logger.error(`[ES Bulk Error] item ${item.index._id}:`, item.index.error);
          }
        }
      }

      const indexedCount = emails.length - errorCount;
      logger.info(`[ES] Bulk indexed ${indexedCount}/${emails.length} emails into '${this.indexName}'`);
      return { indexed: indexedCount, errors: errorCount };
    } catch (err) {
      logger.error('[ES] Bulk indexing failure:', err);
      throw err;
    }
  }

  /**
   * Retrieves an email document by ID.
   */
  public async getEmailById(id: string): Promise<EmailDocument | null> {
    try {
      const res = await esClient.get<EmailDocument>({
        index: this.indexName,
        id
      });
      return res.found ? (res._source as EmailDocument) : null;
    } catch (err: any) {
      if (err.meta && err.meta.statusCode === 404) {
        return null;
      }
      logger.error(`[ES] Failed to fetch email by id=${id}:`, err);
      throw err;
    }
  }

  /**
   * Counts total indexed emails for a specific account.
   */
  public async countEmailsByAccount(accountId: string): Promise<number> {
    try {
      const res = await esClient.count({
        index: this.indexName,
        query: {
          term: { accountId }
        }
      });
      return res.count;
    } catch (err) {
      logger.warn(`[ES] Failed to count emails for account ${accountId}:`, err);
      return 0;
    }
  }

  /**
   * Gets the highest UID indexed for a given account and folder.
   */
  public async getMaxUid(accountId: string, folder: string): Promise<number> {
    try {
      const res = await esClient.search({
        index: this.indexName,
        size: 1,
        query: {
          bool: {
            filter: [
              { term: { accountId } },
              { term: { folder } }
            ]
          }
        },
        sort: [
          { uid: { order: 'desc' } }
        ]
      });

      if (res.hits.hits.length > 0 && res.hits.hits[0]._source) {
        const doc = res.hits.hits[0]._source as EmailDocument;
        return doc.uid || 0;
      }
      return 0;
    } catch (err) {
      logger.warn(`[ES] Failed to get max UID for ${accountId}/${folder}:`, err);
      return 0;
    }
  }

  /**
   * Searches and filters emails using Elasticsearch with full-text scoring,
   * keyword filtering, highlighting, and pagination.
   */
  public async searchEmails(options: SearchEmailsOptions = {}): Promise<SearchEmailsResult> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const from = (page - 1) * limit;

    const boolQuery: any = {
      must: [],
      filter: []
    };

    // Full-text search across boosted fields
    if (options.q && options.q.trim()) {
      boolQuery.must.push({
        multi_match: {
          query: options.q.trim(),
          fields: [
            'subject^3',
            'from.name^2',
            'from.address^2',
            'to.address^1.5',
            'bodyText^1'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    } else {
      boolQuery.must.push({ match_all: {} });
    }

    // Exact keyword filters
    if (options.accountId) {
      boolQuery.filter.push({ term: { accountId: options.accountId } });
    }
    if (options.folder) {
      boolQuery.filter.push({ term: { folder: options.folder } });
    }
    if (options.category) {
      boolQuery.filter.push({ term: { category: options.category } });
    }

    // Sort order: relevance first if 'q' is present, otherwise newest email first
    const sort: any[] = [];
    if (options.q && options.q.trim()) {
      sort.push({ _score: { order: 'desc' } });
      sort.push({ date: { order: 'desc' } });
    } else {
      sort.push({ date: { order: 'desc' } });
    }

    // Highlight search query hits
    const highlight = options.q && options.q.trim() ? {
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
      fields: {
        subject: { number_of_fragments: 0 },
        bodyText: { fragment_size: 150, number_of_fragments: 3 }
      }
    } : undefined;

    try {
      const response = await esClient.search<EmailDocument>({
        index: this.indexName,
        from,
        size: limit,
        query: { bool: boolQuery },
        sort,
        highlight
      });

      const total = typeof response.hits.total === 'number'
        ? response.hits.total
        : (response.hits.total?.value || 0);

      const items: EmailSearchResultItem[] = response.hits.hits.map(hit => ({
        ...(hit._source as EmailDocument),
        highlight: hit.highlight as any,
        score: hit._score
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages
      };
    } catch (err) {
      logger.error('[ES] Search query failed:', err);
      throw err;
    }
  }

  /**
   * Updates AI categorization fields for an existing email in Elasticsearch.
   */
  public async updateEmailCategory(
    id: string,
    classification: { category: string; confidence: number; reasoning?: string }
  ): Promise<void> {
    try {
      await esClient.update({
        index: this.indexName,
        id,
        doc: {
          category: classification.category,
          categoryConfidence: classification.confidence,
          categoryReasoning: classification.reasoning
        },
        refresh: true
      });
      logger.info(`[ES] Updated category for email ${id}: "${classification.category}" (${classification.confidence})`);
    } catch (err) {
      logger.error(`[ES] Failed to update category for email ${id}:`, err);
      throw err;
    }
  }

  /**
   * Deletes an email by ID (useful for tests and cleanup).
   */
  public async deleteEmailById(id: string): Promise<boolean> {
    try {
      await esClient.delete({
        index: this.indexName,
        id,
        refresh: true
      });
      return true;
    } catch (err: any) {
      if (err.meta && err.meta.statusCode === 404) {
        return false;
      }
      logger.error(`[ES] Failed to delete email ${id}:`, err);
      throw err;
    }
  }
}

export const esEmailService = new EsEmailService();

