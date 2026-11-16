import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db/connection';
import { guard } from '../src/middleware/guard';
import { createRepositories } from '../src/repositories';

const TOKEN = 'made-up-token-0123456789abcdef0123456789';
const HOST = '127.0.0.1:4321';

const setup = (clientDir?: string) => createApp(createRepositories(openDatabase(':memory:')), { uploadsDir: '/tmp', clientDir, guard: guard(TOKEN, () => 4321) });
const get = (app: ReturnType<typeof setup>, url = '/api/health') => request(app).get(url).set('Host', HOST);

describe("the desktop app's lock on its API", () => {
  it('answers a request with the right address and token, with a content policy and no CORS', async () => {
    const res = await get(setup()).set('Cookie', `other=1; spade_token=${TOKEN}`).expect(200);
    expect(res.body).toEqual({ ok: true });
    expect(res.headers['content-security-policy']).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(res.headers['content-security-policy']).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('refuses a request with no token', async () => {
    const res = await get(setup()).expect(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('refuses a wrong token, whatever its length', async () => {
    const app = setup();
    await get(app).set('Cookie', `spade_token=${TOKEN.replace('m', 'n')}`).expect(401);
    await get(app).set('Cookie', 'spade_token=short').expect(401);
    await get(app).set('Cookie', `spade_token=${TOKEN}x`).expect(401);
  });

  it('refuses any other Host, even with the right token', async () => {
    const app = setup();
    for (const host of ['evil.example:4321', 'localhost:4321', '127.0.0.1:9999', '127.0.0.1']) {
      await request(app).get('/api/health').set('Host', host).set('Cookie', `spade_token=${TOKEN}`).expect(403);
    }
  });

  it('locks writes and the app pages too, not just reads', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spade-client-'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Made-up page</title>');
    const app = setup(dir);
    await request(app).post('/api/tasks').set('Host', HOST).send({ title: 'Should not be saved' }).expect(401);
    await get(app, '/').expect(401);
    const page = await get(app, '/today').set('Cookie', `spade_token=${TOKEN}`).expect(200);
    expect(page.text).toContain('Made-up page');
  });

  it('is off unless asked for, so the browser app is unchanged', async () => {
    const app = createApp(createRepositories(openDatabase(':memory:')), { uploadsDir: '/tmp' });
    const res = await request(app).get('/api/health').expect(200);
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});
