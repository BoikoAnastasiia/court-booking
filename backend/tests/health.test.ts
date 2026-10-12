import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createPool } from '../src/db/pool';
import { TEST_DATABASE_URL, setupApp, type TestContext } from './helpers';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await setupApp();
});
afterAll(async () => {
  await ctx.close();
});

describe('GET /api/health', () => {
  it('reports up when the database answers', async () => {
    const res = await request(ctx.server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: 'up' });
  });

  it('returns 503 when the database is unreachable', async () => {
    const brokenDb = { query: () => Promise.reject(new Error('connection refused')) } as unknown as Pool;
    const res = await request(createApp({ db: brokenDb })).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ ok: false, db: 'down' });
  });
});

describe('database pool', () => {
  it('survives Postgres dropping a connection instead of crashing the process', async () => {
    const pool = createPool(TEST_DATABASE_URL);
    // An 'error' event with no listener would throw here (and kill the server).
    expect(() => pool.emit('error', new Error('terminating connection due to administrator command'))).not.toThrow();
    await pool.end();
  });
});
