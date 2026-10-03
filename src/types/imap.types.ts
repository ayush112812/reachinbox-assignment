import { EmailDocument } from './email.types';

export type ImapConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'IDLE'
  | 'RECONNECTING'
  | 'ERROR';

export interface ImapAccountConfig {
  id: string;
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
}

export interface ImapAccountStatus {
  id: string;
  user: string;
  host: string;
  port: number;
  secure: boolean;
  status: ImapConnectionState;
  isIdling: boolean;
  mailbox?: string;
  uidValidity?: number;
  totalEmailsInMailbox?: number;
  totalIndexed: number;
  lastSyncAt?: string;
  lastError?: string;
}

export interface ImapNewEmailEvent {
  accountId: string;
  email: EmailDocument;
}
