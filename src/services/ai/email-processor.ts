import { EmailDocument } from '../../types/email.types';
import { logger } from '../../utils/logger';
import { esEmailService } from '../elasticsearch/es-email.service';
import { emailEvents, NewEmailEventPayload } from '../events/email-events';
import { notificationOrchestrator } from '../notification/notification-orchestrator';
import { CategorizationResult, ICategorizationService } from './categorization.interface';
import { categorizationService } from './categorization.service';

export class EmailProcessor {
  private static instance: EmailProcessor;
  private isListening: boolean = false;
  private aiService: ICategorizationService;

  constructor(customAiService?: ICategorizationService) {
    this.aiService = customAiService || categorizationService;
  }

  public static getInstance(): EmailProcessor {
    if (!EmailProcessor.instance) {
      EmailProcessor.instance = new EmailProcessor();
    }
    return EmailProcessor.instance;
  }

  public setAiService(service: ICategorizationService): void {
    this.aiService = service;
  }

  /**
   * Initializes event listener for new incoming emails
   */
  public initialize(): void {
    if (this.isListening) return;

    emailEvents.on('email:new', async (payload: NewEmailEventPayload) => {
      // Auto-categorize real-time incoming emails immediately so notifications trigger
      // Historical emails are safely indexed in Elasticsearch and categorized on-demand
      // to prevent exhausting Gemini Free Tier rate limits (15 RPM) during startup sync
      if (payload.isRealtime) {
        await this.processIncomingEmail(payload.email, payload.isRealtime);
      }
    });

    this.isListening = true;
    logger.info('[Email Processor] Subscribed to email:new event pipeline');
  }

  /**
   * Processes an incoming email through categorization and notification
   */
  public async processIncomingEmail(
    email: EmailDocument,
    isRealtime: boolean
  ): Promise<CategorizationResult> {
    logger.info(`[Email Processor] Processing email ${email.id} (realtime: ${isRealtime}, subject: "${email.subject.slice(0, 30)}")`);

    try {
      // 1. Run AI categorization
      const classification = await this.aiService.categorize({
        subject: email.subject,
        from: email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address,
        body: email.bodyText
      });

      // 2. Persist updated category in Elasticsearch
      await esEmailService.updateEmailCategory(email.id, classification);

      // Emit categorized event for real-time subscribers (SSE)
      emailEvents.emitEmailCategorized({
        emailId: email.id,
        category: classification.category,
        confidence: classification.confidence,
        reasoning: classification.reasoning
      });

      // 3. Dispatch notifications (Strictly for real-time Interested emails only)
      if (classification.category === 'Interested' && isRealtime) {
        await notificationOrchestrator.handleEmailCategorized({
          email,
          classification,
          isRealtime
        });
      }

      return classification;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[Email Processor] Failed to process email ${email.id}:`, msg);
      return {
        category: 'Uncategorized',
        confidence: 0,
        reasoning: `Processing error: ${msg}`
      };
    }
  }

  /**
   * Manually re-categorizes an email by ID without dispatching notifications.
   */
  public async processEmailManually(emailId: string): Promise<CategorizationResult | null> {
    const email = await esEmailService.getEmailById(emailId);
    if (!email) {
      logger.warn(`[Email Processor] Cannot recategorize non-existent email: ${emailId}`);
      return null;
    }

    logger.info(`[Email Processor] Manual recategorization triggered for email ${emailId}`);

    const classification = await this.aiService.categorize({
      subject: email.subject,
      from: email.from.name ? `${email.from.name} <${email.from.address}>` : email.from.address,
      body: email.bodyText
    });

    // Update in Elasticsearch
    await esEmailService.updateEmailCategory(email.id, classification);

    // Emit categorized event for real-time subscribers (SSE)
    emailEvents.emitEmailCategorized({
      emailId: email.id,
      category: classification.category,
      confidence: classification.confidence,
      reasoning: classification.reasoning
    });

    // Note: Manual categorization explicitly does NOT trigger duplicate notifications
    return classification;
  }
}

export const emailProcessor = EmailProcessor.getInstance();
