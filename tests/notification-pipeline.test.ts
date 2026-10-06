import request from 'supertest';
import { createApp } from '../src/app';
import { categorizationService } from '../src/services/ai/categorization.service';
import { emailProcessor } from '../src/services/ai/email-processor';
import { esEmailService } from '../src/services/elasticsearch/es-email.service';
import { notificationOrchestrator } from '../src/services/notification/notification-orchestrator';
import { SlackService } from '../src/services/notification/slack.service';
import { WebhookService } from '../src/services/notification/webhook.service';
import { EmailDocument } from '../src/types/email.types';

describe('Notification Pipeline & Orchestration', () => {
  const app = createApp();

  let mockSlackService: SlackService;
  let mockWebhookService: WebhookService;
  let mockSlackSend: jest.Mock;
  let mockWebhookSend: jest.Mock;

  const testInterestedEmail: EmailDocument = {
    id: 'test_notif#INBOX#1#7001',
    accountId: 'test_notif_acc',
    folder: 'INBOX',
    uid: 7001,
    uidValidity: 1,
    messageId: '<test-notif-7001@example.com>',
    subject: 'Ready to sign enterprise agreement',
    from: { name: 'David Miller', address: 'david@buyer.com' },
    to: [{ name: 'Sales', address: 'sales@reachinbox.test' }],
    date: new Date().toISOString(),
    bodyText: 'We reviewed the contract and want to proceed with ReachInbox.',
    bodyHtml: '<p>We reviewed the contract.</p>',
    snippet: 'We reviewed the contract and want to proceed with ReachInbox.',
    category: 'Uncategorized',
    categoryConfidence: 0,
    notificationSent: false,
    indexedAt: new Date().toISOString()
  };

  beforeAll(async () => {
    // Seed test document in Elasticsearch
    await esEmailService.indexEmail(testInterestedEmail);
  });

  beforeEach(() => {
    mockSlackSend = jest.fn().mockResolvedValue(true);
    mockWebhookSend = jest.fn().mockResolvedValue(true);

    mockSlackService = new SlackService('https://mock.slack/hook');
    mockWebhookService = new WebhookService('https://mock.webhook.site/hook');

    mockSlackService.sendInterestedNotification = mockSlackSend;
    mockWebhookService.sendInterestedNotification = mockWebhookSend;

    notificationOrchestrator.setServices(mockSlackService, mockWebhookService);
  });

  afterAll(async () => {
    await esEmailService.deleteEmailById(testInterestedEmail.id);
  });

  it('triggers Slack and Webhook for a real-time Interested email', async () => {
    const classification = {
      category: 'Interested' as const,
      confidence: 0.96,
      reasoning: 'Customer wants to proceed with purchase'
    };

    const delivered = await notificationOrchestrator.handleEmailCategorized({
      email: testInterestedEmail,
      classification,
      isRealtime: true
    });

    expect(delivered).toBe(true);
    expect(mockSlackSend).toHaveBeenCalledTimes(1);
    expect(mockWebhookSend).toHaveBeenCalledTimes(1);

    // Verify document marked as notificationSent in Elasticsearch
    const updated = await esEmailService.getEmailById(testInterestedEmail.id);
    expect(updated?.notificationSent).toBe(true);
  });

  it('does NOT trigger notifications for non-Interested emails', async () => {
    const classification = {
      category: 'Spam' as const,
      confidence: 0.99,
      reasoning: 'Spam email'
    };

    const delivered = await notificationOrchestrator.handleEmailCategorized({
      email: testInterestedEmail,
      classification,
      isRealtime: true
    });

    expect(delivered).toBe(false);
    expect(mockSlackSend).not.toHaveBeenCalled();
    expect(mockWebhookSend).not.toHaveBeenCalled();
  });

  it('does NOT trigger notifications for historical Interested emails', async () => {
    // Reset notificationSent for fresh test
    await esEmailService.indexEmail({ ...testInterestedEmail, notificationSent: false });

    const classification = {
      category: 'Interested' as const,
      confidence: 0.95,
      reasoning: 'Historical high intent'
    };

    const delivered = await notificationOrchestrator.handleEmailCategorized({
      email: testInterestedEmail,
      classification,
      isRealtime: false // Historical sync
    });

    expect(delivered).toBe(false);
    expect(mockSlackSend).not.toHaveBeenCalled();
    expect(mockWebhookSend).not.toHaveBeenCalled();
  });

  it('deduplicates: does NOT send duplicate notifications if already sent', async () => {
    // Mark notificationSent: true in Elasticsearch
    await esEmailService.indexEmail({ ...testInterestedEmail, notificationSent: true });

    const classification = {
      category: 'Interested' as const,
      confidence: 0.95,
      reasoning: 'Duplicate check'
    };

    const delivered = await notificationOrchestrator.handleEmailCategorized({
      email: testInterestedEmail,
      classification,
      isRealtime: true
    });

    expect(delivered).toBe(false);
    expect(mockSlackSend).not.toHaveBeenCalled();
    expect(mockWebhookSend).not.toHaveBeenCalled();
  });

  it('handles partial failure: Slack fails but Webhook succeeds', async () => {
    await esEmailService.indexEmail({ ...testInterestedEmail, notificationSent: false });

    mockSlackService.sendInterestedNotification = jest.fn().mockResolvedValue(false);
    mockWebhookService.sendInterestedNotification = jest.fn().mockResolvedValue(true);

    notificationOrchestrator.setServices(mockSlackService, mockWebhookService);

    const classification = {
      category: 'Interested' as const,
      confidence: 0.95,
      reasoning: 'Partial delivery'
    };

    const delivered = await notificationOrchestrator.handleEmailCategorized({
      email: testInterestedEmail,
      classification,
      isRealtime: true
    });

    expect(delivered).toBe(true);
    expect(mockSlackService.sendInterestedNotification).toHaveBeenCalled();
    expect(mockWebhookService.sendInterestedNotification).toHaveBeenCalled();

    const updated = await esEmailService.getEmailById(testInterestedEmail.id);
    expect(updated?.notificationSent).toBe(true);
  });

  it('handles partial failure: Webhook fails but Slack succeeds', async () => {
    await esEmailService.indexEmail({ ...testInterestedEmail, notificationSent: false });

    mockSlackService.sendInterestedNotification = jest.fn().mockResolvedValue(true);
    mockWebhookService.sendInterestedNotification = jest.fn().mockResolvedValue(false);

    notificationOrchestrator.setServices(mockSlackService, mockWebhookService);

    const classification = {
      category: 'Interested' as const,
      confidence: 0.95,
      reasoning: 'Partial delivery'
    };

    const delivered = await notificationOrchestrator.handleEmailCategorized({
      email: testInterestedEmail,
      classification,
      isRealtime: true
    });

    expect(delivered).toBe(true);
    const updated = await esEmailService.getEmailById(testInterestedEmail.id);
    expect(updated?.notificationSent).toBe(true);
  });

  it('does NOT mark notificationSent if both Slack and Webhook fail', async () => {
    await esEmailService.indexEmail({ ...testInterestedEmail, notificationSent: false });

    mockSlackService.sendInterestedNotification = jest.fn().mockResolvedValue(false);
    mockWebhookService.sendInterestedNotification = jest.fn().mockResolvedValue(false);

    notificationOrchestrator.setServices(mockSlackService, mockWebhookService);

    const classification = {
      category: 'Interested' as const,
      confidence: 0.95,
      reasoning: 'Total failure'
    };

    const delivered = await notificationOrchestrator.handleEmailCategorized({
      email: testInterestedEmail,
      classification,
      isRealtime: true
    });

    expect(delivered).toBe(false);
    const updated = await esEmailService.getEmailById(testInterestedEmail.id);
    expect(updated?.notificationSent).toBe(false);
  });

  it('POST /api/emails/:id/categorize manually re-categorizes without triggering duplicate notifications', async () => {
    // Inject mock categorizer
    categorizationService.setCategorizer({
      categorize: jest.fn().mockResolvedValue({
        category: 'Meeting Booked',
        confidence: 0.99,
        reasoning: 'Meeting successfully confirmed'
      })
    });

    const res = await request(app).post(`/api/emails/${encodeURIComponent(testInterestedEmail.id)}/categorize`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.emailId).toBe(testInterestedEmail.id);
    expect(res.body.category).toBe('Meeting Booked');
    expect(res.body.confidence).toBe(0.99);

    // Verify notifications were NOT triggered by manual recategorization
    expect(mockSlackSend).not.toHaveBeenCalled();
    expect(mockWebhookSend).not.toHaveBeenCalled();

    // Verify Elasticsearch was updated
    const updated = await esEmailService.getEmailById(testInterestedEmail.id);
    expect(updated?.category).toBe('Meeting Booked');
  });

  it('POST /api/test/webhook delivers test notifications', async () => {
    const res = await request(app)
      .post('/api/test/webhook')
      .send({
        subject: 'Test Custom Subject',
        from: 'demo@tester.com'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Notification test executed');
  });
});
