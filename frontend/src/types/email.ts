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
  id: string;
  accountId: string;
  folder: string;
  uid: number;
  messageId?: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  category: EmailCategory;
  categoryConfidence?: number;
  confidence?: number;
  categoryReasoning?: string;
  reasoning?: string;
  notificationSent?: boolean;
  indexedAt?: string;
  highlight?: {
    subject?: string[];
    bodyText?: string[];
    'from.name'?: string[];
    'from.address'?: string[];
  };
  score?: number | null;
}

// Alias for convenience
export type EmailItem = EmailDocument;

export interface EmailListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmailListResponse {
  success: boolean;
  data: EmailDocument[];
  pagination: EmailListPagination;
}

export interface EmailDetailResponse {
  success: boolean;
  data: EmailDocument;
}

export interface CategorizeEmailResponse {
  success: boolean;
  emailId: string;
  category: EmailCategory;
  confidence: number;
  reasoning?: string;
}
