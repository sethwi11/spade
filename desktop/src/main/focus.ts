import { focusSession, nextPhase, startFocus, type AppSettings, type CreateFocusSessionInput, type FocusRequest, type FocusState } from '@todo/shared';

// The focus timer, owned by the main process so closing the window doesn't stop it. No Electron in here, like the scheduler.

type FocusSettings = AppSettings['focus'];

export interface FocusDeps {
  now: () => number;
  settings: () => Promise<FocusSettings>;
  save: (session: CreateFocusSessionInput) => void;
  /** `before` is what just ended, so the app can say "Break" or "Back to it". */
  onChange: (state: FocusState | null, before: FocusState | null, settings: FocusSettings | null) => void;
  setTimer: (run: () => void, ms: number) => unknown;
  clearTimer: (timer: unknown) => void;
}

export function createFocus(d: FocusDeps) {
  let state: FocusState | null = null;
  let timer: unknown;

  function set(next: FocusState | null, settings: FocusSettings | null): void {
    const before = state;
    state = next;
    d.clearTimer(timer);
    // One timeout for the end of the phase; nothing runs in between.
    timer = next ? d.setTimer(() => void step(), Math.max(0, next.phaseEnd - d.now())) : undefined;
    d.onChange(next, before, settings);
  }

  /** The phase has run out: save a finished focus interval and move on. */
  async function step(): Promise<void> {
    const ended = state;
    if (!ended || d.now() < ended.phaseEnd) return;
    if (ended.phase === 'focus') record(ended.phaseStart, ended.phaseEnd);
    const settings = await d.settings();
    if (state === ended) set(nextPhase(ended, d.now(), settings), settings);
  }

  function record(from: number, to: number): void {
    const session = focusSession(from, to);
    if (session) d.save(session);
  }

  return {
    state: () => state,
    async start(item: FocusRequest): Promise<void> {
      const settings = await d.settings();
      set(startFocus(item, d.now(), settings), settings);
    },
    stop(): void {
      if (state?.phase === 'focus') record(state.phaseStart, d.now());
      if (state) set(null, null);
    },
    /** After the computer wakes: a timeout that should have fired while asleep is caught up. */
    check: step,
  };
}
