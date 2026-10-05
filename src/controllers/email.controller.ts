import { Request, Response, NextFunction } from 'express';
import { emailProcessor } from '../services/ai/email-processor';
import { esEmailService } from '../services/elasticsearch/es-email.service';
import { ragReplyService } from '../services/rag/rag-reply.service';
import { emailListQuerySchema } from '../validators/email.validator';

export class EmailController {
  /**
   * GET /api/emails
   * Lists emails with pagination and optional filters (accountId, folder, category)
   */
  public static async getEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = emailListQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid query parameters',
            details: parseResult.error.flatten().fieldErrors
          }
        });
        return;
      }

      const { page, limit, accountId, folder, category } = parseResult.data;

      const result = await esEmailService.searchEmails({
        page,
        limit,
        accountId,
        folder,
        category
      });

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/emails/:id
   * Retrieves full email document by ID
   */
  public static async getEmailById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string' || id.trim() === '') {
        res.status(400).json({
          success: false,
          error: { message: 'A valid email ID must be provided' }
        });
        return;
      }

      const email = await esEmailService.getEmailById(decodeURIComponent(id.trim()));

      if (!email) {
        res.status(404).json({
          success: false,
          error: { message: `Email not found with ID '${id}'` }
        });
        return;
      }

      res.json({
        success: true,
        data: email
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/emails/:id/categorize
   * Re-runs AI categorization manually on an email and persists the result
   */
  public static async categorizeEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string' || id.trim() === '') {
        res.status(400).json({
          success: false,
          error: { message: 'A valid email ID must be provided' }
        });
        return;
      }

      const email = await esEmailService.getEmailById(decodeURIComponent(id.trim()));

      if (!email) {
        res.status(404).json({
          success: false,
          error: { message: `Email not found with ID '${id}'` }
        });
        return;
      }

      // Perform categorization
      const result = await emailProcessor.processEmailManually(email.id);

      if (!result) {
        res.status(500).json({
          success: false,
          error: { message: 'Failed to categorize email' }
        });
        return;
      }

      res.json({
        success: true,
        emailId: email.id,
        category: result.category,
        confidence: result.confidence,
        reasoning: result.reasoning
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/emails/:id/suggest-reply
   * Uses RAG (knowledge base vector search + LLM) to generate contextual suggested replies.
   */
  public static async suggestReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string' || id.trim() === '') {
        res.status(400).json({
          success: false,
          error: { message: 'A valid email ID must be provided' }
        });
        return;
      }

      const decodedId = decodeURIComponent(id.trim());
      const result = await ragReplyService.generateReplyForEmail(decodedId);

      res.status(200).json({
        success: true,
        emailId: result.emailId,
        replies: result.replies,
        retrievedSources: result.retrievedSources
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('not found')) {
        res.status(404).json({
          success: false,
          error: { message: msg }
        });
        return;
      }
      if (msg.includes('GEMINI_API_KEY')) {
        res.status(503).json({
          success: false,
          error: { message: 'AI service unavailable: GEMINI_API_KEY is not configured.' }
        });
        return;
      }
      next(err);
    }
  }
}


