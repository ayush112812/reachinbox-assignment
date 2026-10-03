import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { config } from './config/env.config';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import healthRouter from './routes/health.routes';
import accountRouter from './routes/account.routes';
import emailRouter from './routes/email.routes';
import searchRouter from './routes/search.routes';
import testRouter from './routes/test.routes';
import { knowledgeRouter } from './routes/knowledge.routes';
import { eventsRouter } from './routes/events.routes';

export const createApp = (): Application => {
  const app: Application = express();

  // Basic security and parsing middlewares
  app.use(cors({
    origin: config.CLIENT_URL || '*',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Mount routes
  app.use('/', healthRouter);
  app.use('/api', accountRouter);
  app.use('/api', emailRouter);
  app.use('/api', searchRouter);
  app.use('/api', testRouter);
  app.use('/api', eventsRouter);
  app.use('/api/knowledge', knowledgeRouter);

  // Fallback 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: `Route not found: ${req.method} ${req.originalUrl}`
      }
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
};
