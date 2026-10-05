import { EmailDocument } from '../../types/email.types';
import { logger } from '../../utils/logger';
import { CategorizationResult } from '../ai/categorization.interface';
import { esEmailService } from '../elasticsearch/es-email.service';
import { esClient } from '../elasticsearch/elasticsearch.client';
import { SlackService, slackService } from './slack.service';
import { WebhookService, webhookService } from './webhook.service';

export interface DispatchNotificationOptions {
  email: EmailDocument;
  classification: CategorizationResult;
  isRealtime: boolean;
}

export class NotificationOrchestrator {
  private static instance: NotificationOrchestrator;
  private slack: SlackService;
  private webhook: WebhookService;
  private inFlightDispatches: Set<string> = new Set();

  constructor(customSlack?: SlackService, customWebhook?: WebhookService) {
    this.slack = customSlack || slackService;
    this.webhook = customWebhook || webhookService;
  }

  public static getInstance(): NotificationOrchestrator {
    if (!NotificationOrchestrator.instance) {
      NotificationOrchestrator.instance = new NotificationOrchestrator();
    }
    return NotificationOrchestrator.instance;
  }

  /**
   * Sets custom notification services for testing or dynamic substitution
   */
  public setServices(slack: SlackService, webhook: WebhookService): void {
    this.slack = slack;
    this.webhook = webhook;
  }

  /**
   * Evaluates eligibility and orchestrates Slack and external Webhook alerts
   */
  public async handleEmailCategorized(options: DispatchNotificationOptions): Promise<boolean> {
    const { email, classification, isRealtime } = options;

    // Rule 1: Only notify for 'Interested' category
    if (classification.category !== 'Interested') {
      logger.debug(`[Orchestrator] Email ${email.id} categorized as "${classification.category}". Notifications skipped.`);
      return false;
    }

    // Rule 2: Only notify for real-time incoming emails, NEVER historical emails
    if (!isRealtime) {
      logger.info(`[Orchestrator] Email ${email.id} is from historical synchronization. Notifications suppressed.`);
      return false;
    }

    // Rule 3: Deduplication check - verify in-memory in-flight lock to avoid race conditions
    if (this.inFlightDispatches.has(email.id)) {
      logger.warn(`[Orchestrator] Notification dispatch already in flight for email ${email.id}. Skipping duplicate.`);
      return false;
    }

    // Rule 4: Persistent deduplication check from Elasticsearch
    try {
      const freshDoc = await esEmailService.getEmailById(email.id);
      if (freshDoc && freshDoc.notificationSent) {
        logger.info(`[Orchestrator] Notification already sent for email ${email.id}. Deduplicated.`);
        return false;
      }
    } catch (err) {
      logger.warn(`[Orchestrator] Could not verify existing notification state for ${email.id}:`, err);
    }

    // Lock in-flight
    this.inFlightDispatches.add(email.id);
    logger.info(`[Orchestrator] 🚀 Dispatching notifications for 'Interested' email ${email.id}`);

    try {
      // Dispatch Slack and Webhook independently and concurrently
      const [slackResult, webhookResult] = await Promise.allSettled([
        this.slack.sendInterestedNotification(email, classification),
        this.webhook.sendInterestedNotification(email, classification)
      ]);

      const slackSuccess = slackResult.status === 'fulfilled' && slackResult.value === true;
      const webhookSuccess = webhookResult.status === 'fulfilled' && webhookResult.value === true;

      // If at least one channel was delivered successfully, mark notificationSent = true in Elasticsearch
      if (slackSuccess || webhookSuccess) {
        await this.markNotificationSent(email.id);
        logger.info(`[Orchestrator] Notifications dispatched (Slack: ${slackSuccess}, Webhook: ${webhookSuccess}) for ${email.id}`);
        return true;
      } else {
        logger.warn(`[Orchestrator] Neither Slack nor Webhook succeeded for email ${email.id}. Notification flag not updated.`);
        return false;
      }
    } finally {
      this.inFlightDispatches.delete(email.id);
    }
  }

  /**
   * Persistently marks notificationSent = true in Elasticsearch
   */
  private async markNotificationSent(emailId: string): Promise<void> {
    try {
      await esClient.update({
        index: 'reachinbox-emails',
        id: emailId,
        doc: {
          notificationSent: true
        },
        refresh: true
      });
      logger.info(`[Orchestrator] Persisted notificationSent=true for email ${emailId}`);
    } catch (err) {
      logger.error(`[Orchestrator] Failed to persist notificationSent for ${emailId}:`, err);
    }
  }
}

export const notificationOrchestrator = NotificationOrchestrator.getInstance();
