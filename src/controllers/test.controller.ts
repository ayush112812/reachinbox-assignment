import { Request, Response, NextFunction } from 'express';
import { EmailDocument } from '../types/email.types';
import { slackService } from '../services/notification/slack.service';
import { webhookService } from '../services/notification/webhook.service';

export class TestController {
  /**
   * POST /api/test/webhook
   * Allows manual triggering and testing of Slack and Webhook.site delivery
   */
  public static async testWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subject = req.body?.subject || 'Enterprise Inbound Lead - ReachInbox Test';
      const fromAddress = req.body?.from || 'lead@acmecorp.com';
      const snippet = req.body?.snippet || 'We are looking to scale our outreach and would like to demo your enterprise platform.';

      const testEmail: EmailDocument = {
        id: `test_demo#INBOX#1#${Date.now()}`,
        accountId: 'test_demo_account',
        folder: 'INBOX',
        uid: Math.floor(Math.random() * 10000),
        messageId: `<test-demo-${Date.now()}@reachinbox.test>`,
        subject,
        from: { name: 'Demo Lead', address: fromAddress },
        to: [{ name: 'ReachInbox Sales', address: 'sales@reachinbox.test' }],
        date: new Date().toISOString(),
        bodyText: snippet,
        bodyHtml: `<p>${snippet}</p>`,
        snippet,
        category: 'Interested',
        categoryConfidence: 0.98,
        categoryReasoning: 'Prospect explicitly requested enterprise demo and licensing details.',
        notificationSent: false,
        indexedAt: new Date().toISOString()
      };

      const classification = {
        category: 'Interested' as const,
        confidence: 0.98,
        reasoning: 'Prospect explicitly requested enterprise demo and licensing details.'
      };

      const [slackResult, webhookResult] = await Promise.allSettled([
        slackService.sendInterestedNotification(testEmail, classification),
        webhookService.sendInterestedNotification(testEmail, classification)
      ]);

      const slackSuccess = slackResult.status === 'fulfilled' && slackResult.value === true;
      const webhookSuccess = webhookResult.status === 'fulfilled' && webhookResult.value === true;

      res.json({
        success: true,
        message: 'Notification test executed',
        details: {
          testEmailId: testEmail.id,
          slackDelivered: slackSuccess,
          webhookDelivered: webhookSuccess
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
