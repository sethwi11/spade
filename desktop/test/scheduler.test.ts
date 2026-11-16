import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ ipcMain: {}, BrowserWindow: class {}, dialog: {}, nativeTheme: {}, screen: {}, shell: {} }));
import { addMinutes, DEFAULT_POPUP_SETTINGS, nowSummary, popupsForDay, type DesktopState, type PlanSources, type Popup, type RoutineBlock, type Task, type WeekTemplate } from '@todo/shared';
import { createScheduler } from '../src/main/scheduler';

// A made-up student's Wednesday, run minute by minute on a fake clock.
const STAMP = '2026-01-01T00:00:00.000Z';
const CAL = '00000000-0000-4000-8000-0000000000c1';
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const WED = '2026-11-11';
const template: WeekTemplate = { id: id(), name: 'Fall', effectiveFrom: '2026-09-01', effectiveTo: null, days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, wake: '07:00', bed: '22:00' })), meetingWindows: [], createdAt: STAMP, updatedAt: STAMP };
const block = (start: string, end: string, title: string, focus = false): RoutineBlock => ({ id: id(), templateId: template.id, weekday: 3, start, end, title, calendarId: CAL, altTitle: null, altCalendarId: null, priority: 'normal', focus, soundtrack: null, notify: true, schoolDaysOnly: false, reschedulable: true, notes: null, createdAt: STAMP, updatedAt: STAMP });
const task = (title: string, dueTime: string): Task => ({ id: id(), title, notes: null, dueDate: WED, dueTime, priority: 'medium', calendarId: CAL, courseId: null, applicationId: null, reminders: [30], status: 'todo', completedAt: null, recurrence: null, sortOrder: 0, deletedAt: null, missedAt: null, estimateMinutes: null, createdAt: STAMP, updatedAt: STAMP } as unknown as Task);
const settings = { ...DEFAULT_POPUP_SETTINGS, blocks: true, bedtime: true };

