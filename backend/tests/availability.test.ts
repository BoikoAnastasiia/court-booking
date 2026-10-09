import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_DATE, at, createCourt, createUser, resetDb, setupApp, type TestContext } from './helpers';

let ctx: TestContext;
let alice: { id: number; token: string };
let bob: { id: number; token: string };

beforeAll(async () => {
  ctx = await setupApp();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await resetDb(ctx.db);
  ctx.setNow(at(10));
  alice = await createUser(ctx.db, { email: 'alice@test.com' });
  bob = await createUser(ctx.db, { email: 'bob@test.com' });
});

function availability(token: string, courtId: number, date = TEST_DATE) {
  return request(ctx.server)
    .get(`/api/courts/${courtId}/availability`)
    .query({ date })
    .set('Authorization', `Bearer ${token}`);
}

describe('availability', () => {
  it("returns one slot per hour within the court's opening hours", async () => {
    const courtId = await createCourt(ctx.db, { openHour: 8, closeHour: 23 });
    const res = await availability(alice.token, courtId);
    expect(res.status).toBe(200);
    expect(res.body.slots.map((s: { startHour: number }) => s.startHour)).toEqual(
      Array.from({ length: 15 }, (_, i) => i + 8),
    );
  });

  it('marks past, booked, own and free slots', async () => {
    const courtId = await createCourt(ctx.db, { openHour: 8, closeHour: 23 });
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
    const body = { courtId, date: TEST_DATE };
    await request(ctx.server).post('/api/bookings').set(auth(bob.token)).send({ ...body, startHour: 12, durationHours: 2 });
    await request(ctx.server).post('/api/bookings').set(auth(alice.token)).send({ ...body, startHour: 18, durationHours: 1 });

    const res = await availability(alice.token, courtId);
    const byHour = Object.fromEntries(res.body.slots.map((s: { startHour: number; status: string }) => [s.startHour, s.status]));
    expect(byHour[9]).toBe('past');
    expect(byHour[10]).toBe('past'); // started at exactly "now"
    expect(byHour[11]).toBe('available');
    expect(byHour[12]).toBe('booked');
    expect(byHour[13]).toBe('booked');
    expect(byHour[14]).toBe('available');
    expect(byHour[18]).toBe('mine');
  });

  it('ignores cancelled bookings', async () => {
    const courtId = await createCourt(ctx.db);
    await ctx.db.query(
      `INSERT INTO bookings (court_id, user_id, starts_at, ends_at, price_cents, status, cancelled_at)
       VALUES ($1, $2, $3, $4, 0, 'cancelled', now())`,
      [courtId, bob.id, at(15), at(16)],
    );
    const res = await availability(alice.token, courtId);
    expect(res.body.slots.find((s: { startHour: number }) => s.startHour === 15).status).toBe('available');
  });

  it('rejects an invalid date', async () => {
    const courtId = await createCourt(ctx.db);
    const res = await availability(alice.token, courtId, '2030-02-30');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DATE');
  });

  it('returns 422 for an inactive court', async () => {
    const courtId = await createCourt(ctx.db, { isActive: false });
    const res = await availability(alice.token, courtId);
    expect(res.status).toBe(422);
  });
});
