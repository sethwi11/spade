import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { app, dialog, Notification, session, shell, type BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { DesktopCommand } from '@todo/shared';
import { startCore, TOKEN_COOKIE, type Core, type Popup } from './core';
import { setMenu } from './menu';
import { dataDir, findOldDatabase } from './paths';
import { readState, writeState } from './state';
import { createMainWindow, lockPermissions } from './windows';

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
  const created = createMainWindow({ origin, preload: path.join(__dirname, 'preload.cjs'), version: app.getVersion(), state, onClose: (bounds, zoom) => remember({ bounds, zoom }) });
  created.on('closed', () => {
    if (win === created) win = undefined;
  });
  win = created;
  return created;
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

// Pop-ups, until the app schedules its own: the core still decides what's due, and they show as Spade's.
const showing = new Set<Notification>();
function showPopup(popup: Popup): void {
  log.info(`Pop-up: ${popup.title}`);
  const notification = new Notification({ title: popup.title, body: popup.body });
  showing.add(notification); // or it can be collected before it's clicked
  notification.on('click', () => navigate(popup.url.startsWith('/') ? popup.url : '/'));
  notification.on('close', () => showing.delete(notification));
  notification.show();
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
        onPopup: showPopup,
        onCrash,
      });
      if (core.port !== state.port) remember({ port: core.port });
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
  app.on('will-quit', () => void core?.stop());

  void app.whenReady().then(async () => {
    log.info(`Spade ${app.getVersion()} starting. Data: ${dir}`);
    lockPermissions(session.defaultSession, origin);
    setMenu({
      command: (name: DesktopCommand) => void send('spade:command', name),
      navigate,
      history: (step) => (step < 0 ? win?.webContents.navigationHistory.goBack() : win?.webContents.navigationHistory.goForward()),
      bringOverData: () => void bringOverData(),
      logFile,
      dev: !app.isPackaged,
    });
    const importFrom = await offerOldData();
    // The core's process is started first and the window is made while it comes up (each takes a noticeable part of launch); the core points the window at itself once it's ready.
    const coreUp = bringUpCore(importFrom);
    makeWindow().webContents.once('did-finish-load', () => log.info(`Window loaded ${sinceLaunch()} ms after launch.`));
    await coreUp;
    log.info(`Core up ${sinceLaunch()} ms after launch.`);
  });
}
