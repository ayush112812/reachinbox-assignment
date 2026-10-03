export type EmailCategory =
  | 'Interested'
  | 'Meeting Booked'
  | 'Not Interested'
  | 'Spam'
  | 'Out of Office'
  | 'Uncategorized';

export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailDocument {
  id: string; // Deterministic: `${accountId}#${folder}#${uidValidity}#${uid}`
  accountId: string;
  folder: string;
  uid: number;
  uidValidity?: number;
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date: string | Date;
  bodyText: string;
  bodyHtml: string;
  snippet: string;
  category: EmailCategory;
  categoryConfidence: number;
  categoryReasoning?: string;
  notificationSent: boolean;
  indexedAt: string | Date;
}

export interface SearchEmailsOptions {
  q?: string;
  accountId?: string;
  folder?: string;
  category?: EmailCategory;
  page?: number;
  limit?: number;
}

export interface EmailSearchHighlight {
  subject?: string[];
  bodyText?: string[];
}

export interface EmailSearchResultItem extends EmailDocument {
  highlight?: EmailSearchHighlight;
  score?: number | null;
}

export interface SearchEmailsResult {
  items: EmailSearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
