import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { DesktopPrefsChangeSchema, FocusRequestSchema, QuickAddedSchema, type DesktopPrefs, type DesktopPrefsChange, type FocusRequest, type QuickAdded } from '@todo/shared';
import { z } from 'zod';
import { sameOrigin } from './windows';

// The only place the page can call into the app. Each action has a name; there is no "run this" channel.

export interface IpcHandlers {
  getPrefs: () => DesktopPrefs;
  setPrefs: (changes: DesktopPrefsChange) => DesktopPrefs;
  quickAddDone: (added: QuickAdded | undefined) => void;
  focusStart: (item: FocusRequest) => Promise<void>;
  focusStop: () => void;
}

/** Wraps a handler: the caller must be one of the app's own pages, and what it sent must have the expected shape. */
export function guarded<T, R>(origin: () => string, schema: z.ZodType<T>, run: (input: T) => R) {
  return (event: Pick<IpcMainInvokeEvent, 'senderFrame'>, raw: unknown): R => {
    if (!sameOrigin(event.senderFrame?.url ?? '', origin())) throw new Error('Refused: not a Spade page.');
    return run(schema.parse(raw));
  };
}

export function registerIpc(origin: () => string, h: IpcHandlers): void {
  ipcMain.handle('spade:get-prefs', guarded(origin, z.undefined(), h.getPrefs));
  ipcMain.handle('spade:set-prefs', guarded(origin, DesktopPrefsChangeSchema, h.setPrefs));
  ipcMain.handle('spade:quick-add-done', guarded(origin, QuickAddedSchema.optional(), h.quickAddDone));
  ipcMain.handle('spade:focus-start', guarded(origin, FocusRequestSchema, h.focusStart));
  ipcMain.handle('spade:focus-stop', guarded(origin, z.undefined(), h.focusStop));
}
