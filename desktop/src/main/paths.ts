import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Where this person's Spade lives. A development run gets its own folder, so it can never touch real data; SPADE_DATA_DIR points a test at a throwaway one. */
export function dataDir(appData: string, packaged: boolean, override = process.env.SPADE_DATA_DIR): string {
  return override ? path.resolve(override) : path.join(appData, packaged ? 'Spade' : 'Spade Dev');
}

/** The database of the older always-on Spade, worked out from its launch job's file. */
export function oldDatabaseFrom(plist: string): string | null {
  const dir = /<key>WorkingDirectory<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1];
  return dir ? path.join(dir, 'data', 'todo.db') : null;
}

/** That database, if the older Spade is still set up on this Mac and its data is still there. */
export function findOldDatabase(home = os.homedir()): string | null {
  try {
    const file = oldDatabaseFrom(fs.readFileSync(path.join(home, 'Library', 'LaunchAgents', 'com.planner.app.plist'), 'utf8'));
    return file && fs.existsSync(file) ? file : null;
  } catch {
    return null;
  }
}
