import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';
import type { Pool } from 'pg';
import { config } from '../config';
import { createPool } from './pool';

const USERS = [
  { email: 'admin@example.com', name: 'Facility Admin', password: 'admin123', role: 'admin' },
  { email: 'alice@example.com', name: 'Alice Martin', password: 'password123', role: 'user' },
  { email: 'bob@example.com', name: 'Bob Garcia', password: 'password123', role: 'user' },
] as const;

const COURTS = [
  { name: 'Padel 1', sport: 'Padel', price: 2400, open: 8, close: 23, active: true },
  { name: 'Padel 2', sport: 'Padel', price: 2400, open: 8, close: 23, active: true },
  { name: 'Padel 3 · Panoramic', sport: 'Padel', price: 2800, open: 8, close: 23, active: true },
  { name: 'Indoor Court 1', sport: 'Tennis Indoor', price: 3200, open: 7, close: 22, active: true },
  { name: 'Indoor Court 2', sport: 'Tennis Indoor', price: 3200, open: 7, close: 22, active: true },
  { name: 'Clay Court', sport: 'Tennis Outdoor', price: 2600, open: 8, close: 21, active: true },
  { name: 'Hard Court', sport: 'Tennis Outdoor', price: 2400, open: 8, close: 21, active: true },
  { name: 'Squash Court A', sport: 'Squash', price: 1600, open: 7, close: 23, active: true },
  { name: 'Badminton Hall', sport: 'Badminton', price: 1400, open: 8, close: 22, active: true },
  { name: 'Pickleball Court', sport: 'Pickleball', price: 1800, open: 9, close: 21, active: true },
  { name: 'Squash Court B (closed)', sport: 'Squash', price: 1500, open: 9, close: 21, active: false },
] as const;

// [court index, user email, day offset from today, start hour, duration]
const BOOKINGS: [number, string, number, number, 1 | 2][] = [
  [0, 'alice@example.com', -2, 18, 2],
  [10, 'bob@example.com', -1, 10, 1], // history on the now-inactive court
  [1, 'bob@example.com', -1, 19, 1],
  [3, 'alice@example.com', -1, 9, 1],
  [0, 'alice@example.com', 0, 21, 1],
  [3, 'bob@example.com', 0, 20, 1],
  [1, 'bob@example.com', 0, 19, 2],
  [5, 'alice@example.com', 0, 18, 1],
  [0, 'bob@example.com', 1, 9, 2],
  [1, 'alice@example.com', 1, 18, 1],
  [2, 'bob@example.com', 1, 19, 2],
  [6, 'bob@example.com', 1, 10, 1],
  [7, 'alice@example.com', 1, 20, 1],
  [3, 'alice@example.com', 2, 10, 2],
  [8, 'bob@example.com', 2, 18, 1],
  [9, 'alice@example.com', 2, 11, 1],
  [0, 'bob@example.com', 3, 20, 2],
  [4, 'alice@example.com', 3, 17, 2],
];

/** Seeds demo data once; does nothing if any user already exists. */
export async function seed(db: Pool): Promise<boolean> {
  const { rows } = await db.query<{ count: number }>('SELECT count(*) AS count FROM users');
  if (rows[0]!.count > 0) return false;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const userIds = new Map<string, number>();
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      const r = await client.query<{ id: number }>(
        'INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [u.email, u.name, hash, u.role],
      );
      userIds.set(u.email, r.rows[0]!.id);
    }
    const courtIds: number[] = [];
    for (const c of COURTS) {
      const r = await client.query<{ id: number }>(
        `INSERT INTO courts (name, sport, hourly_price_cents, open_hour, close_hour, is_active)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [c.name, c.sport, c.price, c.open, c.close, c.active],
      );
      courtIds.push(r.rows[0]!.id);
    }
    const today = DateTime.now().setZone(config.facilityTimezone).startOf('day');
    for (const [courtIdx, email, dayOffset, hour, duration] of BOOKINGS) {
      const start = today.plus({ days: dayOffset }).set({ hour });
      await client.query(
        `INSERT INTO bookings (court_id, user_id, starts_at, ends_at, price_cents)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          courtIds[courtIdx],
          userIds.get(email),
          start.toJSDate(),
          start.plus({ hours: duration }).toJSDate(),
          COURTS[courtIdx]!.price * duration,
        ],
      );
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const pool = createPool();
  seed(pool)
    .then((didSeed) => console.log(didSeed ? 'Seed data inserted' : 'Database already seeded, skipping'))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
