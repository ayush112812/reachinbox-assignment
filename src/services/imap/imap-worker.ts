import { ImapFlow, MailboxLockObject } from 'imapflow';
import { ImapAccountConfig, ImapAccountStatus, ImapConnectionState } from '../../types/imap.types';
import { logger } from '../../utils/logger';
import { esEmailService } from '../elasticsearch/es-email.service';
import { emailEvents } from '../events/email-events';
import { ImapParser } from './imap-parser';

export class ImapWorker {
  public account: ImapAccountConfig;
  public state: ImapConnectionState = 'DISCONNECTED';
  private client: ImapFlow | null = null;
  private currentLock: MailboxLockObject | null = null;
  private isRunning: boolean = false;
  private isIdling: boolean = false;
  private isSyncing: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectDelay: number = 60000;
  private highestKnownUid: number = 0;
  private uidValidity: number = 0;
  private totalIndexed: number = 0;
  private lastSyncAt: string | undefined;
  private lastError: string | undefined;

  constructor(account: ImapAccountConfig) {
    this.account = account;
  }

  /**
   * Initializes and starts the worker lifecycle.
   */
  public async start(): Promise<void> {
    this.isRunning = true;
    await this.connectAndSync();
  }

  /**
   * Main connection, sync, and idle loop.
   */
  private async connectAndSync(): Promise<void> {
    if (!this.isRunning) return;

    this.state = 'CONNECTING';
    logger.info(`[${this.account.id}] Connecting to ${this.account.host}:${this.account.port} over TLS...`);

    try {
      this.client = new ImapFlow({
        host: this.account.host,
        port: this.account.port,
        secure: this.account.secure,
        auth: {
          user: this.account.user,
          pass: this.account.pass
        },
        logger: false,
        emitLogs: false
      });

      // Register event listeners
      this.setupEventListeners();

      await this.client.connect();
      this.state = 'CONNECTED';
      this.reconnectAttempts = 0;
      this.lastError = undefined;
      logger.info(`[${this.account.id}] Connected`);

      // Acquire lock on INBOX
      this.currentLock = await this.client.getMailboxLock('INBOX');
      if (this.client.mailbox) {
        this.uidValidity = Number(this.client.mailbox.uidValidity || 0);
      }

      // Check existing max UID in Elasticsearch to resume smoothly
      const existingMaxUid = await esEmailService.getMaxUid(this.account.id, 'INBOX');
      this.highestKnownUid = Math.max(this.highestKnownUid, existingMaxUid);

      // Perform historical synchronization (last 30 days)
      await this.syncHistorical(30);

      // Enter persistent IDLE mode
      await this.startIdle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state = 'ERROR';
      this.lastError = msg;
      logger.error(`[${this.account.id}] Connection/Sync error: ${msg}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Configures IMAP server event handlers
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('error', (err: Error) => {
      logger.error(`[${this.account.id}] IMAP error:`, err.message);
      this.lastError = err.message;
      if (this.state !== 'RECONNECTING') {
        this.scheduleReconnect();
      }
    });

    this.client.on('close', () => {
      logger.warn(`[${this.account.id}] Connection closed by server`);
      this.isIdling = false;
      if (this.isRunning && this.state !== 'RECONNECTING') {
        this.scheduleReconnect();
      }
    });

    // Real-time server push notification when new email arrives
    this.client.on('exists', async (data: { path: string; count: number; prevCount: number }) => {
      logger.info(`[${this.account.id}] Mailbox exists event: ${data.count} messages (previously: ${data.prevCount})`);
      if (data.count > data.prevCount) {
        await this.handleNewMessages(data.prevCount, data.count);
      }
    });
  }

  /**
   * Fetches messages received within the last 30 days and indexes them.
   */
  public async syncHistorical(daysBack: number = 30): Promise<void> {
    if (!this.client || !this.client.usable) return;

    this.state = 'SYNCING';
    this.isSyncing = true;
    logger.info(`[${this.account.id}] Initial sync started (last ${daysBack} days)`);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Server-side search for emails since cutoffDate
      const uids = await this.client.search({ since: cutoffDate }, { uid: true });

      if (!uids || uids.length === 0) {
        logger.info(`[${this.account.id}] Historical sync completed: 0 messages found in last ${daysBack} days`);
        this.lastSyncAt = new Date().toISOString();
        this.isSyncing = false;
        return;
      }

      logger.info(`[${this.account.id}] Found ${uids.length} messages to sync from last ${daysBack} days`);

      // Process in batches of 20 to preserve memory
      const batchSize = 20;
      let syncedCount = 0;

      for (let i = 0; i < uids.length; i += batchSize) {
        if (!this.isRunning) break;

        const batchUids = uids.slice(i, i + batchSize);
        const parsedBatch = [];

        for await (const message of this.client.fetch(batchUids, {
          source: true,
          uid: true,
          envelope: true,
          internalDate: true
        })) {
          try {
            if (!message.source) {
              logger.warn(`[${this.account.id}] Message UID ${message.uid} has empty source, skipping`);
              continue;
            }

            const parsed = await ImapParser.parseMessage(message.source, {
              accountId: this.account.id,
              folder: 'INBOX',
              uid: message.uid,
              uidValidity: this.uidValidity
            });

            parsedBatch.push(parsed);
            if (message.uid > this.highestKnownUid) {
              this.highestKnownUid = message.uid;
            }
          } catch (parseErr) {
            logger.error(`[${this.account.id}] Failed to parse message UID ${message.uid}:`, parseErr);
          }
        }

        if (parsedBatch.length > 0) {
          await esEmailService.bulkIndexEmails(parsedBatch);
          syncedCount += parsedBatch.length;
          this.totalIndexed += parsedBatch.length;

          // Emit for background AI categorization without triggering real-time notifications
          for (const doc of parsedBatch) {
            emailEvents.emitNewEmail(doc, false);
          }
        }
      }

      this.lastSyncAt = new Date().toISOString();
      logger.info(`[${this.account.id}] Historical sync completed: ${syncedCount} messages`);
      emailEvents.emitSyncComplete(this.account.id, syncedCount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[${this.account.id}] Historical sync error:`, msg);
      this.lastError = msg;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Processes new messages triggered by real-time IDLE exists event.
   */
  private async handleNewMessages(prevCount: number, count: number): Promise<void> {
    if (!this.client || !this.client.usable) return;

    logger.info(`[${this.account.id}] Processing ${count - prevCount} new incoming message(s)...`);

    try {
      // Fetch new messages by sequence range
      const fetchRange = `${prevCount + 1}:${count}`;

      for await (const message of this.client.fetch(fetchRange, {
        source: true,
        uid: true,
        envelope: true,
        internalDate: true
      })) {
        logger.info(`[${this.account.id}] New message detected UID=${message.uid}`);

        try {
          if (!message.source) {
            logger.warn(`[${this.account.id}] New message UID ${message.uid} has empty source, skipping`);
            continue;
          }

          const parsed = await ImapParser.parseMessage(message.source, {
            accountId: this.account.id,
            folder: 'INBOX',
            uid: message.uid,
            uidValidity: this.uidValidity
          });

          await esEmailService.indexEmail(parsed);
          this.totalIndexed++;
          if (message.uid > this.highestKnownUid) {
            this.highestKnownUid = message.uid;
          }

          logger.info(`[${this.account.id}] Email indexed id=${parsed.id}`);

          // Emit application event for downstream AI categorization and webhook processing
          emailEvents.emitNewEmail(parsed, true);
        } catch (parseErr) {
          logger.error(`[${this.account.id}] Failed to parse/index new message UID=${message.uid}:`, parseErr);
        }
      }
    } catch (err) {
      logger.error(`[${this.account.id}] Error handling new message notification:`, err);
    }
  }

  /**
   * Keeps the connection idling in persistent IDLE mode.
   */
  private async startIdle(): Promise<void> {
    if (!this.client || !this.client.usable || !this.isRunning) return;

    this.state = 'IDLE';
    this.isIdling = true;
    logger.info(`[${this.account.id}] Entering IMAP IDLE`);

    // Setup RFC 2177 keepalive timer (every 15 minutes) to prevent silent TCP drops
    this.setupKeepalive();

    try {
      while (this.isRunning && this.client && this.client.usable) {
        // imapflow's idle() keeps the connection alive until interrupted
        await this.client.idle();
      }
    } catch (err) {
      if (this.isRunning) {
        logger.warn(`[${this.account.id}] IDLE interrupted:`, err);
        this.scheduleReconnect();
      }
    } finally {
      this.isIdling = false;
    }
  }

  /**
   * Refreshes the IDLE connection every 15 minutes to satisfy RFC 2177 keepalive
   */
  private setupKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
    }

    // Refresh every 15 minutes (900,000 ms)
    this.keepaliveInterval = setInterval(async () => {
      if (this.client && this.client.usable && this.isIdling) {
        try {
          logger.debug(`[${this.account.id}] Sending RFC 2177 keepalive NOOP`);
          await this.client.noop();
        } catch (err) {
          logger.warn(`[${this.account.id}] Keepalive ping failed:`, err);
        }
      }
    }, 15 * 60 * 1000);
  }

