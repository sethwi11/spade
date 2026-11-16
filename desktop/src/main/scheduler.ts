import { addMinutes, awaySummary, dueNow, type DesktopState, type Popup } from '@todo/shared';

// Decides when each pop-up shows. No Electron in here: the clock, the timer and the core are handed in, so a test can run a whole day in a moment.

export interface SchedulerDeps {
  /** This minute on the computer's clock, "YYYY-MM-DDTHH:mm". */
  now: () => string;
  /** Milliseconds from now until that minute begins. */
  msUntil: (minute: string) => number;
  fetchState: () => Promise<DesktopState>;
  show: (popup: Popup) => void;
  /** The menu bar item and the Dock badge follow along. */
  onState: (state: DesktopState, now: string) => void;
  onError: (err: unknown) => void;
  setTimer: (run: () => void, ms: number) => unknown;
  clearTimer: (timer: unknown) => void;
}

/** "9:00 PM" from a local datetime. */
export const clock = (dt: string) => {
  const [h, m] = dt.slice(11).split(':').map(Number);
  return `${h! % 12 || 12}:${String(m).padStart(2, '0')} ${h! < 12 ? 'AM' : 'PM'}`;
};

export function createScheduler(d: SchedulerDeps) {
  const sent = new Set<string>();
  // "Snooze 1 hour": remembered here only, so quitting forgets them.
  let snoozed: Popup[] = [];
  let lastChecked = d.now();
  let timer: unknown;
  let running = false;
  let again = false;
  let stopped = false;

  /**
   * Asks the core for the plan, shows what has come due since the last look, and sets the one timer for the start of the next minute.
   * Looking every minute is what makes a changed clock or time zone, a sleep and midnight all take care of themselves: each look compares the wall clock with the last one.
   */
  async function replan(): Promise<void> {
    if (stopped) return;
    if (running) return void (again = true);
    running = true;
    d.clearTimer(timer);
    timer = undefined;
    try {
      const state = await d.fetchState();
      const now = d.now();
      // The clock was set back: nothing already shown shows again (`sent`), and nothing before the new now is late.
      if (now < lastChecked) lastChecked = now;
      const { show, missed } = dueNow([...state.popups, ...snoozed], lastChecked, now, sent);
      lastChecked = now;
      for (const p of [...show, ...missed]) p.keys.forEach((k) => sent.add(k));
      snoozed = snoozed.filter((p) => p.at > now);
      const on = state.summary.now;
      const away = awaySummary(missed, now, on ? `${on.title} until ${clock(on.end)}` : null);
      if (away) d.show(away);
      show.forEach(d.show);
      d.onState(state, now);
    } catch (err) {
      d.onError(err);
    }
    running = false;
    if (stopped) return;
    if (again) {
      again = false;
      return replan();
    }
    timer = d.setTimer(() => void replan(), Math.max(0, d.msUntil(addMinutes(d.now(), 1))));
  }

  return {
    replan,
    /** Shows this pop-up again in an hour. */
    snooze(popup: Popup): void {
      const at = addMinutes(d.now(), 60);
      snoozed.push({ ...popup, at, keys: popup.keys.map((k) => `snooze:${k}@${at}`) });
    },
    stop(): void {
      stopped = true;
      d.clearTimer(timer);
    },
  };
}
