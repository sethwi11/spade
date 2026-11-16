import { z } from 'zod';
import type { FocusState } from './focusTimer';
import { LocalDateTimeSchema } from './localTime';
import type { NowSummary } from './nowSummary';
import type { Popup } from './popups';

/** What a desktop menu item can ask the page to do. */
export type DesktopCommand = 'new-task' | 'new-event' | 'import' | 'search' | 'undo' | 'settings' | 'shortcuts';

/** `window.spade`: what the desktop app adds to the page. Undefined in a browser, where everything must still work. Each `on…` returns a function that stops listening. */
export interface SpadeBridge {
  platform: string;
  version: string;
  /** The app asks the page to open an address (a menu item, a clicked pop-up). */
  onNavigate(listener: (path: string) => void): () => void;
  onCommand(listener: (command: DesktopCommand) => void): () => void;
  /** The app changed something itself (a pop-up's Done button, the quick-add panel): show it, with Undo. */
  onActed(listener: (act: DesktopAct) => void): () => void;
  /** A file opened with Spade (dropped on the Dock icon, "Open With"): read it like an imported one. */
  onOpenFile(listener: (file: { name: string; data: Uint8Array }) => void): () => void;
  /** The quick-add panel was opened: start over with this text. */
  onQuickAdd(listener: (text: string) => void): () => void;
  /** Closes the quick-add panel; with a to-do, says it was added. */
  quickAddDone(added?: QuickAdded): Promise<void>;
  /** The focus timer runs in the app, so closing the window doesn't stop it. */
  onFocus(listener: (state: FocusState | null) => void): () => void;
  focusStart(item: FocusRequest): Promise<void>;
  focusStop(): Promise<void>;
  /** Choices that belong to this computer, not to the data. */
  getPrefs(): Promise<DesktopPrefs>;
  setPrefs(changes: DesktopPrefsChange): Promise<DesktopPrefs>;
}

// What the page may send the app. Each is checked again in the main process (desktop/src/main/ipc.ts).

export const QuickAddedSchema = z.object({ id: z.uuid(), title: z.string().min(1).max(200) });
export type QuickAdded = z.infer<typeof QuickAddedSchema>;

export const FocusRequestSchema = z.object({ key: z.string().min(1).max(200), title: z.string().min(1).max(200), end: LocalDateTimeSchema });
export type FocusRequest = z.infer<typeof FocusRequestSchema>;

/** One to three modifiers and a key, as Electron writes shortcuts: "Control+Alt+Space". */
export const ShortcutSchema = z.string().regex(/^((Command|Control|Alt|Shift)\+){1,3}([A-Z0-9]|Space|F([1-9]|1[0-9]|2[0-4]))$/);

export const DesktopPrefsChangeSchema = z.strictObject({ openAtLogin: z.boolean(), trayTitle: z.boolean(), badge: z.boolean(), quickAddShortcut: ShortcutSchema }).partial();
export type DesktopPrefsChange = z.infer<typeof DesktopPrefsChangeSchema>;
export interface DesktopPrefs extends Required<DesktopPrefsChange> {
  /** Only the installed app can be opened at login. */
  canOpenAtLogin: boolean;
}

/** The shortcut a key press means, or null if it has no Control, Option or Command, or isn't a key a shortcut can end in. */
export function shortcutFrom(e: { key: string; code: string; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; metaKey: boolean }): string | null {
  // `code`, not `key`: Option changes the letter a key types.
  const key = e.code === 'Space' ? 'Space' : (/^(?:Key|Digit)([A-Z0-9])$/.exec(e.code)?.[1] ?? (/^F\d{1,2}$/.test(e.key) ? e.key : null));
  if (!key || !(e.ctrlKey || e.altKey || e.metaKey)) return null;
  const shortcut = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Command', key].filter(Boolean).join('+');
  return ShortcutSchema.safeParse(shortcut).success ? shortcut : null;
}

/** "Control+Alt+Space" as a Mac shows it: ⌃⌥Space. */
export const shortcutLabel = (shortcut: string) => shortcut.replace('Control+', '⌃').replace('Alt+', '⌥').replace('Shift+', '⇧').replace('Command+', '⌘');

const LINK_PAGES: Record<string, string> = { home: '/', today: '/today', calendar: '/calendar', tasks: '/tasks', applications: '/applications', courses: '/courses', journal: '/journal' };

/** Where a spade:// link goes: a page, a to-do, or the quick-add panel with its text (never added by itself). Anything else opens Today. */
export function parseSpadeLink(link: string): { path: string } | { add: string } {
  const today = { path: '/today' };
  if (link.length > 2000 || !URL.canParse(link)) return today;
  const url = new URL(link);
  if (url.protocol !== 'spade:') return today;
  const rest = url.pathname.replace(/^\/+|\/+$/g, '');
  if (url.hostname === 'add' && rest === '') return { add: (url.searchParams.get('text') ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) };
  if (url.hostname === 'task') return z.uuid().safeParse(rest).success ? { path: `/tasks?task=${rest}` } : today;
  return rest === '' && Object.hasOwn(LINK_PAGES, url.hostname) ? { path: LINK_PAGES[url.hostname]! } : today;
}

/** Something the desktop app did outside the window. */
export interface DesktopAct {
  message: string;
  /** Undo reopens this to-do. */
  reopenTaskId?: string;
  /** Undo deletes this to-do (it was just added). */
  deleteTaskId?: string;
}

/** What the desktop app asks the core for whenever the plan may have changed. */
export interface DesktopState {
  /** Every pop-up for yesterday (a bedtime after midnight is yesterday's), the day being planned and tomorrow. */
  popups: Popup[];
  summary: NowSummary;
  /** Pop-ups are paused until then, if it's still ahead. */
  pausedUntil: string | null;
}
