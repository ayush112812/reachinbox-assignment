import axios from 'axios';
import { config } from '../../config/env.config';
import { EmailDocument } from '../../types/email.types';
import { logger } from '../../utils/logger';
import { CategorizationResult } from '../ai/categorization.interface';

export class WebhookService {
  private webhookUrl: string | undefined;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl !== undefined ? webhookUrl : config.EXTERNAL_WEBHOOK_URL;
  }

  public setWebhookUrl(url: string | undefined): void {
    this.webhookUrl = url;
  }

  /**
   * Sends structured JSON webhook payload to external URL (e.g. webhook.site)
   */
  public async sendInterestedNotification(
    email: EmailDocument,
    classification: CategorizationResult
  ): Promise<boolean> {
    if (!this.webhookUrl || this.webhookUrl.trim() === '') {
      logger.info('[Webhook] EXTERNAL_WEBHOOK_URL not configured, skipping external webhook.');
      return false;
    }

    const payload = {
      event: 'email.interested',
      timestamp: new Date().toISOString(),
      email: {
        id: email.id,
        accountId: email.accountId,
        folder: email.folder,
        messageId: email.messageId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        date: email.date,
        snippet: email.snippet
      },
      classification: {
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      }
    };

    try {
      const response = await axios.post(this.webhookUrl, payload, {
        timeout: 8000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`[Webhook] Successfully delivered event to ${this.webhookUrl} for email ${email.id}`);
        return true;
      }

      logger.warn(`[Webhook] External endpoint returned status: ${response.status}`);
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[Webhook] Failed to deliver external webhook for email ${email.id}:`, msg);
      return false;
    }
  }
}

export const webhookService = new WebhookService();
