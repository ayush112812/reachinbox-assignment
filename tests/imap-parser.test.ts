import { ImapParser } from '../src/services/imap/imap-parser';

describe('ImapParser Service', () => {
  it('parses a basic plaintext email correctly', async () => {
    const rawRfc2822 = `From: "Jane Doe" <jane@example.com>
To: "John Smith" <john@reachinbox.ai>
Subject: Inquiry regarding Outreach Platform
Message-ID: <12345.test@example.com>
Date: Fri, 02 Oct 2026 12:00:00 +0000

Hello ReachInbox team,
We are interested in learning more about your automated email outreach capabilities.
Could you share your enterprise pricing?

Best regards,
Jane`;

    const parsed = await ImapParser.parseMessage(rawRfc2822, {
      accountId: 'account_1',
      folder: 'INBOX',
      uid: 101,
      uidValidity: 123456
    });

    expect(parsed.id).toBe('account_1#INBOX#123456#101');
    expect(parsed.accountId).toBe('account_1');
    expect(parsed.folder).toBe('INBOX');
    expect(parsed.uid).toBe(101);
    expect(parsed.uidValidity).toBe(123456);
    expect(parsed.messageId).toBe('<12345.test@example.com>');
    expect(parsed.subject).toBe('Inquiry regarding Outreach Platform');
    expect(parsed.from).toEqual({ name: 'Jane Doe', address: 'jane@example.com' });
    expect(parsed.to).toEqual([{ name: 'John Smith', address: 'john@reachinbox.ai' }]);
    expect(parsed.bodyText).toContain('We are interested in learning more');
    expect(parsed.snippet).toContain('Hello ReachInbox team');
    expect(parsed.category).toBe('Uncategorized');
    expect(parsed.categoryConfidence).toBe(0);
    expect(parsed.notificationSent).toBe(false);
  });

  it('parses multipart HTML emails and extracts clean text and snippet', async () => {
    const rawMultipart = `From: sales@partner.org
To: john@reachinbox.ai
Subject: =?utf-8?B?U3BlY2lhbCBPZmZlcg==?=
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="boundary-marker"

--boundary-marker
Content-Type: text/plain; charset=utf-8

Check out our new partnership details at ReachInbox.

--boundary-marker
Content-Type: text/html; charset=utf-8

<html><body><p>Check out our new <b>partnership</b> details at ReachInbox.</p></body></html>
--boundary-marker--`;

    const parsed = await ImapParser.parseMessage(rawMultipart, {
      accountId: 'account_2',
      folder: 'INBOX',
      uid: 202
    });

    expect(parsed.id).toBe('account_2#INBOX#0#202');
    expect(parsed.subject).toBe('Special Offer');
    expect(parsed.from.address).toBe('sales@partner.org');
    expect(parsed.bodyHtml).toContain('<b>partnership</b>');
    expect(parsed.bodyText).toContain('Check out our new partnership details');
    expect(parsed.snippet).toBe('Check out our new partnership details at ReachInbox.');
  });

  it('handles missing headers gracefully with defaults', async () => {
    const rawMinimal = `Subject: Minimal Message

Only content here.`;

    const parsed = await ImapParser.parseMessage(rawMinimal, {
      accountId: 'account_1',
      folder: 'INBOX',
      uid: 303
    });

    expect(parsed.from.address).toBe('unknown@sender.com');
    expect(parsed.subject).toBe('Minimal Message');
    expect(parsed.to).toEqual([]);
    expect(parsed.messageId).toContain('<generated-account_1-303@reachinbox.local>');
    expect(parsed.bodyText).toBe('Only content here.');
  });

  it('guarantees deterministic identity across identical inputs', async () => {
    const raw = `From: test@test.com\nSubject: Test\n\nBody`;

    const doc1 = await ImapParser.parseMessage(raw, {
      accountId: 'acc1',
      folder: 'INBOX',
      uid: 999,
      uidValidity: 555
    });

    const doc2 = await ImapParser.parseMessage(raw, {
      accountId: 'acc1',
      folder: 'INBOX',
      uid: 999,
      uidValidity: 555
    });

    expect(doc1.id).toBe(doc2.id);
    expect(doc1.id).toBe('acc1#INBOX#555#999');
  });
});
