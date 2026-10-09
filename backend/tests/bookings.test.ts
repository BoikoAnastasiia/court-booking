import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_DATE, at, createCourt, createUser, resetDb, setupApp, type TestContext } from './helpers';

let ctx: TestContext;
let alice: { id: number; token: string };
let bob: { id: number; token: string };
let courtId: number;

beforeAll(async () => {
  ctx = await setupApp();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await resetDb(ctx.db);
  ctx.setNow(at(10)); // 2030-06-10 10:00 facility time
  alice = await createUser(ctx.db, { email: 'alice@test.com' });
  bob = await createUser(ctx.db, { email: 'bob@test.com' });
  courtId = await createCourt(ctx.db, { openHour: 8, closeHour: 23, price: 2000 });
});

function book(token: string, body: Record<string, unknown>) {
  return request(ctx.server)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ courtId, date: TEST_DATE, durationHours: 1, ...body });
}

function cancel(token: string, id: number) {
  return request(ctx.server).post(`/api/bookings/${id}/cancel`).set('Authorization', `Bearer ${token}`);
}

describe('creating a booking', () => {
  it('books a free slot and snapshots the price', async () => {
    const res = await book(alice.token, { startHour: 18, durationHours: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ courtId, userId: alice.id, status: 'confirmed', priceCents: 4000 });
    expect(new Date(res.body.startsAt)).toEqual(at(18));
    expect(new Date(res.body.endsAt)).toEqual(at(20));
  });

  it('rejects durations other than 1 or 2 hours', async () => {
    const res = await book(alice.token, { startHour: 18, durationHours: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects booking an inactive court', async () => {
    await ctx.db.query('UPDATE courts SET is_active = false WHERE id = $1', [courtId]);
    const res = await book(alice.token, { startHour: 18 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('COURT_INACTIVE');
  });
});

describe('double-booking prevention', () => {
  it('rejects the exact same slot', async () => {
    expect((await book(alice.token, { startHour: 18 })).status).toBe(201);
    const res = await book(bob.token, { startHour: 18 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_TAKEN');
  });

  it('rejects partial overlaps with a 2-hour booking, but allows adjacent slots', async () => {
    expect((await book(alice.token, { startHour: 18, durationHours: 2 })).status).toBe(201);
    expect((await book(bob.token, { startHour: 19 })).status).toBe(409);
    expect((await book(bob.token, { startHour: 17, durationHours: 2 })).status).toBe(409);
    expect((await book(bob.token, { startHour: 17 })).status).toBe(201);
    expect((await book(bob.token, { startHour: 20 })).status).toBe(201);
  });

  it('allows the same slot on a different court', async () => {
    const otherCourt = await createCourt(ctx.db, { name: 'Padel 2' });
    expect((await book(alice.token, { startHour: 18 })).status).toBe(201);
    expect((await book(bob.token, { startHour: 18, courtId: otherCourt })).status).toBe(201);
  });

  it('frees the slot again after a cancellation', async () => {
    const first = await book(alice.token, { startHour: 18 });
    expect((await cancel(alice.token, first.body.id)).status).toBe(200);
    expect((await book(bob.token, { startHour: 18 })).status).toBe(201);
  });

  it('lets exactly one of many simultaneous requests win', async () => {
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) => createUser(ctx.db, { email: `racer${i}@test.com` })),
    );
    // Mix of 1h and 2h requests that all cover 18:00–19:00.
    const responses = await Promise.all(
      users.map((u, i) => book(u.token, i % 2 ? { startHour: 18 } : { startHour: 17, durationHours: 2 })),
    );
    const statuses = responses.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);

    const { rows } = await ctx.db.query("SELECT count(*)::int AS n FROM bookings WHERE status = 'confirmed'");
    expect(rows[0].n).toBe(1);
  });

  it('is enforced by the database even when the API is bypassed', async () => {
    const insert = (userId: number) =>
      ctx.db.query(
        `INSERT INTO bookings (court_id, user_id, starts_at, ends_at, price_cents) VALUES ($1, $2, $3, $4, 0)`,
        [courtId, userId, at(18), at(19)],
      );
    await insert(alice.id);
    await expect(insert(bob.id)).rejects.toMatchObject({ code: '23P01' });
  });
});

describe('opening hours', () => {
  it('rejects a slot starting before opening', async () => {
    const res = await book(alice.token, { startHour: 7 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('rejects a booking that would run past closing', async () => {
    const res = await book(alice.token, { startHour: 22, durationHours: 2 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('accepts the first and last slot of the day', async () => {
    ctx.setNow(at(6));
    expect((await book(alice.token, { startHour: 8 })).status).toBe(201);
    expect((await book(alice.token, { startHour: 22 })).status).toBe(201);
  });

  it('supports courts open until midnight', async () => {
    const lateCourt = await createCourt(ctx.db, { name: 'Late', openHour: 16, closeHour: 24 });
    const res = await book(alice.token, { courtId: lateCourt, startHour: 22, durationHours: 2 });
    expect(res.status).toBe(201);
    expect(new Date(res.body.endsAt)).toEqual(at(24));
  });
});

describe('bookings in the past', () => {
  it('rejects a slot earlier today', async () => {
    const res = await book(alice.token, { startHour: 9 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BOOKING_IN_PAST');
  });

  it('rejects a slot that has already started', async () => {
    ctx.setNow(at(10, 1));
    const res = await book(alice.token, { startHour: 10 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BOOKING_IN_PAST');
  });

  it('rejects a previous date', async () => {
    const res = await book(alice.token, { date: '2030-06-09', startHour: 18 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BOOKING_IN_PAST');
  });
});

describe('cancellation window', () => {
  async function bookAt14() {
    const res = await book(alice.token, { startHour: 14 });
    expect(res.status).toBe(201);
    return res.body.id as number;
  }

  it('allows cancelling more than 2 hours before start', async () => {
    const id = await bookAt14();
    ctx.setNow(at(11, 59));
    const res = await cancel(alice.token, id);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('allows cancelling exactly 2 hours before start', async () => {
    const id = await bookAt14();
    ctx.setNow(at(12));
    expect((await cancel(alice.token, id)).status).toBe(200);
  });

  it('rejects cancelling less than 2 hours before start', async () => {
    const id = await bookAt14();
    ctx.setNow(at(12, 0, 1));
    const res = await cancel(alice.token, id);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CANCELLATION_WINDOW_CLOSED');
    expect(res.body.error.message).toMatch(/2 hours/);
  });

  it("does not let a user cancel someone else's booking", async () => {
    const id = await bookAt14();
    expect((await cancel(bob.token, id)).status).toBe(404);
  });

  it('rejects cancelling twice', async () => {
    const id = await bookAt14();
    expect((await cancel(alice.token, id)).status).toBe(200);
    const res = await cancel(alice.token, id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_CANCELLED');
  });
});

describe('my bookings', () => {
  it('splits upcoming and past and flags cancellability', async () => {
    ctx.setNow(at(8));
    await book(alice.token, { startHour: 9 });
    await book(alice.token, { startHour: 11 });
    await book(alice.token, { startHour: 18 });
    await book(bob.token, { startHour: 20 });
    ctx.setNow(at(10));

    const res = await request(ctx.server).get('/api/bookings/me').set('Authorization', `Bearer ${alice.token}`);
    expect(res.status).toBe(200);
    expect(res.body.past.map((b: { startsAt: string }) => new Date(b.startsAt))).toEqual([at(9)]);
    expect(res.body.upcoming.map((b: { startsAt: string; canCancel: boolean }) => [new Date(b.startsAt), b.canCancel])).toEqual([
      [at(11), false],
      [at(18), true],
    ]);
  });
});
