export type AccountConnectionState =
  | 'idle'
  | 'syncing'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface ImapAccountStatus {
  id: string;
  user: string;
  host: string;
  port: number;
  secure: boolean;
  state: AccountConnectionState;
  authenticated: boolean;
  mailbox: string;
  totalIndexed: number;
  reconnectAttempts: number;
  lastError: string | null;
  lastSyncAt: string | null;
}

export interface AccountListResponse {
  success: boolean;
  data: ImapAccountStatus[];
}

export interface AccountDetailResponse {
  success: boolean;
  data: ImapAccountStatus;
}
