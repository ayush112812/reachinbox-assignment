import EventEmitter from 'events';
import { EmailDocument } from '../../types/email.types';

export interface NewEmailEventPayload {
  email: EmailDocument;
  isRealtime: boolean;
}

export interface EmailCategorizedPayload {
  emailId: string;
  category: string;
  confidence: number;
  reasoning?: string;
}

export interface EmailEvents {
  'email:new': (payload: NewEmailEventPayload) => void;
  'email:categorized': (payload: EmailCategorizedPayload) => void;
  'email:synced': (data: { accountId: string; count: number }) => void;
}

class EmailEventEmitter extends EventEmitter {
  emitNewEmail(email: EmailDocument, isRealtime: boolean = true): void {
    this.emit('email:new', { email, isRealtime });
  }

  emitEmailCategorized(payload: EmailCategorizedPayload): void {
    this.emit('email:categorized', payload);
  }

  emitSyncComplete(accountId: string, count: number): void {
    this.emit('email:synced', { accountId, count });
  }
}

export const emailEvents = new EmailEventEmitter();

