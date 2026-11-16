import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import type { DesktopCommand, SpadeBridge } from '@todo/shared';
import { newEventSpan } from '../features/calendar/calendarModel';
import { isTyping } from '../hooks/useShortcuts';
import { useApp } from './AppContext';

declare global {
  interface Window {
    /** Only inside the desktop app (see desktop/src/preload). */
    spade?: SpadeBridge;
  }
}

/** Search lives on the Tasks page: go there if need be, then put the cursor in it. */
export function useTaskSearch() {
  const navigate = useNavigate();
  return () => {
    const focus = () => document.getElementById('task-search')?.focus();
    if (document.getElementById('task-search')) return focus();
    navigate('/tasks');
    window.setTimeout(focus, 60);
  };
}

/** The desktop app's menus: each item does what its key does on this page. `page` is what New To-do and New Event mean here. */
export function useDesktopCommands(page: { newTask: () => void; newEvent?: () => void }) {
  const app = useApp();
  const search = useTaskSearch();
  const latest = useRef({ app, search, page });
  latest.current = { app, search, page };

  useEffect(
    () =>
      window.spade?.onCommand((command: DesktopCommand) => {
        const { app, search, page } = latest.current;
        if (command === 'undo') {
          // In a text field Undo means the typing; anywhere else, the last change in Spade.
          if (isTyping(document.activeElement)) document.execCommand('undo');
          else void app.undoLast();
          return;
        }
        // The same rule as the keys: an open dialog isn't replaced under you.
        if (document.querySelector('dialog[open]')) return;
        const run: Record<Exclude<DesktopCommand, 'undo'>, () => void> = {
          'new-task': page.newTask,
          'new-event': page.newEvent ?? (() => app.openDialog({ kind: 'event', mode: 'new', defaults: newEventSpan(null, new Date()) })),
          import: () => app.chooseFilesToImport(),
          search,
          settings: () => app.openDialog({ kind: 'settings' }),
          shortcuts: () => app.openDialog({ kind: 'shortcuts' }),
        };
        run[command]();
      }),
    [],
  );
}
