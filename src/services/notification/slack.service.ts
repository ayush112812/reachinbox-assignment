import axios from 'axios';
import { config } from '../../config/env.config';
import { EmailDocument } from '../../types/email.types';
import { logger } from '../../utils/logger';
import { CategorizationResult } from '../ai/categorization.interface';

export class SlackService {
  private webhookUrl: string | undefined;

  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl !== undefined ? webhookUrl : config.SLACK_WEBHOOK_URL;
  }

  public setWebhookUrl(url: string | undefined): void {
    this.webhookUrl = url;
  }

  /**
   * Dispatches a structured Slack Block Kit notification for an 'Interested' email.
   */
  public async sendInterestedNotification(
    email: EmailDocument,
    classification: CategorizationResult
  ): Promise<boolean> {
    if (!this.webhookUrl || this.webhookUrl.trim() === '') {
      logger.info('[Slack] SLACK_WEBHOOK_URL not configured, skipping Slack alert.');
      return false;
    }

    const payload = {
      text: `🔥 High-Intent Lead Detected from ${email.from.address}: "${email.subject}"`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🎯 High-Intent Prospect Email Detected',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Account:*\n\`${email.accountId}\``
            },
            {
              type: 'mrkdwn',
              text: `*From:*\n${email.from.name ? email.from.name + ' ' : ''}<${email.from.address}>`
            },
            {
              type: 'mrkdwn',
              text: `*Category:*\n*${classification.category}* (${(classification.confidence * 100).toFixed(0)}% confidence)`
            },
            {
              type: 'mrkdwn',
              text: `*Date:*\n${new Date(email.date).toLocaleDateString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Subject:*\n${email.subject}\n\n*Snippet:*\n> ${email.snippet}\n\n*AI Reasoning:*\n_${classification.reasoning}_`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Email ID: \`${email.id}\` | ReachInbox Automated Lead Triage`
            }
          ]
        }
      ]
    };

    try {
      const response = await axios.post(this.webhookUrl, payload, {
        timeout: 8000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info(`[Slack] Successfully delivered notification for email ${email.id}`);
        return true;
      }

      logger.warn(`[Slack] Webhook returned non-2xx status: ${response.status}`);
      return false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[Slack] Failed to send webhook alert for email ${email.id}:`, msg);
      return false;
    }
  }
}

export const slackService = new SlackService();
