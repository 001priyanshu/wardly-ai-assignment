import type { Response } from 'express';

export interface SseWriter {
  event: (name: string, data: unknown) => void;
  comment: (text: string) => void;
  close: () => void;
  isClosed: () => boolean;
}

export function openSse(res: Response): SseWriter {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let closed = false;
  const heartbeat = setInterval(() => {
    if (closed) return;
    try {
      res.write(': hb\n\n');
    } catch {
      /* ignore */
    }
  }, 15_000);

  res.on('close', () => {
    closed = true;
    clearInterval(heartbeat);
  });

  return {
    event(name, data) {
      if (closed) return;
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      res.write(`event: ${name}\n`);
      res.write(`data: ${payload}\n\n`);
    },
    comment(text) {
      if (closed) return;
      res.write(`: ${text}\n\n`);
    },
    close() {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      try {
        res.end();
      } catch {
        /* ignore */
      }
    },
    isClosed: () => closed,
  };
}
