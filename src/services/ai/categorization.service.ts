import { config } from '../../config/env.config';
import { CategorizationResult, EmailCategorizationInput, ICategorizationService } from './categorization.interface';
import { GeminiCategorizer } from './gemini-categorizer';

export class CategorizationService implements ICategorizationService {
  private static instance: CategorizationService;
  private categorizer: ICategorizationService;

  private constructor() {
    this.categorizer = this.createDefaultCategorizer();
  }

  public static getInstance(): CategorizationService {
    if (!CategorizationService.instance) {
      CategorizationService.instance = new CategorizationService();
    }
    return CategorizationService.instance;
  }

  private createDefaultCategorizer(): ICategorizationService {
    return new GeminiCategorizer();
  }

  /**
   * Allows injecting a custom categorizer strategy (e.g. for testing or switching LLMs)
   */
  public setCategorizer(categorizer: ICategorizationService): void {
    this.categorizer = categorizer;
  }

  public async categorize(email: EmailCategorizationInput): Promise<CategorizationResult> {
    return this.categorizer.categorize(email);
  }
}

export const categorizationService = CategorizationService.getInstance();
