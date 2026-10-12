import cors from 'cors';
import express, { type Express } from 'express';
import type { Pool } from 'pg';
import { adminRouter } from './admin/admin.routes';
import { authRouter } from './auth/auth.routes';
import { bookingsRouter } from './bookings/bookings.routes';
import { courtsRouter } from './courts/courts.routes';
import { config } from './config';
import { AppError, errorHandler } from './errors';
import { systemClock, type Clock } from './lib/time';
import { noopPublisher, type Publisher } from './realtime/hub';
import { usersRouter } from './users/users.routes';

export interface AppDeps {
  db: Pool;
  /** Injected so tests can pin "now" (past-booking and cancellation rules). */
  clock?: Clock;
  /** Where booking/court change events go (the WebSocket hub in production). */
  realtime?: Publisher;
}

export function createApp({ db, clock = systemClock, realtime = noopPublisher }: AppDeps): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Readiness check for Docker / load balancers: the process is up AND can
  // reach the database. 503 tells them not to send traffic here yet.
  app.get('/api/health', async (_req, res) => {
    try {
      await db.query('SELECT 1');
      res.json({ ok: true, db: 'up' });
    } catch {
      res.status(503).json({ ok: false, db: 'down' });
    }
  });
  // Public settings the frontend needs to render times like the server does.
  app.get('/api/config', (_req, res) => {
    res.json({
      facilityTimezone: config.facilityTimezone,
      cancellationWindowHours: config.cancellationWindowHours,
    });
  });
  app.use('/api/auth', authRouter(db));
  app.use('/api/courts', courtsRouter(db, clock, realtime));
  app.use('/api/bookings', bookingsRouter(db, clock, realtime));
  app.use('/api/admin', adminRouter(db));
  app.use('/api/users', usersRouter(db));

  app.use((_req, _res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });
  app.use(errorHandler);
  return app;
}
