import { Request, Response, NextFunction } from 'express';
import { esEmailService } from '../services/elasticsearch/es-email.service';
import { emailSearchQuerySchema } from '../validators/email.validator';

export class SearchController {
  /**
   * GET /api/search
   * Performs full-text search across subject, body, sender and recipient
   * with keyword filtering (accountId, folder, category), highlights and pagination.
   */
  public static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parseResult = emailSearchQuerySchema.safeParse(req.query);

      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Invalid search parameters',
            details: parseResult.error.flatten().fieldErrors
          }
        });
        return;
      }

      const { q, page, limit, accountId, folder, category } = parseResult.data;

      const result = await esEmailService.searchEmails({
        q,
        page,
        limit,
        accountId,
        folder,
        category
      });

      res.json({
        success: true,
        query: q || null,
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
}