function day(tasks: Task[] = [task('Lab report', '16:00')]) {
  const src: PlanSources = { templates: [template], blocks: [block('08:00', '09:00', 'Gym'), block('09:00', '11:00', 'Study', true), block('12:00', '12:30', 'Lunch'), block('19:00', '21:00', 'Read')], overrides: [], semesters: [], events: [], timeBlocks: [], tasks, calendars: [] };
  const state = (now: string): DesktopState => ({ popups: [-1, 0, 1].flatMap((d) => popupsForDay(src, new Date(Date.parse(`${WED}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10), settings)), summary: nowSummary(src, now), pausedUntil: null });
  return { src, state };
}

/** A scheduler on a fake clock. `timers` holds what's pending: there must never be more than one. */
function harness(start: string, world = day()) {
  let now = start;
  const shown: Popup[] = [];
  const timers = new Map<number, () => void>();
  let most = 0;
  let next = 0;
  const scheduler = createScheduler({
    now: () => now,
    msUntil: () => 1000,
    fetchState: async () => world.state(now),
    show: (p) => shown.push(p),
    onState: () => {},
    onError: (err) => {
      throw err;
    },
    setTimer: (run) => {
      timers.set(++next, run);
      most = Math.max(most, timers.size);
      return next;
    },
    clearTimer: (t) => void timers.delete(t as number),
  });
  /** Lets the clock reach `to`, firing the timer each minute on the way (or not at all: the computer was asleep). */
  async function reach(to: string, asleep = false) {
    while (now < to) {
      now = asleep ? to : addMinutes(now, 1);
      const [key, run] = [...timers.entries()][0] ?? [];
      if (key === undefined) throw new Error('No timer is set');
      timers.delete(key);
      run!();
      await new Promise((r) => setTimeout(r));
    }
  }
  return { scheduler, shown, timers, reach, most: () => most, set: (to: string) => (now = to) };
}

describe('the scheduler', () => {
  it('over a whole day shows exactly what popupsForDay lists, with one timer at a time', async () => {
    const world = day();
    const h = harness(`${WED}T00:00`, world);
    await h.scheduler.replan();
    await h.reach(`${WED}T23:59`);
    const expected = popupsForDay(world.src, WED, settings).filter((p) => p.at > `${WED}T00:00`);
    expect(expected.length).toBeGreaterThan(8);
    expect(h.shown.map((p) => [p.at, p.title])).toEqual(expected.map((p) => [p.at, p.title]));
    expect(h.most()).toBe(1);
    expect(h.timers.size).toBe(1);
  });

  it('after sleep shows what is under five minutes late and sums up the rest once', async () => {
    const h = harness(`${WED}T07:30`);
    await h.scheduler.replan();
    // Asleep from 7:30 to 9:03: Gym started and ended, Study started three minutes ago.
    await h.reach(`${WED}T09:03`, true);
    expect(h.shown.map((p) => p.title)).toEqual(['While you were away: 1 block passed', expect.stringMatching(/^Now: Study until 11:00 AM/)]);
    expect(h.shown[0]!.body).toBe('Now: Study until 11:00 AM');
  });

  it('shows nothing twice when the clock or time zone jumps back, and nothing due is lost', async () => {
    const h = harness(`${WED}T08:50`);
    await h.scheduler.replan();
    await h.reach(`${WED}T09:05`);
    const before = h.shown.length;
    // An hour back (flying west): 9:00 comes around again.
    h.set(`${WED}T08:05`);
    await h.reach(`${WED}T09:05`);
    expect(h.shown.length).toBe(before);
    await h.reach(`${WED}T10:55`);
    expect(h.shown.at(-1)!.title).toBe('5 minutes left: Study');
  });

  it('follows a changed plan: a to-do moved earlier pops up at its new time', async () => {
    const lab = task('Lab report', '16:00');
    const world = day([lab]);
    const h = harness(`${WED}T13:00`, world);
    await h.scheduler.replan();
    lab.dueTime = '13:10';
    lab.reminders = [];
    await h.scheduler.replan(); // what the core's "something was saved" message does
    await h.reach(`${WED}T13:10`);
    expect(h.shown.map((p) => p.title)).toEqual(['Due now: Lab report']);
    expect(h.most()).toBe(1);
  });

  it('snooze brings a pop-up back an hour later, once', async () => {
    const h = harness(`${WED}T15:59`);
    await h.scheduler.replan();
    await h.reach(`${WED}T16:00`);
    h.scheduler.snooze(h.shown[0]!);
    await h.reach(`${WED}T17:30`);
    expect(h.shown.map((p) => [p.at, p.title])).toEqual([[`${WED}T16:00`, 'Due now: Lab report'], [`${WED}T17:00`, 'Due now: Lab report']]);
  });

  it('stop clears the timer', async () => {
    const h = harness(`${WED}T12:00`);
    await h.scheduler.replan();
    h.scheduler.stop();
    expect(h.timers.size).toBe(0);
  });
});

describe('the menu bar item', async () => {
  const { trayMenu, trayTitle } = await import('../src/main/tray');
  const world = day();
  const actions = { open: () => {}, completeTask: () => {}, pause: () => {}, quit: () => {}, quickAdd: () => {}, startFocus: () => {}, stopFocus: () => {} };
  const labels = (now: string, pausedUntil: string | null = null) => trayMenu({ ...world.state(now), pausedUntil }, now, actions).map((i) => i.label ?? '-');

  it('shows what is on and the whole minutes left', () => {
    expect(trayTitle(world.state(`${WED}T09:18`), `${WED}T09:18`)).toBe('Study · 1h 42m');
    expect(trayTitle(world.state(`${WED}T10:18`), `${WED}T10:18`)).toBe('Study · 42m');
    expect(trayTitle(world.state(`${WED}T11:30`), `${WED}T11:30`)).toBe('');
    const focus = { key: 'k', title: 'Study', blockEnd: 0, phase: 'break' as const, phaseStart: 0, phaseEnd: 4.2 * 60_000, done: 1 };
    expect(trayTitle(world.state(`${WED}T09:18`), `${WED}T09:18`, { state: focus, at: 0 })).toBe('Break · 5m');
  });

  it('lists Now, Next, the block’s to-dos and the pauses', () => {
    expect(labels(`${WED}T09:18`)).toEqual(['Now: Study until 11:00 AM', 'Next: Lunch at 12:00 PM', '-', 'Lab report', '-', 'Quick Add…', 'Start Focus Until 11:00 AM', 'Pause Notifications for 1 Hour', 'Pause Until Tomorrow', '-', 'Open Spade', 'Quit Spade']);
  });

  it('doesn’t offer focus during a class or when nothing is on', () => {
    const state = world.state(`${WED}T09:18`);
    const during = (kind: 'class' | 'open') => trayMenu({ ...state, summary: { ...state.summary, now: { ...state.summary.now!, kind } } }, `${WED}T09:18`, actions).find((i) => i.label === 'Start Focus');
    expect(during('class')).toMatchObject({ enabled: false });
    expect(during('open')).toMatchObject({ enabled: false });
  });

  it('offers Resume while paused', () => {
    expect(labels(`${WED}T09:18`, `${WED}T10:18`)).toContain('Resume Notifications');
    expect(labels(`${WED}T09:18`, `${WED}T10:18`)).toContain('Notifications paused until 10:18 AM');
  });
});

describe('the focus timer in the app', async () => {
  const { createFocus } = await import('../src/main/focus');
  const f = { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4, sound: true, notify: true };
  const at = (time: string) => new Date(`${WED}T${time}:00`).getTime();

  function harness(start: string) {
    let now = at(start);
    const saved: number[] = [];
    const phases: string[] = [];
    const timers = new Map<number, { run: () => void; at: number }>();
    let next = 0;
    const focus = createFocus({
      now: () => now,
      settings: async () => f,
      save: (s) => saved.push(s.durationSeconds / 60),
      onChange: (state) => phases.push(state?.phase ?? 'off'),
      setTimer: (run, ms) => {
        timers.set(++next, { run, at: now + ms });
        return next;
      },
      clearTimer: (t) => void timers.delete(t as number),
    });
    /** Runs the clock forward to `to`, firing each timeout when it comes due. */
    async function reach(to: string) {
      for (;;) {
        const [key, timer] = [...timers.entries()][0] ?? [];
        if (key === undefined || timer!.at > at(to)) break;
        expect(timers.size).toBe(1);
        timers.delete(key);
        now = timer!.at;
        timer!.run();
        await new Promise((r) => setTimeout(r));
      }
      now = at(to);
    }
    return { focus, saved, phases, timers, reach };
  }
  const study = { key: 'routine:study', title: 'Study', end: `${WED}T10:00` };

  it('runs focus and breaks to the end of the block with no window, saving each focus interval', async () => {
    const h = harness('09:00');
    await h.focus.start(study);
    await h.reach('10:30');
    expect(h.phases).toEqual(['focus', 'break', 'focus', 'break', 'off']);
    expect(h.saved).toEqual([25, 25]);
    expect(h.timers.size).toBe(0);
  });

  it('saves the part done when stopped early, and nothing under a minute', async () => {
    const h = harness('09:00');
    await h.focus.start(study);
    await h.reach('09:10');
    h.focus.stop();
    expect(h.saved).toEqual([10]);
    await h.focus.start(study);
    h.focus.stop();
    expect(h.saved).toEqual([10]);
    expect(h.focus.state()).toBeNull();
  });
});

describe('what the page may ask the app', async () => {
  const { guarded } = await import('../src/main/ipc');
  const { DesktopPrefsChangeSchema } = await import('@todo/shared');
  const origin = () => 'http://127.0.0.1:5123';
  const from = (url: string) => ({ senderFrame: { url } }) as never;
  const setPrefs = guarded(origin, DesktopPrefsChangeSchema, (changes) => changes);

  it('answers the app’s own page', () => {
    expect(setPrefs(from('http://127.0.0.1:5123/today'), { badge: false })).toEqual({ badge: false });
  });
  it('refuses any other page, and a frame that has gone', () => {
    expect(() => setPrefs(from('https://example.com/'), { badge: false })).toThrow('Refused');
    expect(() => setPrefs(from('http://127.0.0.1:9999/today'), { badge: false })).toThrow('Refused');
    expect(() => setPrefs({ senderFrame: null } as never, { badge: false })).toThrow('Refused');
  });
  it('refuses input of the wrong shape', () => {
    expect(() => setPrefs(from('http://127.0.0.1:5123/'), { badge: 'yes' })).toThrow();
    expect(() => setPrefs(from('http://127.0.0.1:5123/'), { anything: true })).toThrow();
  });
});
