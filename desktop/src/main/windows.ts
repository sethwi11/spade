import { BrowserWindow, dialog, nativeTheme, screen, shell, type Session } from 'electron';
import { fitBounds, type Bounds, type State } from './state';

/** Section 7 of the plan: the page gets no Node, its own sandbox, and the web's usual same-origin rules. */
export const WEB_PREFERENCES = { contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true } as const;

/** Everything else the page could ask Chromium for (camera, microphone, location…) is refused. Full screen is the app's own Shift+F; the clipboard one is "Copy summary". */
export const ALLOWED_PERMISSIONS: ReadonlySet<string> = new Set(['notifications', 'fullscreen', 'clipboard-sanitized-write']);

export const isHttps = (url: string): boolean => URL.canParse(url) && new URL(url).protocol === 'https:';
export const sameOrigin = (url: string, origin: string): boolean => URL.canParse(url) && new URL(url).origin === origin;

/** Links that leave the app open in the person's own browser, and only https ones. */
export function openExternal(url: string): void {
  if (isHttps(url)) void shell.openExternal(url);
  else void dialog.showMessageBox({ type: 'info', message: 'Spade only opens links that start with https://', detail: url.slice(0, 300) });
}

/** Refuses every permission that isn't on the short list, and every one asked for by a page that isn't the app's own. */
export function lockPermissions(session: Session, origin: () => string): void {
  session.setPermissionRequestHandler((_contents, permission, done, details) => done(ALLOWED_PERMISSIONS.has(permission) && sameOrigin(details.requestingUrl, origin())));
  session.setPermissionCheckHandler((_contents, permission, requestingOrigin) => ALLOWED_PERMISSIONS.has(permission) && sameOrigin(requestingOrigin, origin()));
}

export function createMainWindow(options: { origin: () => string; preload: string; version: string; state: State; onClose: (bounds: Bounds, zoom: number) => void }): BrowserWindow {
  const saved = fitBounds(options.state.bounds, screen.getAllDisplays().map((d) => d.workArea));
  const win = new BrowserWindow({
    ...(saved ?? { width: 1280, height: 800 }),
    minWidth: 380,
    minHeight: 520,
    show: false,
    // On a Mac the title bar is hidden: the window buttons sit over the rail, and the top edge of the page drags the window (the client's `mac-app` styles make the room).
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' as const, trafficLightPosition: { x: 18, y: 18 } } : {}),
    // The page's own paper color, so the window doesn't flash white before it paints.
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#00222c' : '#f2f8f5',
    webPreferences: { ...WEB_PREFERENCES, preload: options.preload, additionalArguments: [`--spade-version=${options.version}`] },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(options.state.zoom));

  // The window only ever shows the app's own pages: anything else goes to the browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (sameOrigin(url, options.origin())) return;
    event.preventDefault();
    openExternal(url);
  });

  win.on('close', () => options.onClose(win.getNormalBounds(), win.webContents.getZoomFactor()));
  return win;
}