  /**
   * Schedules an automatic reconnection with exponential backoff and jitter.
   */
  private scheduleReconnect(): void {
    if (!this.isRunning || this.reconnectTimeout) return;

    this.state = 'RECONNECTING';
    this.isIdling = false;
    this.reconnectAttempts++;

    // Exponential backoff: 5s, 10s, 20s, up to maxReconnectDelay
    const baseDelay = Math.min(5000 * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    const jitter = Math.floor(Math.random() * 2000);
    const delay = baseDelay + jitter;

    logger.info(`[${this.account.id}] Scheduling reconnect attempt #${this.reconnectAttempts} in ${(delay / 1000).toFixed(1)}s`);

    this.cleanupClient();

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      if (this.isRunning) {
        await this.connectAndSync();
      }
    }, delay);
  }

  /**
   * Cleans up the active client connection and locks
   */
  private cleanupClient(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }

    if (this.currentLock) {
      try {
        this.currentLock.release();
      } catch {
        // ignore lock release errors during teardown
      }
      this.currentLock = null;
    }

    if (this.client) {
      try {
        this.client.close();
      } catch {
        // ignore close errors during teardown
      }
      this.client = null;
    }
  }

  /**
   * Gracefully shuts down the worker
   */
  public async stop(): Promise<void> {
    logger.info(`[${this.account.id}] Stopping worker...`);
    this.isRunning = false;
    this.state = 'DISCONNECTED';

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.cleanupClient();
    logger.info(`[${this.account.id}] Worker stopped successfully`);
  }

  /**
   * Returns current account status for API inspection
   */
  public getStatus(): ImapAccountStatus {
    return {
      id: this.account.id,
      user: this.account.user,
      host: this.account.host,
      port: this.account.port,
      secure: this.account.secure,
      status: this.state,
      isIdling: this.isIdling,
      mailbox: 'INBOX',
      uidValidity: this.uidValidity,
      totalEmailsInMailbox: this.client?.mailbox ? this.client.mailbox.exists : undefined,
      totalIndexed: this.totalIndexed,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError
    };
  }
}
