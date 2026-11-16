import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { LATEST_VERSION } from './db/migrations';

export const DB_FILE = 'spade.db';

/** Why a file can't be brought over as Spade data, in plain words, or null when it can. */
export function importProblem(source: string): string | null {
  if (!fs.existsSync(source)) return 'That file is gone.';
  let db: Database.Database | undefined;
  try {
    db = new Database(source, { readonly: true, fileMustExist: true });
    const version = db.pragma('user_version', { simple: true }) as number;
    const hasTasks = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'tasks'").get();
    if (!hasTasks || version < 1) return 'That file is not a Spade database.';
    if (version > LATEST_VERSION) return 'That database comes from a newer Spade than this one. Update Spade, then try again.';
    return null;
  } catch {
    return 'That file is not a Spade database.';
  } finally {
    db?.close();
  }
}

/** Brings an older Spade's database and attached files into this data folder. The old files are only read; anything already here is saved to backups/ first. */
export async function importOldData(source: string, dataDir: string): Promise<void> {
  const problem = importProblem(source);
  if (problem) throw new Error(problem);

  const target = path.join(dataDir, DB_FILE);
  const backups = path.join(dataDir, 'backups');
  fs.mkdirSync(backups, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  // SQLite's own backup: a consistent copy even while the old app is still running and writing. It lands beside the database first, so a copy that fails halfway changes nothing.
  const incoming = `${target}.incoming`;
  fs.rmSync(incoming, { force: true });
  const old = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await old.backup(incoming);
  } finally {
    old.close();
  }

  if (fs.existsSync(target)) {
    const current = new Database(target);
    current.prepare('VACUUM INTO ?').run(path.join(backups, `before-import-${stamp}.db`));
    current.close();
    for (const suffix of ['-wal', '-shm']) fs.rmSync(target + suffix, { force: true });
  }
  fs.renameSync(incoming, target);
  fs.copyFileSync(target, path.join(backups, `imported-${stamp}.db`));

  const uploads = path.join(path.dirname(source), 'uploads');
  if (fs.existsSync(uploads)) fs.cpSync(uploads, path.join(dataDir, 'uploads'), { recursive: true, force: false });
}
