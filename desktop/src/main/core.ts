import { utilityProcess } from 'electron';
import log from 'electron-log/main';
import { z } from 'zod';

const PopupSchema = z.object({ title: z.string(), body: z.string(), url: z.string() });
export type Popup = z.infer<typeof PopupSchema>;
const MessageSchema = z.union([z.object({ port: z.number().int().positive() }), z.object({ popup: PopupSchema }), z.object({ error: z.string() })]);

export const TOKEN_COOKIE = 'spade_token';

export interface CoreOptions {
  script: string;
  dataDir: string;
  token: string;
  port: number;
  clientDir?: string;
  importFrom?: string;
  onPopup: (popup: Popup) => void;
  /** It stopped by itself after it was up and running. */
  onCrash: (code: number) => void;
}

export interface Core {
  port: number;
  /** Stops it and waits until it's gone, so its database is closed. */
  stop: () => Promise<void>;
}

/** Starts the core (the API and the database) in its own process, and resolves once it answers a health check. Rejects with the reason if it doesn't come up. */
export function startCore(options: CoreOptions): Promise<Core> {
  return new Promise((resolve, reject) => {
    const env: Record<string, string> = { ...(process.env as Record<string, string>), SPADE_DATA_DIR: options.dataDir, SPADE_TOKEN: options.token, SPADE_PORT: String(options.port) };
    if (options.clientDir) env.SPADE_CLIENT_DIR = options.clientDir;
    if (options.importFrom) env.SPADE_IMPORT_FROM = options.importFrom;
    else delete env.SPADE_IMPORT_FROM;

    const child = utilityProcess.fork(options.script, [], { serviceName: 'Spade Core', stdio: 'pipe', env });
    child.stdout?.on('data', (chunk) => log.info('[core]', String(chunk).trimEnd()));
    child.stderr?.on('data', (chunk) => log.error('[core]', String(chunk).trimEnd()));

    let up = false;
    let stopping = false;
    let reason = '';
    const timeout = setTimeout(() => {
      reason = 'It took more than 30 seconds to start.';
      child.kill();
    }, 30_000);

    child.on('message', (raw) => {
      const message = MessageSchema.safeParse(raw);
      if (!message.success) return;
      if ('popup' in message.data) return options.onPopup(message.data.popup);
      if ('error' in message.data) return void (reason = message.data.error);
      const { port } = message.data;
      fetch(`http://127.0.0.1:${port}/api/health`, { headers: { Cookie: `${TOKEN_COOKIE}=${options.token}` } }).then(
        (res) => {
          if (!res.ok) {
            reason = `Its health check answered ${res.status}.`;
            return void child.kill();
          }
          clearTimeout(timeout);
          up = true;
          resolve({
            port,
            stop: () =>
              new Promise((done) => {
                stopping = true;
                child.once('exit', () => done());
                child.kill();
              }),
          });
        },
        (err: unknown) => {
          reason = `Its health check failed: ${String(err)}`;
          child.kill();
        },
      );
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (!up) reject(new Error(reason || `It stopped while starting (code ${code}).`));
      else if (!stopping) options.onCrash(code);
    });
  });
}
