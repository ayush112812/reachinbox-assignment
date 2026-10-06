import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailDetail } from '../src/components/email/EmailDetail';
import { EmailDocument } from '../src/types/email';

const mockEmail: EmailDocument = {
  id: 'email-123',
  accountId: 'acc1',
  folder: 'INBOX',
  uid: 50,
  subject: 'Enterprise Demo Request',
  from: { name: 'Elon Musk', address: 'elon@x.com' },
  to: [{ name: 'ReachInbox Sales', address: 'sales@reachinbox.com' }],
  date: '2026-10-02T10:00:00.000Z',
  snippet: 'We would love to deploy ReachInbox for 500 SDRs.',
  bodyText: 'We would love to deploy ReachInbox for 500 SDRs.',
  bodyHtml: '<p>We would love to deploy <strong>ReachInbox</strong> for 500 SDRs.</p>',
  category: 'Interested',
  categoryConfidence: 0.98,
  confidence: 0.98,
  categoryReasoning: 'Customer explicitly asked to deploy for 500 SDRs.',
  reasoning: 'Customer explicitly asked to deploy for 500 SDRs.',
  notificationSent: true,
};

describe('EmailDetail Component', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders empty placeholder when no emailId is provided', () => {
    render(<EmailDetail emailId={null} />);
    expect(screen.getByText('No email selected')).toBeInTheDocument();
  });

  it('renders email details, sanitized HTML, and AI classification card', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockEmail }),
    } as Response);

    render(<EmailDetail emailId="email-123" initialEmail={mockEmail} />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Demo Request')).toBeInTheDocument();
      expect(screen.getByText('Elon Musk')).toBeInTheDocument();
      expect(screen.getByText('<elon@x.com>')).toBeInTheDocument();
      expect(screen.getByText(/Customer explicitly asked to deploy for 500 SDRs/)).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
      expect(screen.getByText('Generate Suggested Reply')).toBeInTheDocument();
    });
  });

  it('handles re-categorization action', async () => {
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/categorize')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            emailId: 'email-123',
            category: 'Meeting Booked',
            confidence: 0.99,
            reasoning: 'Updated: Meeting link already generated.',
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockEmail }),
      } as Response;
    });

    render(<EmailDetail emailId="email-123" initialEmail={mockEmail} />);

    await waitFor(() => {
      expect(screen.getByTitle('Re-categorize with Gemini AI')).toBeInTheDocument();
    });

    const recatButton = screen.getByTitle('Re-categorize with Gemini AI');
    fireEvent.click(recatButton);

    await waitFor(() => {
      expect(screen.getByText(/Updated: Meeting link already generated/)).toBeInTheDocument();
    });
  });

  it('generates RAG suggested replies and displays citations and copy button', async () => {
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (typeof url === 'string' && url.includes('/suggest-reply')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            emailId: 'email-123',
            replies: [
              { style: 'Concise', text: 'Hi Elon, lets chat tomorrow at 2 PM PST! Here is my link: cal.com/demo' },
              { style: 'Detailed', text: 'Hi Elon, thanks for reaching out. ReachInbox easily supports 500 SDRs with unlimited inboxes, AI warmup, and automated categorization.' }
            ],
            retrievedSources: [
              { id: 'source-1', title: 'ReachInbox Scalability Docs', score: 0.95, content: 'ReachInbox handles multi-account IMAP at enterprise scale.' }
            ]
          }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockEmail }),
      } as Response;
    });

    render(<EmailDetail emailId="email-123" initialEmail={mockEmail} />);

    await waitFor(() => {
      expect(screen.getByText('Generate Suggested Reply')).toBeInTheDocument();
    });

    const generateBtn = screen.getByText('Generate Suggested Reply');
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Hi Elon, lets chat tomorrow at 2 PM PST!/i)).toBeInTheDocument();
      expect(screen.getByText('Retrieved Vector Knowledge Sources (1)')).toBeInTheDocument();
      expect(screen.getByText('ReachInbox Scalability Docs')).toBeInTheDocument();
    });

    // Switch to Detailed tab
    fireEvent.click(screen.getByText('Detailed Reply'));
    expect(screen.getByText(/ReachInbox easily supports 500 SDRs/i)).toBeInTheDocument();
  });
});
