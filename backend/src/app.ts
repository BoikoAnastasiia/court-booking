import cors from 'cors';
import express, { type Express } from 'express';
import type { Pool } from 'pg';
import { adminRouter } from './admin/admin.routes';
import { authRouter } from './auth/auth.routes';
import { bookingsRouter } from './bookings/bookings.routes';
import { courtsRouter } from './courts/courts.routes';
import { AppError, errorHandler } from './errors';
import { systemClock, type Clock } from './lib/time';

export interface AppDeps {
  db: Pool;
  /** Injected so tests can pin "now" (past-booking and cancellation rules). */
  clock?: Clock;
}

export function createApp({ db, clock = systemClock }: AppDeps): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter(db));
  app.use('/api/courts', courtsRouter(db, clock));
  app.use('/api/bookings', bookingsRouter(db, clock));
  app.use('/api/admin', adminRouter(db));

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });
  app.use(errorHandler);
  return app;
}
