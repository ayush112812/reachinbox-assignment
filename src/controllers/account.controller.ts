import { Request, Response, NextFunction } from 'express';
import { imapConnectionManager } from '../services/imap/imap-connection-manager';

export class AccountController {
  /**
   * GET /api/accounts - Lists all configured accounts and their live IMAP states
   */
  public static async getAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = imapConnectionManager.getAccountStatuses();
      res.json({
        success: true,
        count: accounts.length,
        data: accounts
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/accounts/:id - Gets status of a single account
   */
  public static async getAccountById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const account = imapConnectionManager.getAccountStatus(id);

      if (!account) {
        res.status(404).json({
          success: false,
          error: { message: `Account '${id}' not found` }
        });
        return;
      }

      res.json({
        success: true,
        data: account
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/accounts/:id/sync - Triggers manual 30-day sync for an account
   */
  public static async triggerSync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const daysBack = req.body?.daysBack ? Number(req.body.daysBack) : 30;

      const triggered = await imapConnectionManager.triggerManualSync(id, daysBack);

      if (!triggered) {
        res.status(404).json({
          success: false,
          error: { message: `Account '${id}' not found or could not be synced` }
        });
        return;
      }

      res.json({
        success: true,
        message: `Synchronization triggered for account '${id}' (${daysBack} days back)`
      });
    } catch (err) {
      next(err);
    }
  }
}
