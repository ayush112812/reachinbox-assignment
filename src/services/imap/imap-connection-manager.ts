import { loadImapAccounts } from '../../config/accounts.config';
import { ImapAccountConfig, ImapAccountStatus } from '../../types/imap.types';
import { logger } from '../../utils/logger';
import { ImapWorker } from './imap-worker';

export class ImapConnectionManager {
  private static instance: ImapConnectionManager;
  private workers: Map<string, ImapWorker> = new Map();

  private constructor() {}

  public static getInstance(): ImapConnectionManager {
    if (!ImapConnectionManager.instance) {
      ImapConnectionManager.instance = new ImapConnectionManager();
    }
    return ImapConnectionManager.instance;
  }

  /**
   * Initializes all configured IMAP accounts and starts their independent workers.
   */
  public async initialize(customAccounts?: ImapAccountConfig[]): Promise<void> {
    const accounts = customAccounts || loadImapAccounts();

    logger.info(`[IMAP Manager] Initializing IMAP Manager with ${accounts.length} account(s)...`);

    if (accounts.length === 0) {
      logger.warn('[IMAP Manager] No active IMAP accounts configured in environment. Workers will remain dormant until credentials are provided.');
      return;
    }

    // Start each account worker independently
    for (const account of accounts) {
      const worker = new ImapWorker(account);
      this.workers.set(account.id, worker);

      // Start without blocking sibling workers so one failure does not halt others
      worker.start().catch((err) => {
        logger.error(`[IMAP Manager] Initial worker start failed for account ${account.id}:`, err);
      });
    }

    logger.info(`[IMAP Manager] Successfully registered ${this.workers.size} IMAP account worker(s).`);
  }

  /**
   * Returns connection status for all accounts.
   */
  public getAccountStatuses(): ImapAccountStatus[] {
    const statuses: ImapAccountStatus[] = [];
    for (const worker of this.workers.values()) {
      statuses.push(worker.getStatus());
    }
    return statuses;
  }

  /**
   * Returns connection status for a specific account.
   */
  public getAccountStatus(accountId: string): ImapAccountStatus | null {
    const worker = this.workers.get(accountId);
    return worker ? worker.getStatus() : null;
  }

  /**
   * Triggers manual synchronization for a specific account.
   */
  public async triggerManualSync(accountId: string, daysBack: number = 30): Promise<boolean> {
    const worker = this.workers.get(accountId);
    if (!worker) {
      logger.warn(`[IMAP Manager] Manual sync requested for non-existent account: ${accountId}`);
      return false;
    }

    logger.info(`[IMAP Manager] Manual sync initiated for account: ${accountId} (${daysBack} days)`);
    await worker.syncHistorical(daysBack);
    return true;
  }

  /**
   * Adds or replaces an account dynamically at runtime.
   */
  public async addOrUpdateAccount(account: ImapAccountConfig): Promise<void> {
    const existing = this.workers.get(account.id);
    if (existing) {
      await existing.stop();
    }

    const worker = new ImapWorker(account);
    this.workers.set(account.id, worker);
    worker.start().catch((err) => {
      logger.error(`[IMAP Manager] Worker start failed for account ${account.id}:`, err);
    });
  }

  /**
   * Gracefully shuts down all workers.
   */
  public async shutdown(): Promise<void> {
    logger.info(`[IMAP Manager] Shutting down ${this.workers.size} worker(s)...`);
    const stopPromises = Array.from(this.workers.values()).map(worker => worker.stop());
    await Promise.allSettled(stopPromises);
    this.workers.clear();
    logger.info('[IMAP Manager] All IMAP workers stopped.');
  }
}

export const imapConnectionManager = ImapConnectionManager.getInstance();
