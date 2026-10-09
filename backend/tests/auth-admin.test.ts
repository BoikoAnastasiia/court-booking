import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_DATE, at, createCourt, createUser, resetDb, setupApp, type TestContext } from './helpers';

let ctx: TestContext;
let user: { id: number; token: string };
let admin: { id: number; token: string };

beforeAll(async () => {
  ctx = await setupApp();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await resetDb(ctx.db);
  ctx.setNow(at(10));
  user = await createUser(ctx.db, { email: 'user@test.com' });
  admin = await createUser(ctx.db, { email: 'admin@test.com', role: 'admin', password: 'admin123' });
});

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const newCourt = { name: 'New Court', sport: 'tennis', hourlyPriceCents: 2500, openHour: 9, closeHour: 21 };

describe('authentication', () => {
  it('logs in with valid credentials', async () => {
    const res = await request(ctx.server).post('/api/auth/login').send({ email: 'admin@test.com', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
    const me = await request(ctx.server).get('/api/auth/me').set(auth(res.body.token));
    expect(me.body.email).toBe('admin@test.com');
  });

  it('rejects a wrong password', async () => {
    const res = await request(ctx.server).post('/api/auth/login').send({ email: 'admin@test.com', password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('rejects requests without a valid token', async () => {
    expect((await request(ctx.server).get('/api/courts')).status).toBe(401);
    expect((await request(ctx.server).get('/api/courts').set(auth('garbage'))).status).toBe(401);
  });
});

describe('role separation on the API', () => {
  it('forbids users from managing courts', async () => {
    const courtId = await createCourt(ctx.db);
    expect((await request(ctx.server).post('/api/courts').set(auth(user.token)).send(newCourt)).status).toBe(403);
    expect((await request(ctx.server).patch(`/api/courts/${courtId}`).set(auth(user.token)).send({ isActive: false })).status).toBe(403);
  });

  it('forbids users from the admin day view', async () => {
    const res = await request(ctx.server).get('/api/admin/bookings').query({ date: TEST_DATE }).set(auth(user.token));
    expect(res.status).toBe(403);
  });

  it('forbids admins from creating customer bookings', async () => {
    const courtId = await createCourt(ctx.db);
    const res = await request(ctx.server)
      .post('/api/bookings')
      .set(auth(admin.token))
      .send({ courtId, date: TEST_DATE, startHour: 18, durationHours: 1 });
    expect(res.status).toBe(403);
  });
});

describe('court management', () => {
  it('creates and edits a court', async () => {
    const created = await request(ctx.server).post('/api/courts').set(auth(admin.token)).send(newCourt);
    expect(created.status).toBe(201);
    const updated = await request(ctx.server)
      .patch(`/api/courts/${created.body.id}`)
      .set(auth(admin.token))
      .send({ hourlyPriceCents: 3000, closeHour: 22 });
    expect(updated.body).toMatchObject({ hourlyPriceCents: 3000, openHour: 9, closeHour: 22 });
  });

  it('validates opening hours', async () => {
    const res = await request(ctx.server).post('/api/courts').set(auth(admin.token)).send({ ...newCourt, openHour: 21, closeHour: 9 });
    expect(res.status).toBe(400);
    const courtId = await createCourt(ctx.db, { openHour: 8, closeHour: 12 });
    const patch = await request(ctx.server).patch(`/api/courts/${courtId}`).set(auth(admin.token)).send({ openHour: 13 });
    expect(patch.status).toBe(400);
  });

  it('rejects duplicate court names', async () => {
    await request(ctx.server).post('/api/courts').set(auth(admin.token)).send(newCourt);
    const res = await request(ctx.server).post('/api/courts').set(auth(admin.token)).send(newCourt);
    expect(res.status).toBe(409);
  });

  it('deactivating hides the court from users but keeps its bookings', async () => {
    const courtId = await createCourt(ctx.db);
    const booked = await request(ctx.server)
      .post('/api/bookings')
      .set(auth(user.token))
      .send({ courtId, date: TEST_DATE, startHour: 18, durationHours: 1 });
    expect(booked.status).toBe(201);

    await request(ctx.server).patch(`/api/courts/${courtId}`).set(auth(admin.token)).send({ isActive: false });

    expect((await request(ctx.server).get('/api/courts').set(auth(user.token))).body).toEqual([]);
    expect((await request(ctx.server).get('/api/courts').set(auth(admin.token))).body).toHaveLength(1);
    const mine = await request(ctx.server).get('/api/bookings/me').set(auth(user.token));
    expect(mine.body.upcoming).toHaveLength(1);
    const day = await request(ctx.server).get('/api/admin/bookings').query({ date: TEST_DATE }).set(auth(admin.token));
    expect(day.body.bookings).toHaveLength(1);
  });
});

describe('admin day view', () => {
  it('lists the day across courts and sums revenue of confirmed bookings only', async () => {
    const padel = await createCourt(ctx.db, { name: 'Padel', price: 2000 });
    const tennis = await createCourt(ctx.db, { name: 'Tennis', price: 3000 });
    const post = (body: object) =>
      request(ctx.server).post('/api/bookings').set(auth(user.token)).send({ date: TEST_DATE, ...body });
    await post({ courtId: padel, startHour: 18, durationHours: 2 }); // 4000
    await post({ courtId: tennis, startHour: 12, durationHours: 1 }); // 3000
    const toCancel = await post({ courtId: tennis, startHour: 20, durationHours: 1 });
    await request(ctx.server).post(`/api/bookings/${toCancel.body.id}/cancel`).set(auth(user.token));
    await post({ courtId: padel, date: '2030-06-11', startHour: 18, durationHours: 1 }); // other day

    const res = await request(ctx.server).get('/api/admin/bookings').query({ date: TEST_DATE }).set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.bookings).toHaveLength(3);
    expect(res.body.confirmedCount).toBe(2);
    expect(res.body.totalRevenueCents).toBe(7000);
  });

  it('uses the price at booking time, not the current court price', async () => {
    const padel = await createCourt(ctx.db, { price: 2000 });
    await request(ctx.server).post('/api/bookings').set(auth(user.token)).send({ courtId: padel, date: TEST_DATE, startHour: 18, durationHours: 1 });
    await request(ctx.server).patch(`/api/courts/${padel}`).set(auth(admin.token)).send({ hourlyPriceCents: 9900 });
    const res = await request(ctx.server).get('/api/admin/bookings').query({ date: TEST_DATE }).set(auth(admin.token));
    expect(res.body.totalRevenueCents).toBe(2000);
  });
});
