import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../errors';

export type Role = 'user' | 'admin';
export interface AuthUser {
  id: number;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: AuthUser): string {
  const payload: TokenPayload = { sub: String(user.id), role: user.role };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresInSeconds });
}

/** Verifies a JWT and returns its user. Throws 401 if invalid or expired. */
export function verifyToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return { id: Number(payload.sub), role: payload.role };
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired token');
  }
}

/** Rejects the request with 401 unless it carries a valid Bearer token. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing bearer token');
  }
  req.user = verifyToken(token);
  next();
};

/** Must run after `authenticate`. Rejects with 403 if the role is not allowed. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, 'FORBIDDEN', 'You do not have access to this resource');
    }
    next();
  };
}

/** Narrowing helper for handlers mounted behind `authenticate`. */
export function currentUser(req: Express.Request): AuthUser {
  if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Not authenticated');
  return req.user;
}
