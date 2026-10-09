import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser, resetDb, setupApp, type TestContext } from './helpers';

let ctx: TestContext;
let user: { id: number; token: string };

beforeAll(async () => {
  ctx = await setupApp();
});
afterAll(async () => {
  await ctx.close();
});
beforeEach(async () => {
  await resetDb(ctx.db);
  user = await createUser(ctx.db, { email: 'user@test.com' });
});

const auth = () => ({ Authorization: `Bearer ${user.token}` });

function image(width: number, height: number, format: 'png' | 'jpeg' = 'png') {
  return sharp({ create: { width, height, channels: 3, background: '#3a7' } })[format]().toBuffer();
}

describe('profile', () => {
  it('updates the display name', async () => {
    const res = await request(ctx.server).patch('/api/users/me').set(auth()).send({ name: '  New Name ' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  it('rejects an empty name', async () => {
    const res = await request(ctx.server).patch('/api/users/me').set(auth()).send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    expect((await request(ctx.server).patch('/api/users/me').send({ name: 'x' })).status).toBe(401);
  });
});

describe('avatar', () => {
  it('resizes an upload to a 200x200 WebP and serves it', async () => {
    const res = await request(ctx.server)
      .put('/api/users/me/avatar')
      .set(auth())
      .attach('avatar', await image(1600, 900, 'jpeg'), { filename: 'me.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toMatch(new RegExp(`^/api/users/${user.id}/avatar\\?v=\\d+$`));

    // Public endpoint: no token needed (used directly in <img src>).
    const img = await request(ctx.server).get(res.body.avatarUrl).buffer(true);
    expect(img.status).toBe(200);
    expect(img.headers['content-type']).toBe('image/webp');
    const meta = await sharp(img.body as Buffer).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 200, height: 200 });
  });

  it('rejects a file that is not a real image', async () => {
    const res = await request(ctx.server)
      .put('/api/users/me/avatar')
      .set(auth())
      .attach('avatar', Buffer.from('definitely not a png'), { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
  });

  it('rejects non-image uploads by type', async () => {
    const res = await request(ctx.server)
      .put('/api/users/me/avatar')
      .set(auth())
      .attach('avatar', Buffer.from('hello'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  it('removes the avatar', async () => {
    await request(ctx.server)
      .put('/api/users/me/avatar')
      .set(auth())
      .attach('avatar', await image(300, 300), { filename: 'a.png', contentType: 'image/png' });
    const res = await request(ctx.server).delete('/api/users/me/avatar').set(auth());
    expect(res.body.avatarUrl).toBeNull();
    expect((await request(ctx.server).get(`/api/users/${user.id}/avatar`)).status).toBe(404);
  });
});
