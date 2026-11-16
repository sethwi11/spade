import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// The real Electron only exists inside the app; these tests look at what the app would hand it.
const made: { options: Record<string, any>; handlers: Record<string, (...args: any[]) => any> }[] = [];
const opened: string[] = [];
vi.mock('electron', () => ({
  BrowserWindow: class {
    handlers: Record<string, (...args: any[]) => any> = {};
    webContents = { on: (name: string, fn: (...args: any[]) => any) => (this.handlers[name] = fn), setWindowOpenHandler: (fn: (...args: any[]) => any) => (this.handlers.open = fn), setZoomFactor: () => {} };
    constructor(options: Record<string, any>) {
      made.push({ options, handlers: this.handlers });
    }
    once() {}
    on() {}
  },
  app: { name: 'Spade' },
  dialog: { showMessageBox: async () => ({ response: 0 }) },
  Menu: {},
  nativeTheme: { shouldUseDarkColors: false },
  screen: { getAllDisplays: () => [{ workArea: { x: 0, y: 0, width: 1440, height: 900 } }] },
  shell: { openExternal: async (url: string) => void opened.push(url), showItemInFolder: () => {} },
}));

const { menuTemplate, PAGES } = await import('../src/main/menu');
const { dataDir, findOldDatabase, oldDatabaseFrom } = await import('../src/main/paths');
const { fitBounds, readState, writeState } = await import('../src/main/state');
const { ALLOWED_PERMISSIONS, createMainWindow, isHttps, lockPermissions, sameOrigin } = await import('../src/main/windows');

const ORIGIN = 'http://127.0.0.1:4321';
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'spade-desktop-'));

describe('the main window', () => {
  const win = () => {
    createMainWindow({ origin: () => ORIGIN, preload: '/made-up/preload.cjs', version: '0.1.0', state: readState(tmp()), onClose: () => {} });
    return made.at(-1)!;
  };

  it('gives the page no Node, its own sandbox and the web’s same-origin rules', () => {
    expect(win().options.webPreferences).toMatchObject({ contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true });
  });

  it.runIf(process.platform === 'darwin')('hides the Mac title bar and puts the window buttons over the rail', () => {
    expect(win().options).toMatchObject({ titleBarStyle: 'hidden', trafficLightPosition: { x: 18, y: 18 } });
  });

  it('never opens a second window: https links go to the browser, anything else is refused', () => {
    const { handlers } = win();
    opened.length = 0;
    expect(handlers.open!({ url: 'https://example.com/job' })).toEqual({ action: 'deny' });
    expect(handlers.open!({ url: 'http://example.com/job' })).toEqual({ action: 'deny' });
    expect(handlers.open!({ url: 'file:///etc/passwd' })).toEqual({ action: 'deny' });
    expect(opened).toEqual(['https://example.com/job']);
  });

  it('stays on the app’s own pages', () => {
    const { handlers } = win();
    opened.length = 0;
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    handlers['will-navigate']!(event, `${ORIGIN}/tasks`);
    expect(event.prevented).toBe(false);
    handlers['will-navigate']!(event, 'https://example.com/');
    expect(event.prevented).toBe(true);
    expect(opened).toEqual(['https://example.com/']);
  });

  it('tells links apart', () => {
    expect(isHttps('https://example.com')).toBe(true);
    for (const url of ['http://example.com', 'javascript:alert(1)', 'file:///x', 'mailto:a@example.com', 'not a link', '']) expect(isHttps(url)).toBe(false);
    expect(sameOrigin(`${ORIGIN}/today?x=1`, ORIGIN)).toBe(true);
    for (const url of ['http://127.0.0.1:4322/', 'http://localhost:4321/', 'https://127.0.0.1:4321/', 'http://127.0.0.1.evil.example:4321/', '']) expect(sameOrigin(url, ORIGIN)).toBe(false);
  });

  it('refuses every permission but the short list, and all of them for someone else’s page', () => {
    let request: (...args: any[]) => void = () => {};
    let check: (...args: any[]) => boolean = () => true;
    lockPermissions({ setPermissionRequestHandler: (fn: any) => (request = fn), setPermissionCheckHandler: (fn: any) => (check = fn) } as any, () => ORIGIN);
    const ask = (permission: string, url = `${ORIGIN}/`) => {
      let answer: boolean | undefined;
      request(null, permission, (ok: boolean) => (answer = ok), { requestingUrl: url });
      return answer;
    };
    expect([...ALLOWED_PERMISSIONS].sort()).toEqual(['clipboard-sanitized-write', 'fullscreen', 'notifications']);
    for (const permission of ALLOWED_PERMISSIONS) expect(ask(permission)).toBe(true);
    for (const permission of ['media', 'geolocation', 'clipboard-read', 'openExternal', 'midi', 'hid', 'usb']) expect(ask(permission)).toBe(false);
    expect(ask('notifications', 'https://example.com/')).toBe(false);
    expect(check(null, 'notifications', ORIGIN)).toBe(true);
    expect(check(null, 'media', ORIGIN)).toBe(false);
    expect(check(null, 'notifications', 'https://example.com')).toBe(false);
  });
});

