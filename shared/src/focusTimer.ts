import type { AppSettings, CreateFocusSessionInput } from './models/misc';

// Pomodoro on a focus block: focus and break intervals until the block ends. One rule, run by the page in a browser and by the main process in the desktop app (where closing the window mustn't stop it).

type FocusSettings = AppSettings['focus'];

export interface FocusState {
  /** The planned item it runs for. */
  key: string;
  title: string;
  /** When the block ends (ms): the timer stops there. */
  blockEnd: number;
  phase: 'focus' | 'break';
  phaseStart: number;
  phaseEnd: number;
  /** Focus intervals finished so far. */
  done: number;
}

/** The local datetime "YYYY-MM-DDTHH:mm" as a timestamp. */
const ms = (dt: string) => new Date(`${dt}:00`).getTime();

/** The first focus interval of a block, or null if the block is already over. */
export function startFocus(item: { key: string; title: string; end: string }, t: number, f: FocusSettings): FocusState | null {
  const blockEnd = ms(item.end);
  if (blockEnd <= t) return null;
  return { key: item.key, title: item.title, blockEnd, phase: 'focus', phaseStart: t, phaseEnd: Math.min(t + f.focusMinutes * 60_000, blockEnd), done: 0 };
}

/** What follows a phase that has run out at `t`: a break after focus (a long one every few), focus after a break, and nothing once the block has ended. */
export function nextPhase(state: FocusState, t: number, f: FocusSettings): FocusState | null {
  if (state.phaseEnd >= state.blockEnd || t >= state.blockEnd) return null;
  const done = state.done + (state.phase === 'focus' ? 1 : 0);
  const minutes = state.phase === 'focus' ? (done % f.longBreakEvery === 0 ? f.longBreakMinutes : f.breakMinutes) : f.focusMinutes;
  return { ...state, done, phase: state.phase === 'focus' ? 'break' : 'focus', phaseStart: t, phaseEnd: Math.min(t + minutes * 60_000, state.blockEnd) };
}

/** A stretch of focus as a session to save. Under a minute isn't worth one. */
export function focusSession(from: number, to: number): CreateFocusSessionInput | null {
  return to - from >= 60_000 ? { taskId: null, startedAt: new Date(from).toISOString(), durationSeconds: Math.round((to - from) / 1000) } : null;
}
