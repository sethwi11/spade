import { Menu, Tray, type MenuItemConstructorOptions } from 'electron';
import { addMinutes, minutesBetween, shortcutLabel, type DesktopState, type FocusState } from '@todo/shared';
import { clock } from './scheduler';

export interface TrayActions {
  open: () => void;
  completeTask: (id: string) => void;
  /** A local datetime to pause pop-ups until, or null to resume. */
  pause: (until: string | null) => void;
  quickAdd: () => void;
  startFocus: () => void;
  stopFocus: () => void;
  quit: () => void;
}

const focusable = ({ now }: DesktopState['summary']) => now !== null && now.kind !== 'open' && now.kind !== 'class';

const short = (title: string) => (title.length > 28 ? `${title.slice(0, 27)}…` : title);

/** Beside the icon: what's on and how long is left, in whole minutes ("Study · 42m", "Work · 1h 05m"). Nothing when nothing is on. */
export function trayTitle({ summary }: DesktopState, now: string, focus?: { state: FocusState; at: number }): string {
  // During a focus session: the phase and its whole minutes left.
  if (focus) return `${focus.state.phase === 'focus' ? 'Focus' : 'Break'} · ${Math.max(1, Math.ceil((focus.state.phaseEnd - focus.at) / 60_000))}m`;
  if (!summary.now || summary.now.kind === 'open') return '';
  const left = Math.max(0, minutesBetween(now, summary.now.end));
  return `${short(summary.now.title)} · ${left >= 60 ? `${Math.floor(left / 60)}h ${String(left % 60).padStart(2, '0')}m` : `${left}m`}`;
}

export function trayMenu(state: DesktopState, now: string, a: TrayActions, extra: { focusing: boolean; shortcut: string } = { focusing: false, shortcut: '' }): MenuItemConstructorOptions[] {
  const { summary, pausedUntil } = state;
  const line = (label: string): MenuItemConstructorOptions => ({ label, enabled: false });
  return [
    line(summary.now ? `Now: ${short(summary.now.title)} until ${clock(summary.now.end)}` : 'Nothing on right now'),
    ...(summary.next ? [line(`Next: ${short(summary.next.title)} at ${clock(summary.next.start)}`)] : []),
    ...(summary.tasks.length > 0 ? [{ type: 'separator' } as const] : []),
    // Unchecked boxes: choosing one completes it (Undo waits in the window).
    ...summary.tasks.map((t): MenuItemConstructorOptions => ({ label: short(t.title), type: 'checkbox', checked: false, click: () => a.completeTask(t.id) })),
    { type: 'separator' },
    { label: `Quick Add…${extra.shortcut ? `  ${shortcutLabel(extra.shortcut)}` : ''}`, click: a.quickAdd },
    // The timer runs to the end of what's on now, so the label says when that is. Not during a class: nothing interrupts one.
    extra.focusing ? { label: 'Stop Focus', click: a.stopFocus } : focusable(summary) ? { label: `Start Focus Until ${clock(summary.now!.end)}`, click: a.startFocus } : { label: 'Start Focus', enabled: false },
    ...(pausedUntil
      ? [line(`Notifications paused until ${clock(pausedUntil)}`), { label: 'Resume Notifications', click: () => a.pause(null) }]
      : [
          { label: 'Pause Notifications for 1 Hour', click: () => a.pause(addMinutes(now, 60)) },
          { label: 'Pause Until Tomorrow', click: () => a.pause(summary.tomorrowWake) },
        ]),
    { type: 'separator' },
    { label: 'Open Spade', click: a.open },
    { label: 'Quit Spade', accelerator: 'CmdOrCtrl+Q', click: a.quit },
  ];
}

/** The menu bar item. `update` redraws it from the latest plan. */
export function createTray(icon: string, a: TrayActions) {
  const tray = new Tray(icon);
  tray.setToolTip('Spade');
  return (state: DesktopState, now: string, options: { focus: FocusState | null; title: boolean; shortcut: string }): void => {
    tray.setTitle(options.title ? trayTitle(state, now, options.focus ? { state: options.focus, at: Date.now() } : undefined) : '');
    tray.setContextMenu(Menu.buildFromTemplate(trayMenu(state, now, a, { focusing: options.focus !== null, shortcut: options.shortcut })));
  };
}
