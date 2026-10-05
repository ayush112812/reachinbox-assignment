import { Request, Response, Router } from 'express';
import {
  EmailCategorizedPayload,
  emailEvents,
  NewEmailEventPayload
} from '../services/events/email-events';
import { logger } from '../utils/logger';

export const eventsRouter = Router();

/**
 * GET /api/events
 * Real-time Server-Sent Events (SSE) stream for frontend live updates.
 */
eventsRouter.get('/events', (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering if any
  res.flushHeaders?.();

  logger.info('[SSE] Frontend client connected to real-time events stream');

  // Initial connection handshake
  res.write(
    `data: ${JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Real-time event stream active'
    })}\n\n`
  );

  const onNewEmail = (payload: NewEmailEventPayload) => {
    try {
      res.write(
        `data: ${JSON.stringify({
          type: 'email:new',
          isRealtime: payload.isRealtime,
          email: {
            id: payload.email.id,
            accountId: payload.email.accountId,
            folder: payload.email.folder,
            subject: payload.email.subject,
            from: payload.email.from,
            date: payload.email.date,
            snippet: payload.email.snippet,
            category: payload.email.category,
            categoryConfidence: payload.email.categoryConfidence
          }
        })}\n\n`
      );
    } catch (err) {
      logger.error('[SSE] Error sending email:new event:', err);
    }
  };

  const onCategorized = (payload: EmailCategorizedPayload) => {
    try {
      res.write(
        `data: ${JSON.stringify({
          type: 'email:categorized',
          data: payload
        })}\n\n`
      );
    } catch (err) {
      logger.error('[SSE] Error sending email:categorized event:', err);
    }
  };

  const onSynced = (data: { accountId: string; count: number }) => {
    try {
      res.write(
        `data: ${JSON.stringify({
          type: 'email:synced',
          data
        })}\n\n`
      );
    } catch (err) {
      logger.error('[SSE] Error sending email:synced event:', err);
    }
  };

  emailEvents.on('email:new', onNewEmail);
  emailEvents.on('email:categorized', onCategorized);
  emailEvents.on('email:synced', onSynced);

  // Keep-alive heartbeat every 25 seconds (unreferenced so it does not block process exit/tests)
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);
  heartbeat.unref?.();

  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    clearInterval(heartbeat);
    emailEvents.off('email:new', onNewEmail);
    emailEvents.off('email:categorized', onCategorized);
    emailEvents.off('email:synced', onSynced);
  };

  req.on('close', () => {
    cleanup();
    logger.info('[SSE] Frontend client disconnected from events stream');
  });

  res.on('close', cleanup);
});
