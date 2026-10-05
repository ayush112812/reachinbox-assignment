import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/env.config';
import { logger } from '../../utils/logger';
import { IEmbeddingService } from './embedding.interface';

export class GeminiEmbeddingService implements IEmbeddingService {
  private ai: GoogleGenAI | null = null;
  private readonly model: string;
  private readonly dimension: number = 768;

  constructor() {
    this.model = config.EMBEDDING_MODEL || 'gemini-embedding-001';
    if (config.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
    }
  }

  public getDimension(): number {
    return this.dimension;
  }

  public getModelName(): string {
    return this.model;
  }

  /**
   * Generates a 768-dimensional dense vector for a single text input.
   */
  public async embedText(text: string): Promise<number[]> {
    if (!this.ai || !config.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. Cannot generate embeddings.');
    }

    const cleanText = text.trim();
    if (!cleanText) {
      throw new Error('Cannot generate embedding for empty text.');
    }

    // Truncate to reasonable token limit (approx 2,000 words / 8,000 chars)
    const truncatedText = cleanText.length > 8000 ? cleanText.substring(0, 8000) : cleanText;

    try {
      const response = await this.ai.models.embedContent({
        model: this.model,
        contents: truncatedText,
        config: {
          outputDimensionality: this.dimension
        }
      });

      // Handle both embeddings array and single embedding response shapes
      const values =
        response.embeddings?.[0]?.values ||
        (response as unknown as { embedding?: { values?: number[] } }).embedding?.values;

      if (!values || !Array.isArray(values) || values.length === 0) {
        throw new Error('Gemini embedding response did not contain vector values.');
      }

      if (values.length !== this.dimension) {
        logger.warn(
          `[Gemini Embedding] Dimension mismatch: expected ${this.dimension}, received ${values.length}`
        );
      }

      return values;
    } catch (err) {
      logger.error(`[Gemini Embedding] Failed to generate embedding for text:`, err);
      throw err;
    }
  }

  /**
   * Generates embeddings for an array of text chunks sequentially to respect rate limits.
   */
  public async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      const vector = await this.embedText(texts[i]);
      results.push(vector);
    }

    return results;
  }
}

export const geminiEmbeddingService = new GeminiEmbeddingService();
