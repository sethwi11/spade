import { app, Menu, shell, type MenuItemConstructorOptions } from 'electron';
import type { DesktopCommand } from '@todo/shared';

/** ⌘1 to ⌘6, in the rail's order. */
export const PAGES = [
  ['Today', '/today'],
  ['Calendar', '/calendar'],
  ['Tasks', '/tasks'],
  ['Applications', '/applications'],
  ['Courses', '/courses'],
  ['Journal', '/journal'],
] as const;

export interface MenuActions {
  command: (name: DesktopCommand) => void;
  navigate: (path: string) => void;
  /** -1 back, 1 forward. */
  history: (step: -1 | 1) => void;
  bringOverData: () => void;
  logFile: string;
  dev: boolean;
}

export function menuTemplate(a: MenuActions): MenuItemConstructorOptions[] {
  const run = (name: DesktopCommand) => () => a.command(name);
  return [
    {
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: run('settings') }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New To-do', accelerator: 'CmdOrCtrl+N', click: run('new-task') },
        { label: 'New Event', accelerator: 'CmdOrCtrl+E', click: run('new-event') },
        { type: 'separator' },
        { label: 'Import…', accelerator: 'CmdOrCtrl+O', click: run('import') },
        { label: 'Bring Over Existing Spade Data…', click: a.bringOverData },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        // Not the system's Undo: in a text field the page undoes typing, anywhere else it undoes the last change in Spade.
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: run('undo') },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: run('search') },
      ],
    },
    {
      label: 'View',
      submenu: [
        ...PAGES.map(([label, path], i): MenuItemConstructorOptions => ({ label, accelerator: `CmdOrCtrl+${i + 1}`, click: () => a.navigate(path) })),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(a.dev ? ([{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }] satisfies MenuItemConstructorOptions[]) : []),
      ],
    },
    {
      label: 'Go',
      submenu: [
        { label: 'Home', accelerator: 'Shift+CmdOrCtrl+H', click: () => a.navigate('/') },
        { label: 'Back', accelerator: 'CmdOrCtrl+[', click: () => a.history(-1) },
        { label: 'Forward', accelerator: 'CmdOrCtrl+]', click: () => a.history(1) },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: 'Keyboard Shortcuts', click: run('shortcuts') },
        { label: 'Show Log in Finder', click: () => shell.showItemInFolder(a.logFile) },
      ],
    },
  ];
}

export const setMenu = (actions: MenuActions): void => Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate(actions)));
