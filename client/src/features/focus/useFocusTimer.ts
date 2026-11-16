import { useCallback, useEffect, useRef, useState } from 'react';
import { focusSession, nextPhase, startFocus, type FocusState, type PlanItem } from '@todo/shared';
import { useAppSettings } from '../../data/useApplications';
import { focusSessionHooks } from '../../data/useCheckIns';

// Pomodoro on a focus block: focus and break intervals until the block ends, each finished focus interval saved as a session (the rule itself is shared/src/focusTimer.ts).

export type { FocusState };

const KEY = 'planner.focus';
const read = (): FocusState | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as FocusState | null;
  } catch {
    return null;
  }
};
const write = (s: FocusState | null) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode: the timer still runs, it just won't survive a reload.
  }
};

/** A short two-note chime, made in the browser (no files, no network). */
function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch {
    // No audio available: the change still shows on screen.
  }
}

export function useFocusTimer() {
  const { settings } = useAppSettings();
  const f = settings.focus;
  const save = focusSessionHooks.useCreate();
  // Inside the desktop app the main process runs the timer (closing the window mustn't stop it); this only shows it.
  const desktop = window.spade;
  const [state, setState] = useState<FocusState | null>(() => (desktop ? null : read()));
  const [now, setNow] = useState(() => Date.now());

  const set = useCallback((s: FocusState | null) => {
    write(s);
    setState(s);
  }, []);
  const record = useCallback(
    (from: number, to: number) => {
      const session = focusSession(from, to);
      if (session) save.mutate(session);
    },
    [save],
  );

  const phase = useRef<string | undefined>(undefined);
  useEffect(
    () =>
      desktop?.onFocus((next) => {
        // A chime as focus turns to break and back, as in a browser.
        if (phase.current && next && next.phase !== phase.current && f.sound) chime();
        phase.current = next?.phase;
        setState(next);
        setNow(Date.now());
      }),
    [desktop, f.sound],
  );

  // Ticks once a second while running; in a browser it also moves between focus and break, and stops when the block ends.
  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (desktop || t < state.phaseEnd) return;
      if (state.phase === 'focus') record(state.phaseStart, state.phaseEnd);
      const next = nextPhase(state, t, f);
      if (next && f.sound) chime();
      set(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [state, f, record, set, desktop]);

  const start = useCallback(
    (item: PlanItem) => {
      if (desktop) return void desktop.focusStart({ key: item.key, title: item.title, end: item.end });
      const t = Date.now();
      const first = startFocus(item, t, f);
      if (!first) return;
      set(first);
      setNow(t);
    },
    [f, set, desktop],
  );

  const stop = useCallback(() => {
    if (desktop) return void desktop.focusStop();
    if (state?.phase === 'focus') record(state.phaseStart, Date.now());
    set(null);
  }, [state, record, set, desktop]);

  return { state, now, start, stop, settings: f };
}