describe('what the app remembers', () => {
  it('starts from defaults, and survives a damaged file', () => {
    const dir = tmp();
    expect(readState(dir)).toEqual({ port: 0, zoom: 1, closeHint: true, trayTitle: true, badge: true, quickAddShortcut: 'Control+Alt+Space' });
    writeState(dir, { port: 51234, zoom: 1.25, closeHint: false, trayTitle: false, badge: true, quickAddShortcut: 'Alt+Command+K', bounds: { x: 10, y: 40, width: 1200, height: 760 } });
    expect(readState(dir)).toEqual({ port: 51234, zoom: 1.25, closeHint: false, trayTitle: false, badge: true, quickAddShortcut: 'Alt+Command+K', bounds: { x: 10, y: 40, width: 1200, height: 760 } });
    fs.writeFileSync(path.join(dir, 'window.json'), '{"port": "not a number"');
    expect(readState(dir)).toEqual({ port: 0, zoom: 1, closeHint: true, trayTitle: true, badge: true, quickAddShortcut: 'Control+Alt+Space' });
  });

  it('puts the window back only where it can still be reached', () => {
    const laptop = { x: 0, y: 0, width: 1440, height: 900 };
    const second = { x: 1440, y: 0, width: 1920, height: 1080 };
    const onSecond = { x: 1600, y: 100, width: 1200, height: 800 };
    expect(fitBounds(undefined, [laptop])).toBeUndefined();
    expect(fitBounds({ x: 100, y: 60, width: 1200, height: 760 }, [laptop])).toEqual({ x: 100, y: 60, width: 1200, height: 760 });
    expect(fitBounds(onSecond, [laptop, second])).toEqual(onSecond);
    expect(fitBounds(onSecond, [laptop])).toBeUndefined(); // the second screen was unplugged
    expect(fitBounds({ x: 100, y: -500, width: 1200, height: 760 }, [laptop])).toBeUndefined(); // its top edge is above the screen
    expect(fitBounds({ x: -1150, y: 60, width: 1200, height: 760 }, [laptop])).toBeUndefined(); // only a sliver shows
  });
});

describe('where data lives', () => {
  it('keeps development apart from the real folder', () => {
    expect(dataDir('/Users/made-up/Library/Application Support', true, undefined)).toBe('/Users/made-up/Library/Application Support/Spade');
    expect(dataDir('/Users/made-up/Library/Application Support', false, undefined)).toBe('/Users/made-up/Library/Application Support/Spade Dev');
    expect(dataDir('/Users/made-up/Library/Application Support', true, '/tmp/spade-test')).toBe('/tmp/spade-test');
  });

  it('finds the older always-on Spade from its launch job', () => {
    const plist = '<dict>\n  <key>Label</key><string>com.planner.app</string>\n  <key>WorkingDirectory</key><string>/Users/made-up/code/planner/server</string>\n</dict>';
    expect(oldDatabaseFrom(plist)).toBe('/Users/made-up/code/planner/server/data/todo.db');
    expect(oldDatabaseFrom('<dict></dict>')).toBeNull();

    const home = tmp();
    expect(findOldDatabase(home)).toBeNull(); // no launch job
    const server = path.join(home, 'planner', 'server');
    fs.mkdirSync(path.join(home, 'Library', 'LaunchAgents'), { recursive: true });
    fs.writeFileSync(path.join(home, 'Library', 'LaunchAgents', 'com.planner.app.plist'), plist.replace('/Users/made-up/code/planner/server', server));
    expect(findOldDatabase(home)).toBeNull(); // a launch job, but its data is gone
    fs.mkdirSync(path.join(server, 'data'), { recursive: true });
    fs.writeFileSync(path.join(server, 'data', 'todo.db'), '');
    expect(findOldDatabase(home)).toBe(path.join(server, 'data', 'todo.db'));
  });
});

describe('the menus', () => {
  const sent: string[] = [];
  const menus = menuTemplate({ command: (name) => sent.push(name), navigate: (to) => sent.push(to), history: () => {}, bringOverData: () => {}, logFile: '/made-up/spade.log', dev: false });
  const items = menus.flatMap((menu) => (Array.isArray(menu.submenu) ? menu.submenu : []));

  it('gives every page and action its own shortcut', () => {
    const keys = items.map((item) => item.accelerator).filter(Boolean);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(expect.arrayContaining(['CmdOrCtrl+N', 'CmdOrCtrl+E', 'CmdOrCtrl+F', 'CmdOrCtrl+,', 'CmdOrCtrl+Z', 'CmdOrCtrl+1', 'CmdOrCtrl+6']));
  });

  it('sends each item to the page as a named command or an address', () => {
    for (const item of items) item.click?.({} as any, undefined, {} as any);
    expect(sent).toEqual(expect.arrayContaining(['settings', 'new-task', 'new-event', 'import', 'undo', 'search', 'shortcuts', '/', ...PAGES.map(([, to]) => to)]));
  });

  it('leaves the developer tools out of the real app', () => {
    expect(items.some((item) => item.role === 'toggleDevTools' || item.role === 'reload')).toBe(false);
  });
});
