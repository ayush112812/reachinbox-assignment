import { EmailCategory } from './email';

export interface EmailFilterParams {
  accountId?: string;
  folder?: string;
  category?: EmailCategory;
  page?: number;
  limit?: number;
}

export interface SearchFilterParams extends EmailFilterParams {
  q?: string;
}

export interface SearchResultResponse {
  success: boolean;
  query: string;
  data: Array<import('./email').EmailItem>;
  pagination: import('./email').EmailListPagination;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  environment?: string;
  services?: {
    elasticsearch?: {
      status?: string;
      healthy?: boolean;
      cluster?: string;
      version?: string;
    };
  };
}
