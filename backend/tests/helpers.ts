import bcrypt from 'bcryptjs';
import type { Server } from 'node:http';
import { DateTime } from 'luxon';
import type { Pool } from 'pg';
import { createApp } from '../src/app';
import { signToken, type Role } from '../src/auth/auth.middleware';
import { config } from '../src/config';
import { createPool } from '../src/db/pool';
import { RealtimeHub } from '../src/realtime/hub';
import { attachRealtime } from '../src/realtime/websocket';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://courts:courts@localhost:5433/courts_test';

export const TEST_DATE = '2030-06-10';

/** A facility-local wall-clock time on TEST_DATE, e.g. at(10) = 10:00 Madrid. */
export function at(hour: number, minute = 0, second = 0): Date {
  return DateTime.fromISO(TEST_DATE, { zone: config.facilityTimezone })
    .set({ hour, minute, second })
    .toJSDate();
}

export interface TestContext {
  db: Pool;
  server: Server;
  hub: RealtimeHub;
  /** Mutable "now" seen by the app. */
  setNow: (d: Date) => void;
  close: () => Promise<void>;
}

export async function setupApp(): Promise<TestContext> {
  const db = createPool(TEST_DATABASE_URL);
  let now = at(10);
  const hub = new RealtimeHub();
  const app = createApp({ db, clock: () => now, realtime: hub });
  const server = app.listen(0);
  const realtime = attachRealtime(server, hub);
  return {
    db,
    server,
    hub,
    setNow: (d) => {
      now = d;
    },
    close: async () => {
      realtime.close();
      await new Promise((resolve) => server.close(resolve));
      await db.end();
    },
  };
}

export async function resetDb(db: Pool): Promise<void> {
  await db.query('TRUNCATE bookings, courts, users RESTART IDENTITY CASCADE');
}

export async function createUser(
  db: Pool,
  opts: { email: string; role?: Role; password?: string },
): Promise<{ id: number; token: string }> {
  const role = opts.role ?? 'user';
  const hash = await bcrypt.hash(opts.password ?? 'password123', 4);
  const { rows } = await db.query<{ id: number }>(
    'INSERT INTO users (email, name, password_hash, role) VALUES ($1, $1, $2, $3) RETURNING id',
    [opts.email, hash, role],
  );
  const id = rows[0]!.id;
  return { id, token: signToken({ id, role }) };
}

export async function createCourt(
  db: Pool,
  opts: { name?: string; openHour?: number; closeHour?: number; price?: number; isActive?: boolean } = {},
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO courts (name, sport, hourly_price_cents, open_hour, close_hour, is_active)
     VALUES ($1, 'padel', $2, $3, $4, $5) RETURNING id`,
    [opts.name ?? 'Padel 1', opts.price ?? 2000, opts.openHour ?? 8, opts.closeHour ?? 23, opts.isActive ?? true],
  );
  return rows[0]!.id;
}
