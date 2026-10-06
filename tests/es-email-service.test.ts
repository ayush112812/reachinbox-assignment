import { esClient, esService } from '../src/services/elasticsearch/elasticsearch.client';
import { esEmailService } from '../src/services/elasticsearch/es-email.service';
import { EmailDocument } from '../src/types/email.types';

describe('EsEmailService Idempotent Ingestion', () => {
  afterAll(async () => {
    await esService.close();
  });

  it('indexes an email and updates idempotently without creating duplicates', async () => {
    const health = await esService.checkHealth();
    if (!health.isHealthy) {
      console.warn('Elasticsearch is offline, skipping live indexing test.');
      return;
    }

    const testEmail: EmailDocument = {
      id: 'acc_test#INBOX#12345#5001',
      accountId: 'acc_test',
      folder: 'INBOX',
      uid: 5001,
      uidValidity: 12345,
      messageId: '<idempotent-test-5001@reachinbox.test>',
      subject: 'Idempotency Verification Email',
      from: { name: 'Tester', address: 'tester@reachinbox.test' },
      to: [{ name: 'ReachInbox', address: 'inbox@reachinbox.test' }],
      date: new Date().toISOString(),
      bodyText: 'This is a test email body for testing idempotent indexing.',
      bodyHtml: '<p>This is a test email body for testing idempotent indexing.</p>',
      snippet: 'This is a test email body for testing idempotent indexing.',
      category: 'Uncategorized',
      categoryConfidence: 0,
      notificationSent: false,
      indexedAt: new Date().toISOString()
    };

    // First indexing
    await esEmailService.indexEmail(testEmail);
    const retrieved1 = await esEmailService.getEmailById(testEmail.id);
    expect(retrieved1).toBeDefined();
    expect(retrieved1?.id).toBe(testEmail.id);
    expect(retrieved1?.subject).toBe(testEmail.subject);

    // Re-indexing the same email (simulating re-running 30-day sync)
    const updatedEmail: EmailDocument = {
      ...testEmail,
      subject: 'Idempotency Verification Email - Updated'
    };
    await esEmailService.indexEmail(updatedEmail);

    const retrieved2 = await esEmailService.getEmailById(testEmail.id);
    expect(retrieved2).toBeDefined();
    expect(retrieved2?.id).toBe(testEmail.id); // Same ID, no duplicate document
    expect(retrieved2?.subject).toBe('Idempotency Verification Email - Updated');

    // Clean up test document
    await esClient.delete({
      index: 'reachinbox-emails',
      id: testEmail.id,
      refresh: true
    });
  });
});
