import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { app, dialog, globalShortcut, powerMonitor, screen, session, shell, type BrowserWindow } from 'electron';
import log from 'electron-log/main';
import { parseSpadeLink, type AppSettings, type DesktopAct, type DesktopCommand, type DesktopPrefs, type DesktopPrefsChange, type DesktopState, type FocusState, type Popup } from '@todo/shared';
import { startCore, TOKEN_COOKIE, type Core } from './core';
import { createFocus } from './focus';
import { registerIpc } from './ipc';
import { setMenu } from './menu';
import { showPopup, type PopupActions } from './notifications';
import { dataDir, findOldDatabase } from './paths';
import { createScheduler } from './scheduler';
import { createTray } from './tray';
import { readState, writeState } from './state';
import { createMainWindow, createQuickAddPanel, lockPermissions, PANEL_SIZE } from './windows';

// A development run is its own app with its own data and logs, so it can never touch the real ones.
if (!app.isPackaged) app.setName('Spade Dev');
const dir = dataDir(app.getPath('appData'), app.isPackaged);
app.setPath('userData', dir);
app.setAppLogsPath(process.env.SPADE_DATA_DIR ? path.join(dir, 'logs') : undefined);
const logFile = path.join(app.getPath('logs'), 'spade.log');
log.transports.file.resolvePathFn = () => logFile;
log.errorHandler.startCatching({ showDialog: false });

// Only a development run can be pointed at Vite's dev server.
const devUrl = app.isPackaged ? undefined : process.env.SPADE_DEV_URL;
const databaseFile = path.join(dir, 'spade.db');
// Made new at every launch: the page gets it as a cookie it can't read, and the API refuses anything without it.
const token = randomBytes(32).toString('hex');

let state = readState(dir);
let core: Core | undefined;
let win: BrowserWindow | undefined;
let quitting = false;
let lastCrash = 0;

const sinceLaunch = () => Math.round(Date.now() - (process.getCreationTime() ?? Date.now()));
const origin = () => (devUrl ? new URL(devUrl).origin : `http://127.0.0.1:${core?.port ?? 0}`);

function remember(change: Partial<typeof state>): void {
  state = { ...state, ...change };
  try {
    writeState(dir, state);
  } catch (err) {
    log.error('Could not save the window state:', err);
  }
}

function makeWindow(): BrowserWindow {
  const created = createMainWindow({
    origin,
    preload: path.join(__dirname, 'preload.cjs'),
    version: app.getVersion(),
    state,
    onClose: (bounds, zoom) => {
      remember({ bounds, zoom });
      if (!quitting && state.closeHint) void explainClose();
    },
  });
  created.on('closed', () => {
    if (win === created) win = undefined;
  });
  created.webContents.on('did-finish-load', () => {
    // What the app did while no window was open waits for the next one, so its Undo is still offered.
    acts.splice(0).forEach((act) => created.webContents.send('spade:acted', act));
    created.webContents.send('spade:focus', focus.state());
  });
  win = created;
  return created;
}

/** The first times the window is closed: Spade is still there, in the menu bar, which is what keeps the pop-ups coming. */
async function explainClose(): Promise<void> {
  const { response, checkboxChecked } = await dialog.showMessageBox({
    type: 'info',
    message: 'Spade is still running',
    detail: 'It stays in the menu bar so your notifications keep coming. To stop it, choose Quit Spade there or press ⌘Q.',
    buttons: ['OK', 'Quit Instead'],
    defaultId: 0,
    cancelId: 0,
    checkboxLabel: 'Don’t show this again',
  });
  if (checkboxChecked) remember({ closeHint: false });
  if (response === 1) app.quit();
}

/** The main window, brought to the front; made again if it was closed. `at` is the page a new window opens on. */
function showWindow(at = '/'): BrowserWindow {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return win;
  }
  const created = makeWindow();
  void created.loadURL(origin() + at);
  return created;
}

