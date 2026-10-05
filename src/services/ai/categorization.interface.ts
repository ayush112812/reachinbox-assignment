import { EmailCategory } from '../../types/email.types';

export interface EmailCategorizationInput {
  subject: string;
  from: string;
  body: string;
}

export interface CategorizationResult {
  category: EmailCategory;
  confidence: number;
  reasoning: string;
}

export interface ICategorizationService {
  categorize(email: EmailCategorizationInput): Promise<CategorizationResult>;
}
