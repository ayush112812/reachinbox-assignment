import { IEmbeddingService } from './embedding.interface';
import { GeminiEmbeddingService } from './gemini-embedding.service';

export class EmbeddingService implements IEmbeddingService {
  private static instance: EmbeddingService;
  private provider: IEmbeddingService;

  private constructor() {
    this.provider = new GeminiEmbeddingService();
  }

  public static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Allows injecting a custom embedding provider (e.g. for unit testing)
   */
  public setProvider(provider: IEmbeddingService): void {
    this.provider = provider;
  }

  public getDimension(): number {
    return this.provider.getDimension();
  }

  public getModelName(): string {
    return this.provider.getModelName();
  }

  public async embedText(text: string): Promise<number[]> {
    return this.provider.embedText(text);
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return this.provider.embedBatch(texts);
  }
}

export const embeddingService = EmbeddingService.getInstance();
