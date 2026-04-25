import type { NextFunction, Request, Response } from 'express';
import { logger } from './logger.js';

export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const NotFound = (msg = 'Not found') => new AppError(404, 'not_found', msg);
export const BadRequest = (msg: string, details?: unknown) =>
  new AppError(400, 'bad_request', msg, details);
export const Conflict = (msg: string) => new AppError(409, 'conflict', msg);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error({ err }, 'unhandled error');
  res.status(500).json({ error: { code: 'internal', message } });
}
