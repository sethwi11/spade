import { addMinutes } from './dateTime';
import type { Popup } from './popups';

// The desktop app's scheduler, as pure functions: given the pop-ups for the days around now, what to show at this minute.

/** Later than this (the computer was asleep), a pop-up is counted in one summary instead of shown. */
export const LATE_MINUTES = 5;

const unsent = (p: Popup, sent: ReadonlySet<string>) => p.keys.some((k) => !sent.has(k));

/**
 * What came due after `lastChecked`, up to and including `now` (both "YYYY-MM-DDTHH:mm"): shown if at most five minutes late, otherwise missed.
 * Each thing once: `sent` holds the keys already handled, and a pop-up listed twice (yesterday's list and today's) counts once.
 */
export function dueNow(popups: readonly Popup[], lastChecked: string, now: string, sent: ReadonlySet<string>): { show: Popup[]; missed: Popup[] } {
  const seen = new Set(sent);
  const cutoff = addMinutes(now, -LATE_MINUTES);
  const show: Popup[] = [];
  const missed: Popup[] = [];
  for (const p of [...popups].sort((a, b) => a.at.localeCompare(b.at))) {
    if (p.at <= lastChecked || p.at > now || !unsent(p, seen)) continue;
    p.keys.forEach((k) => seen.add(k));
    (p.at >= cutoff ? show : missed).push(p);
  }
  return { show, missed };
}

/** One pop-up for everything that passed while the computer slept. `nowLine` is what's on now ("Study until 9:00 PM"), if anything. */
export function awaySummary(missed: readonly Popup[], at: string, nowLine: string | null): Popup | null {
  if (missed.length === 0) return null;
  const blocks = new Set(missed.flatMap((p) => p.keys).filter((k) => k.startsWith('start:'))).size;
  const what = blocks > 0 ? `${blocks} ${blocks === 1 ? 'block' : 'blocks'} passed` : `${missed.length} ${missed.length === 1 ? 'reminder' : 'reminders'} passed`;
  return { at, title: `While you were away: ${what}`, body: nowLine ? `Now: ${nowLine}` : '', url: '/', keys: [] };
}
