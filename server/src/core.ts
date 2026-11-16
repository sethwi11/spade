import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import type { Express } from 'express';
import { z } from 'zod';
import { createApp } from './app';
import { openDatabase } from './db/connection';
import { DB_FILE, importOldData } from './importOld';
import { guard } from './middleware/guard';
import { createPopupScheduler, type SendPopup } from './popups';
import { createRepositories } from './repositories';

export interface CoreOptions {
  dataDir: string;
  /** This launch's secret: every request must carry it. */
  token: string;
  /** The port used last time, or 0 for any. */
  port: number;
  clientDir?: string;
  /** An older Spade's database to bring over before opening. */
  importFrom?: string;
  sendPopup?: SendPopup;
}

/** Listens on this computer only. Reusing last time's port keeps the app's address the same between launches (the window's saved choices are kept per address); if something else has taken it, any free port will do. */
function listen(app: Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1');
    server.once('listening', () => resolve(server));
    server.once('error', (err: NodeJS.ErrnoException) => (err.code === 'EADDRINUSE' && port !== 0 ? resolve(listen(app, 0)) : reject(err)));
  });
}

/** The desktop app's core: the same API as `index.ts`, on a data folder and port the app chooses, locked to the app's own window. */
export async function startCore(options: CoreOptions): Promise<{ address: AddressInfo; close: () => void }> {
  if (options.importFrom) await importOldData(options.importFrom, options.dataDir);
  // Opening the database also upgrades its schema (after backing it up first).
  const db = openDatabase(path.join(options.dataDir, DB_FILE));
  const repos = createRepositories(db);

  let port = 0;
  const app = createApp(repos, { uploadsDir: path.join(options.dataDir, 'uploads'), clientDir: options.clientDir, sendPopup: options.sendPopup, guard: guard(options.token, () => port) });

  // Soft-deleted tasks only need to live long enough to be undone.
  await repos.tasks.purgeDeleted(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const server = await listen(app, options.port);
  const address = server.address() as AddressInfo;
  port = address.port;

  // Pop-ups, until the desktop app schedules them itself: check the plan every 20 seconds, so each one lands within its minute.
  let timer: NodeJS.Timeout | undefined;
  if (options.sendPopup) {
    const tick = createPopupScheduler(repos, options.sendPopup);
    const run = () => void tick().catch((err: unknown) => console.error('Pop-up check failed:', err));
    timer = setInterval(run, 20_000);
    run();
  }

  return {
    address,
    close: () => {
      clearInterval(timer);
      server.close();
      db.close();
    },
  };
}

// Inside the desktop app this file is the core process itself: the main process passes everything in the environment and hears back on parentPort.
const parent = (process as unknown as { parentPort?: { postMessage(message: unknown): void } }).parentPort;
if (parent) {
  const env = z
    .object({
      SPADE_DATA_DIR: z.string().min(1),
      SPADE_TOKEN: z.string().min(32),
      SPADE_PORT: z.coerce.number().int().min(0).max(65535),
      SPADE_CLIENT_DIR: z.string().min(1).optional(),
      SPADE_IMPORT_FROM: z.string().min(1).optional(),
    })
    .parse(process.env);
  startCore({ dataDir: env.SPADE_DATA_DIR, token: env.SPADE_TOKEN, port: env.SPADE_PORT, clientDir: env.SPADE_CLIENT_DIR, importFrom: env.SPADE_IMPORT_FROM, sendPopup: (popup) => parent.postMessage({ popup }) }).then(
    ({ address }) => parent.postMessage({ port: address.port }),
    (err: unknown) => {
      console.error('Spade could not start:', err);
      parent.postMessage({ error: err instanceof Error ? err.message : String(err) });
      // A moment for the message to leave before the process does.
      setTimeout(() => process.exit(1), 200);
    },
  );
}
