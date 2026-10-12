import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { TEST_DATE, at, createCourt, createUser, resetDb, setupApp, type TestContext } from './helpers';

let ctx: TestContext;
let alice: { id: number; token: string };
let bob: { id: number; token: string };
let admin: { id: number; token: string };
let courtId: number;
const sockets: WebSocket[] = [];

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
  admin = await createUser(ctx.db, { email: 'admin@test.com', role: 'admin' });
  courtId = await createCourt(ctx.db);
});
afterEach(() => {
  for (const ws of sockets.splice(0)) ws.terminate();
});

/** Opens a socket and collects every message it receives. */
function open(): { ws: WebSocket; messages: unknown[]; next: () => Promise<unknown> } {
  const { port } = ctx.server.address() as AddressInfo;
  const ws = new WebSocket(`ws://localhost:${port}/api/ws`);
  sockets.push(ws);
  const messages: unknown[] = [];
  const waiters: ((m: unknown) => void)[] = [];
  ws.on('message', (data) => {
    const message = JSON.parse(String(data));
    const waiter = waiters.shift();
    if (waiter) waiter(message);
    else messages.push(message);
  });
  const next = () =>
    messages.length > 0
      ? Promise.resolve(messages.shift())
      : new Promise((resolve, reject) => {
          waiters.push(resolve);
          setTimeout(() => reject(new Error('No message within 2s')), 2000);
        });
  return { ws, messages, next };
}

async function connectAs(token: string) {
  const client = open();
  await new Promise((resolve) => client.ws.once('open', resolve));
  client.ws.send(JSON.stringify({ type: 'auth', token }));
  expect(await client.next()).toEqual({ type: 'ready' });
  return client;
}

const closeCode = (ws: WebSocket) => new Promise<number>((resolve) => ws.once('close', (code) => resolve(code)));

describe('realtime availability', () => {
  it("pushes an event to other users when a slot is booked", async () => {
    const watcher = await connectAs(alice.token);
    await request(ctx.server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ courtId, date: TEST_DATE, startHour: 18, durationHours: 1 })
      .expect(201);

    expect(await watcher.next()).toEqual({ type: 'availability.changed', courtId, date: TEST_DATE });
  });

  it('pushes an event when a booking is cancelled', async () => {
    const booked = await request(ctx.server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ courtId, date: TEST_DATE, startHour: 18, durationHours: 1 });
    const watcher = await connectAs(alice.token);

    await request(ctx.server).post(`/api/bookings/${booked.body.id}/cancel`).set('Authorization', `Bearer ${bob.token}`).expect(200);
    expect(await watcher.next()).toEqual({ type: 'availability.changed', courtId, date: TEST_DATE });
  });

  it('does not push anything for a rejected booking', async () => {
    const watcher = await connectAs(alice.token);
    await request(ctx.server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ courtId, date: TEST_DATE, startHour: 7, durationHours: 1 })
      .expect(422);
    await new Promise((r) => setTimeout(r, 200));
    expect(watcher.messages).toEqual([]);
  });

  it('pushes courts.changed when an admin edits a court', async () => {
    const watcher = await connectAs(alice.token);
    await request(ctx.server).patch(`/api/courts/${courtId}`).set('Authorization', `Bearer ${admin.token}`).send({ isActive: false }).expect(200);
    expect(await watcher.next()).toEqual({ type: 'courts.changed' });
  });
});

describe('realtime authentication', () => {
  it('closes the socket when the first message has an invalid token', async () => {
    const client = open();
    await new Promise((resolve) => client.ws.once('open', resolve));
    const closed = closeCode(client.ws);
    client.ws.send(JSON.stringify({ type: 'auth', token: 'garbage' }));
    expect(await closed).toBe(4401);
    expect(ctx.hub.size).toBe(0);
  });

  it('does not deliver events to a socket that never authenticated', async () => {
    const anonymous = open();
    await new Promise((resolve) => anonymous.ws.once('open', resolve));
    await request(ctx.server)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ courtId, date: TEST_DATE, startHour: 18, durationHours: 1 })
      .expect(201);
    await new Promise((r) => setTimeout(r, 200));
    expect(anonymous.messages).toEqual([]);
  });

  it('rejects upgrades on other paths', async () => {
    const { port } = ctx.server.address() as AddressInfo;
    const ws = new WebSocket(`ws://localhost:${port}/somewhere-else`);
    sockets.push(ws);
    await expect(new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    })).rejects.toThrow();
  });
});
