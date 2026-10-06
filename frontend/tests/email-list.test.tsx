import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmailList } from '../src/components/email/EmailList';
import { EmailDocument } from '../src/types/email';

const mockEmails: EmailDocument[] = [
  {
    id: 'email-1',
    accountId: 'acc1',
    folder: 'INBOX',
    uid: 101,
    subject: 'Excited about ReachInbox OneBox',
    from: { name: 'Sarah Connor', address: 'sarah@example.com' },
    to: [{ name: 'ReachInbox Sales', address: 'sales@reachinbox.com' }],
    date: new Date().toISOString(),
    snippet: 'Would love to schedule a demo call tomorrow afternoon.',
    bodyText: 'Would love to schedule a demo call tomorrow afternoon.',
    bodyHtml: '<p>Would love to schedule a demo call tomorrow afternoon.</p>',
    category: 'Interested',
    categoryConfidence: 0.96,
    categoryReasoning: 'Explicit request for product demo.',
    notificationSent: true,
  },
  {
    id: 'email-2',
    accountId: 'acc2',
    folder: 'INBOX',
    uid: 102,
    subject: 'Unsubscribe from newsletter',
    from: { name: 'John Doe', address: 'john@example.com' },
    to: [{ name: 'ReachInbox Sales', address: 'sales@reachinbox.com' }],
    date: new Date().toISOString(),
    snippet: 'Please remove me from this mailing list immediately.',
    bodyText: 'Please remove me from this mailing list immediately.',
    bodyHtml: '<p>Please remove me from this mailing list immediately.</p>',
    category: 'Not Interested',
    categoryConfidence: 0.89,
    categoryReasoning: 'Unsubscribe request.',
    notificationSent: false,
  },
];

describe('EmailList Component', () => {
  it('renders list of emails with sender, subject, and category badge', () => {
    const handleSelect = vi.fn();
    render(
      <EmailList
        emails={mockEmails}
        selectedEmailId={null}
        onSelectEmail={handleSelect}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
        page={1}
        totalPages={2}
        total={2}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        isSearching={false}
        selectedAccount="all"
        selectedCategory="all"
        selectedFolder="INBOX"
      />
    );

    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('Excited about ReachInbox OneBox')).toBeInTheDocument();
    expect(screen.getByText('Interested')).toBeInTheDocument();

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Unsubscribe from newsletter')).toBeInTheDocument();
    expect(screen.getByText('Not Interested')).toBeInTheDocument();
  });

  it('triggers onSelectEmail when an email item is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <EmailList
        emails={mockEmails}
        selectedEmailId={null}
        onSelectEmail={handleSelect}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
        page={1}
        totalPages={1}
        total={2}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        isSearching={false}
        selectedAccount="all"
        selectedCategory="all"
        selectedFolder="INBOX"
      />
    );

    fireEvent.click(screen.getByText('Sarah Connor'));
    expect(handleSelect).toHaveBeenCalledWith(mockEmails[0]);
  });

  it('renders empty state when there are no emails in inbox', () => {
    render(
      <EmailList
        emails={[]}
        selectedEmailId={null}
        onSelectEmail={vi.fn()}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
        page={1}
        totalPages={1}
        total={0}
        onPageChange={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        isSearching={false}
        selectedAccount="all"
        selectedCategory="all"
        selectedFolder="INBOX"
      />
    );

    expect(screen.getByText('Inbox is empty')).toBeInTheDocument();
  });

  it('renders search empty state when no query results are found', () => {
    render(
      <EmailList
        emails={[]}
        selectedEmailId={null}
        onSelectEmail={vi.fn()}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
        page={1}
        totalPages={1}
        total={0}
        onPageChange={vi.fn()}
        searchQuery="nonexistent"
        onSearchChange={vi.fn()}
        isSearching={true}
        selectedAccount="all"
        selectedCategory="all"
        selectedFolder="INBOX"
      />
    );

    expect(screen.getByText('No matching emails found')).toBeInTheDocument();
  });

  it('handles pagination next and previous buttons', () => {
    const handlePageChange = vi.fn();
    render(
      <EmailList
        emails={mockEmails}
        selectedEmailId={null}
        onSelectEmail={vi.fn()}
        isLoading={false}
        error={null}
        onRefresh={vi.fn()}
        page={1}
        totalPages={3}
        total={50}
        onPageChange={handlePageChange}
        searchQuery=""
        onSearchChange={vi.fn()}
        isSearching={false}
        selectedAccount="all"
        selectedCategory="all"
        selectedFolder="INBOX"
      />
    );

    const nextBtn = screen.getByTitle('Next page');
    expect(nextBtn).toBeInTheDocument();
    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });
});
