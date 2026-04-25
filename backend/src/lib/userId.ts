import type { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

declare module 'express-serve-static-core' {
  interface Request {
    uid: string;
  }
}

const COOKIE = 'wardly_uid';
const HEADER = 'x-uid';

export function uidMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerUid = req.header(HEADER);
  const cookieUid = req.cookies?.[COOKIE];
  let uid = headerUid || cookieUid;
  if (!uid) {
    uid = uuid();
    res.cookie(COOKIE, uid, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });
  } else if (!cookieUid) {
    res.cookie(COOKIE, uid, { httpOnly: false, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 365 });
  }
  req.uid = uid;
  next();
}
