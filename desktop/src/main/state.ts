import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const BoundsSchema = z.object({ x: z.number().int(), y: z.number().int(), width: z.number().int().positive(), height: z.number().int().positive() });
export type Bounds = z.infer<typeof BoundsSchema>;

const StateSchema = z.object({
  /** The API's port last time, reused while it's free (see `listen` in server/src/core.ts). */
  port: z.number().int().min(0).max(65535).default(0),
  bounds: BoundsSchema.optional(),
  zoom: z.number().min(0.25).max(5).default(1),
});
export type State = z.infer<typeof StateSchema>;

const file = (dir: string) => path.join(dir, 'window.json');

/** What the app remembers between launches. A missing or damaged file just means the defaults. */
export function readState(dir: string): State {
  try {
    return StateSchema.parse(JSON.parse(fs.readFileSync(file(dir), 'utf8')));
  } catch {
    return StateSchema.parse({});
  }
}

export function writeState(dir: string, state: State): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file(dir), JSON.stringify(state));
}

/** The saved window position, if enough of its top edge is still on a screen to grab (a monitor may have been unplugged since). */
export function fitBounds(saved: Bounds | undefined, screens: Bounds[]): Bounds | undefined {
  if (!saved) return undefined;
  const grabbable = (s: Bounds) => saved.x + saved.width >= s.x + 100 && saved.x <= s.x + s.width - 100 && saved.y >= s.y && saved.y <= s.y + s.height - 100;
  return screens.some(grabbable) ? saved : undefined;
}