async function send(channel: 'spade:navigate' | 'spade:command', value: string): Promise<void> {
  if (!core) return;
  const { webContents } = showWindow();
  // A window that is still opening has nothing listening yet; the preload holds what arrives after it loads.
  if (webContents.isLoading()) await once(webContents, 'did-finish-load');
  // The page may only open a file picker for something the person did. Choosing the menu item is that.
  if (value === 'import') await webContents.executeJavaScript('0', true);
  webContents.send(channel, value);
}

const navigate = (to: string) => void (win && !win.isDestroyed() ? send('spade:navigate', to) : core && showWindow(to));

/** The API, asked by the app itself: the same door the window uses, with this launch's token. */
async function api<T>(path: string, init?: { method: string; body: unknown }): Promise<T> {
  if (!core) throw new Error('The core is not running.');
  const res = await fetch(`http://127.0.0.1:${core.port}${path}`, { method: init?.method, body: init && JSON.stringify(init.body), headers: { Cookie: `${TOKEN_COOKIE}=${token}`, 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} answered ${res.status}`);
  return (await res.json()) as T;
}

const acts: DesktopAct[] = [];
/** Tells the window what the app just did, with its Undo. Without a window it waits for the next one: a button on a pop-up never opens the window. */
function acted(act: DesktopAct): void {
  if (win && !win.isDestroyed() && !win.webContents.isLoading()) win.webContents.send('spade:acted', act);
  else acts.push(act);
}

const pad = (n: number) => String(n).padStart(2, '0');
const localMinute = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Completes a to-do from outside the window (a pop-up's Done, a box in the menu bar). */
const completeTask = (taskId: string) =>
  void api<{ title: string }>(`/api/tasks/${taskId}`, { method: 'PATCH', body: { status: 'done' } }).then(
    (task) => acted({ message: `Completed “${task.title}”`, reopenTaskId: taskId }),
    (err: unknown) => log.error('Completing a to-do failed:', err),
  );

const popupActions: PopupActions = {
  open: (url) => navigate(url),
  done: completeTask,
  snooze: (popup) => scheduler.snooze(popup),
};
const show = (popup: Popup) => {
  log.info(`Pop-up: ${popup.title}`);
  showPopup(popup, popupActions);
};

let updateTray: ReturnType<typeof createTray> | undefined;
let latest: { state: DesktopState; now: string } | undefined;
/** Redraws the menu bar item and the Dock badge from the last plan (again when the focus timer or a choice in Settings changes). */
function redraw(): void {
  if (!latest) return;
  updateTray?.(latest.state, latest.now, { focus: focus.state(), title: state.trayTitle, shortcut: state.quickAddShortcut });
  app.setBadgeCount(state.badge ? latest.state.summary.badge : 0);
}

const focus = createFocus({
  now: Date.now,
  settings: async () => (await api<AppSettings>('/api/settings')).focus,
  save: (session) => void api('/api/focus-sessions', { method: 'POST', body: session }).catch((err: unknown) => log.error('Saving a focus session failed:', err)),
  onChange: (next: FocusState | null, before, settings) => {
    if (win && !win.isDestroyed()) win.webContents.send('spade:focus', next);
    redraw();
    // Nothing to say when it was started or stopped by hand.
    if (!before || !settings?.notify || (!next && before.phaseEnd < before.blockEnd)) return;
    const title = !next ? `Focus block done: ${before.title}` : next.phase === 'break' ? `Break: ${Math.round((next.phaseEnd - next.phaseStart) / 60_000)} minutes` : `Break over: back to ${next.title}`;
    show({ at: '', title, body: '', url: '/', keys: [] });
  },
  setTimer: (run, ms) => setTimeout(run, ms),
  clearTimer: (timer) => clearTimeout(timer as NodeJS.Timeout),
});

let panel: BrowserWindow | undefined;
/** The quick-add panel, over whatever app is in front, on the screen the pointer is on. */
async function showQuickAdd(text = ''): Promise<void> {
  if (!core) return;
  if (!panel || panel.isDestroyed()) panel = createQuickAddPanel({ origin, preload: path.join(__dirname, 'preload.cjs'), version: app.getVersion() });
  const { webContents } = panel;
  // First use, or the core came back on another port.
  if (!webContents.getURL().startsWith(origin())) void panel.loadURL(`${origin()}/quick-add`);
  if (webContents.isLoading()) await once(webContents, 'did-finish-load');
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  panel.setPosition(Math.round(area.x + (area.width - PANEL_SIZE.width) / 2), Math.round(area.y + area.height * 0.22));
  webContents.send('spade:quick-add', text);
  panel.show();
}
const toggleQuickAdd = () => (panel && !panel.isDestroyed() && panel.isVisible() ? panel.hide() : void showQuickAdd());

/** Makes this the quick-add shortcut everywhere on the computer. False if another app already has it. */
function useShortcut(shortcut: string): boolean {
  if (!globalShortcut.register(shortcut, toggleQuickAdd)) return false;
  if (shortcut !== state.quickAddShortcut) globalShortcut.unregister(state.quickAddShortcut);
  return true;
}

const prefs = (): DesktopPrefs => ({ openAtLogin: app.getLoginItemSettings().openAtLogin, canOpenAtLogin: app.isPackaged, trayTitle: state.trayTitle, badge: state.badge, quickAddShortcut: state.quickAddShortcut });
function setPrefs({ openAtLogin, ...kept }: DesktopPrefsChange): DesktopPrefs {
  if (kept.quickAddShortcut && kept.quickAddShortcut !== state.quickAddShortcut && !useShortcut(kept.quickAddShortcut)) throw new Error('Another app already uses that shortcut.');
  // A development run would register the bare Electron binary.
  if (openAtLogin !== undefined && app.isPackaged) app.setLoginItemSettings({ openAtLogin });
  remember(kept);
  redraw();
  return prefs();
}

/** A spade:// link: a page, a to-do, or text for the quick-add panel. */
function openLink(link: string): void {
  const to = parseSpadeLink(link);
  if ('add' in to) void showQuickAdd(to.add);
  else navigate(to.path);
}

/** The kinds of file Import reads (client/src/lib/files/fileTypes.ts), and its size limit. */
const OPENABLE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.pdf', '.docx', '.txt', '.ics']);
/** A file opened with Spade (dropped on the Dock icon, "Open With"): read here, since the page can't touch the disk, and handed to the page's import review. */
async function openFile(file: string): Promise<void> {
  try {
    if (!OPENABLE.has(path.extname(file).toLowerCase()) || (await fs.promises.stat(file)).size > 15 * 1024 * 1024) {
      await dialog.showMessageBox({ type: 'info', message: 'Spade can’t read that file', detail: 'It reads calendars (.ics), PDFs, Word documents, text and images, up to 15 MB.' });
      return;
    }
    const data = new Uint8Array(await fs.promises.readFile(file));
    const { webContents } = showWindow();
    if (webContents.isLoading()) await once(webContents, 'did-finish-load');
    webContents.send('spade:open-file', { name: path.basename(file), data });
  } catch (err) {
    log.error('Opening a file failed:', err);
  }
}
// Links and files can arrive before the app is ready (they may be what launched it).
let ready = false;
const early: (() => void)[] = [];
const whenUp = (run: () => void) => (ready ? run() : void early.push(run));

const scheduler = createScheduler({
  now: localMinute,
  msUntil: (minute) => new Date(`${minute}:00`).getTime() - Date.now(),
  fetchState: () => api<DesktopState>('/api/desktop/state'),
  show,
  onState: (state, now) => {
    latest = { state, now };
    redraw();
  },
  onError: (err) => log.error('Planning the pop-ups failed:', err),
  setTimer: (run, ms) => setTimeout(run, ms),
  clearTimer: (timer) => clearTimeout(timer as NodeJS.Timeout),
});
// Saving often comes in bursts (a drag, an import): one look shortly after the last of them.
let changed: NodeJS.Timeout | undefined;
function planChanged(): void {
  clearTimeout(changed);
  changed = setTimeout(() => void scheduler.replan(), 300);
}

/** Try Again, or Quit. Never returns after Quit. */
async function tryAgainOrQuit(detail: string): Promise<void> {
  for (;;) {
    const { response } = await dialog.showMessageBox({
      type: 'error',
      message: 'Spade can’t reach your data',
      detail: `The part of Spade that reads and saves your data isn’t running.\n\n${detail}\n\nYour data hasn’t been changed. The log has the details.`,
      buttons: ['Try Again', 'Show Log in Finder', 'Quit'],
      defaultId: 0,
      cancelId: 2,
    });
    if (response === 0) return;
    if (response === 1) shell.showItemInFolder(logFile);
    else {
      app.quit();
      return new Promise(() => {});
    }
  }
}

/** Starts the core and points the window's session at it. Keeps asking until it's up, or the person quits. */
async function bringUpCore(importFrom?: string, problem?: string): Promise<void> {
  for (;;) {
    if (problem) await tryAgainOrQuit(problem);
    try {
      core = await startCore({
        script: path.join(__dirname, 'core.cjs'),
        dataDir: dir,
        token,
        port: devUrl ? Number(process.env.SPADE_PORT) || 0 : state.port,
        clientDir: devUrl ? undefined : path.join(__dirname, 'client'),
        importFrom,
        onPopup: (popup) => show({ ...popup, at: '', keys: [] }),
        onChanged: planChanged,
        onCrash,
      });
      if (core.port !== state.port) remember({ port: core.port });
      void scheduler.replan();
      await session.defaultSession.cookies.set({ url: origin(), name: TOKEN_COOKIE, value: token, httpOnly: true, sameSite: 'strict' });
      // A window that isn't on this address yet: the one made at launch, or after a restart whose port was taken. Otherwise the page is still good, with whatever was being typed.
      if (win && !win.isDestroyed() && !win.webContents.getURL().startsWith(origin())) void win.loadURL(origin());
      return;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      log.error('The core did not start:', reason);
      if (importFrom) {
        await dialog.showMessageBox({ type: 'warning', message: 'Spade couldn’t bring that data over', detail: `${reason}\n\nNothing was changed.` });
        importFrom = undefined;
        problem = undefined;
      } else problem = reason;
    }
  }
}

/** The core stopped by itself. Once, it's quietly started again on the same address, so the open page carries on; twice within five minutes, the person is asked. */
function onCrash(code: number): void {
  if (quitting) return;
  log.error(`The core stopped by itself (code ${code}).`);
  core = undefined;
  const again = Date.now() - lastCrash < 5 * 60_000;
  lastCrash = Date.now();
  void bringUpCore(undefined, again ? 'It stopped twice in a few minutes.' : undefined);
}

const bringOverDetail = (file: string, replaces: boolean) =>
  `${file}\n\nIt’s copied into this Spade. The old files aren’t moved or changed.${replaces ? ' What’s in this Spade now is saved to its backups folder first, then replaced.' : ''}`;

/** File → Bring Over Existing Spade Data: pick an older Spade's database, confirm, and restart the core on a copy of it. */
async function bringOverData(): Promise<void> {
  if (!core) return;
  const picked = await dialog.showOpenDialog({ title: 'Bring Over Existing Spade Data', message: 'Choose an older Spade’s database (todo.db in its server/data folder).', defaultPath: findOldDatabase() ?? undefined, properties: ['openFile'], filters: [{ name: 'Spade database', extensions: ['db'] }] });
  const file = picked.filePaths[0];
  if (picked.canceled || !file) return;
  const { response } = await dialog.showMessageBox({ type: 'question', message: 'Bring over this Spade data?', detail: bringOverDetail(file, true), buttons: ['Bring It Over', 'Cancel'], defaultId: 0, cancelId: 1 });
  if (response !== 0) return;
  const running = core;
  core = undefined;
  await running.stop();
  await bringUpCore(file);
  win?.webContents.reload();
}

/** First launch of the installed app with nothing in it yet, on a Mac that still has the older always-on Spade: offer to bring its data over. */
async function offerOldData(): Promise<string | undefined> {
  if (!app.isPackaged || process.env.SPADE_DATA_DIR || fs.existsSync(databaseFile)) return undefined;
  const file = findOldDatabase();
  if (!file) return undefined;
  const { response } = await dialog.showMessageBox({
    type: 'question',
    message: 'Bring over my existing Spade data?',
    detail: `${bringOverDetail(file, false)}\n\nYou can also do this later: File → Bring Over Existing Spade Data.`,
    buttons: ['Bring It Over', 'Start Fresh'],
    defaultId: 0,
    cancelId: 1,
  });
  return response === 0 ? file : undefined;
}

// Two copies would both write to one database: the second just brings the first to the front.
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => core && showWindow());
  app.on('activate', () => core && showWindow());
  // Closing the window leaves Spade running on a Mac, as Mac apps do.
  app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
  app.on('before-quit', () => (quitting = true));
  app.on('open-url', (event, url) => {
    event.preventDefault();
    whenUp(() => openLink(url));
  });
  app.on('open-file', (event, file) => {
    event.preventDefault();
    whenUp(() => void openFile(file));
  });
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    focus.stop();
    scheduler.stop();
    void core?.stop();
  });

  void app.whenReady().then(async () => {
    log.info(`Spade ${app.getVersion()} starting. Data: ${dir}`);
    lockPermissions(session.defaultSession, origin);
    // Waking and unlocking: look at once, rather than up to a minute later.
    powerMonitor.on('resume', () => {
      void scheduler.replan();
      void focus.check();
    });
    powerMonitor.on('unlock-screen', () => void scheduler.replan());
    setMenu({
      command: (name: DesktopCommand) => void send('spade:command', name),
      navigate,
      history: (step) => (step < 0 ? win?.webContents.navigationHistory.goBack() : win?.webContents.navigationHistory.goForward()),
      bringOverData: () => void bringOverData(),
      logFile,
      dev: !app.isPackaged,
    });
    updateTray = createTray(path.join(__dirname, 'trayTemplate.png'), {
      open: () => core && showWindow(),
      completeTask,
      // Saved like the switch in Settings, so both agree; the save itself makes the scheduler look again.
      quickAdd: () => void showQuickAdd(),
      startFocus: () => {
        const on = latest?.state.summary.now;
        if (on) void focus.start({ key: on.key, title: on.title, end: on.end }).catch((err: unknown) => log.error('Starting focus failed:', err));
      },
      stopFocus: () => focus.stop(),
      pause: (until) => void api('/api/settings', { method: 'PATCH', body: { popups: { pausedUntil: until } } }).catch((err: unknown) => log.error('Pausing failed:', err)),
      quit: () => app.quit(),
    });
    const importFrom = await offerOldData();
    // The core's process is started first and the window is made while it comes up (each takes a noticeable part of launch); the core points the window at itself once it's ready.
    const coreUp = bringUpCore(importFrom);
    // Started by the system at login: no window, just the menu bar item.
    if (!app.getLoginItemSettings().wasOpenedAtLogin) makeWindow().webContents.once('did-finish-load', () => log.info(`Window loaded ${sinceLaunch()} ms after launch.`));
    await coreUp;
    registerIpc(origin, {
      getPrefs: prefs,
      setPrefs,
      quickAddDone: (added) => {
        panel?.hide();
        if (added) acted({ message: `Added “${added.title}”`, deleteTaskId: added.id });
      },
      focusStart: (item) => focus.start(item),
      focusStop: () => focus.stop(),
    });
    if (!useShortcut(state.quickAddShortcut)) log.warn(`The quick-add shortcut ${state.quickAddShortcut} is taken by another app.`);
    if (app.isPackaged) app.setAsDefaultProtocolClient('spade');
    ready = true;
    early.splice(0).forEach((run) => run());
    // Loaded ahead of time, hidden, so the shortcut's first press is as quick as the rest.
    setTimeout(() => {
      if (core && !panel) {
        panel = createQuickAddPanel({ origin, preload: path.join(__dirname, 'preload.cjs'), version: app.getVersion() });
        void panel.loadURL(`${origin()}/quick-add`);
      }
    }, 3000);
    log.info(`Core up ${sinceLaunch()} ms after launch.`);
  });
}
