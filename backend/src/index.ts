import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './lib/errors.js';
import { uidMiddleware } from './lib/userId.js';
import { closeMongo, connectMongo } from './db/client.js';
import { healthRouter } from './routes/health.routes.js';
import { sessionsRouter } from './routes/sessions.routes.js';
import { messagesRouter } from './routes/messages.routes.js';

async function main() {
  await connectMongo();

  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-Uid'],
      exposedHeaders: ['X-Uid'],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '256kb' }));
  app.use(pinoHttp({ logger }));

  // API routes mounted under /api
  app.use('/api', healthRouter);
  app.use('/api', uidMiddleware, sessionsRouter);
  app.use('/api', uidMiddleware, messagesRouter);

  app.use(errorHandler);

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'backend listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    server.close(() => logger.info('http server closed'));
    await closeMongo();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('fatal startup error:', err);
  process.exit(1);
});
