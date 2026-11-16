import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { startCore } from '../src/core';
import { openDatabase } from '../src/db/connection';
import { importProblem } from '../src/importOld';
import { createRepositories } from '../src/repositories';

const TOKEN = 'made-up-token-0123456789abcdef0123456789';
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'spade-core-'));

const closers: (() => void)[] = [];
afterEach(() => closers.splice(0).forEach((close) => close()));

async function start(options: Partial<Parameters<typeof startCore>[0]> = {}) {
  const dataDir = options.dataDir ?? tmp();
  const core = await startCore({ dataDir, token: TOKEN, port: 0, ...options });
  closers.push(core.close);
  const api = (url: string, init: RequestInit = {}) => fetch(`http://127.0.0.1:${core.address.port}${url}`, { ...init, headers: { Cookie: `spade_token=${TOKEN}`, 'Content-Type': 'application/json', ...init.headers } });
  return { dataDir, core, api };
}

/** A made-up older Spade: a database with one to-do and one attached file beside it. */
async function oldSpade() {
  const dir = path.join(tmp(), 'server', 'data');
  const file = path.join(dir, 'todo.db');
  const db = openDatabase(file);
  await request(createApp(createRepositories(db), { uploadsDir: path.join(dir, 'uploads') })).post('/api/tasks').send({ title: 'Brought over from the old app' }).expect(201);
  db.close();
  fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'uploads', 'made-up-file.txt'), 'attached');
  return file;
}

describe('the desktop core', () => {
  it('keeps its database in the data folder and answers only this computer, only with the token', async () => {
    const { dataDir, core, api } = await start();
    expect(core.address.address).toBe('127.0.0.1');
    expect(fs.existsSync(path.join(dataDir, 'spade.db'))).toBe(true);

    expect((await fetch(`http://127.0.0.1:${core.address.port}/api/health`)).status).toBe(401);
    expect((await api('/api/health')).status).toBe(200);

    expect((await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Made-up to-do' }) })).status).toBe(201);
    const tasks = (await (await api('/api/tasks')).json()) as { title: string }[];
    expect(tasks.map((t) => t.title)).toEqual(['Made-up to-do']);
  });

  it("uses last time's port when it's free, and any other when it's taken", async () => {
    const first = await start();
    const port = first.core.address.port;
    closers.splice(0).forEach((close) => close());
    expect((await start({ port })).core.address.port).toBe(port);

    const squatter = net.createServer().listen(0, '127.0.0.1');
    await new Promise((resolve) => squatter.once('listening', resolve));
    closers.push(() => squatter.close());
    const taken = (squatter.address() as net.AddressInfo).port;
    const other = (await start({ port: taken })).core.address.port;
    expect(other).not.toBe(taken);
    expect(other).toBeGreaterThan(0);
  });

  it('sends pop-ups through whatever it is given', async () => {
    const sent: string[] = [];
    const { api } = await start({ sendPopup: (p) => sent.push(p.title) });
    expect((await api('/api/popups/test', { method: 'POST' })).status).toBe(204);
    expect(sent).toEqual(['Spade pop-ups are working']);
  });
});

describe('bringing over an older Spade', () => {
  it('copies the database and attached files, and leaves the old ones exactly as they were', async () => {
    const source = await oldSpade();
    const before = fs.readFileSync(source);

    const { dataDir, api } = await start({ importFrom: source });
    const tasks = (await (await api('/api/tasks')).json()) as { title: string }[];
    expect(tasks.map((t) => t.title)).toEqual(['Brought over from the old app']);
    expect(fs.readFileSync(path.join(dataDir, 'uploads', 'made-up-file.txt'), 'utf8')).toBe('attached');
    expect(fs.readdirSync(path.join(dataDir, 'backups')).some((f) => f.startsWith('imported-'))).toBe(true);

    expect(fs.readFileSync(source).equals(before)).toBe(true);
    expect(fs.existsSync(path.join(path.dirname(source), 'uploads', 'made-up-file.txt'))).toBe(true);
  });

  it('saves what was already in the new app before replacing it', async () => {
    const first = await start();
    await first.api('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Typed into the new app first' }) });
    closers.splice(0).forEach((close) => close());

    const { dataDir, api } = await start({ dataDir: first.dataDir, importFrom: await oldSpade() });
    expect(((await (await api('/api/tasks')).json()) as { title: string }[]).map((t) => t.title)).toEqual(['Brought over from the old app']);

    const saved = fs.readdirSync(path.join(dataDir, 'backups')).find((f) => f.startsWith('before-import-'));
    expect(saved).toBeDefined();
    const kept = openDatabase(path.join(dataDir, 'backups', saved!));
    expect(kept.prepare('SELECT title FROM tasks').all()).toEqual([{ title: 'Typed into the new app first' }]);
    kept.close();
  });

  it("refuses a file that isn't a Spade database, without touching what's there", async () => {
    const notSpade = path.join(tmp(), 'notes.db');
    fs.writeFileSync(notSpade, 'just some text');
    expect(importProblem(notSpade)).toBe('That file is not a Spade database.');
    expect(importProblem(path.join(tmp(), 'missing.db'))).toBe('That file is gone.');

    const first = await start();
    await first.api('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Still here' }) });
    closers.splice(0).forEach((close) => close());
    await expect(startCore({ dataDir: first.dataDir, token: TOKEN, port: 0, importFrom: notSpade })).rejects.toThrow('not a Spade database');
    const { api } = await start({ dataDir: first.dataDir });
    expect(((await (await api('/api/tasks')).json()) as { title: string }[]).map((t) => t.title)).toEqual(['Still here']);
  });

  it('refuses a database from a newer Spade', async () => {
    const source = await oldSpade();
    const db = openDatabase(source);
    db.pragma('user_version = 9999');
    db.close();
    expect(importProblem(source)).toMatch(/newer Spade/);
  });
});
