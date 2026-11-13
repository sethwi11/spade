import type { Calendar } from './models/calendars';
import type { Task } from './models/tasks';

// A calendar to suggest for a to-do from its title alone; nothing here ever sets one.

const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
/** "poshs" counts as "posh", so a plural or a possessive still matches. */
const stem = (w: string) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const stems = (text: string) => new Set(words(text).map(stem));
const FILLER = new Set(['the', 'and', 'for', 'with', 'about', 'from', 'into', 'this', 'that', 'your', 'our', 'have', 'will', 'get', 'new', 'all']);

/** The calendar a title points to, or null when nothing fits clearly. A calendar whose whole name is in the title counts most; a word you have used on at least two to-dos, nearly always in the same calendar, counts too. Two calendars tied means no suggestion. */
export function suggestCalendar(title: string, calendars: readonly Pick<Calendar, 'id' | 'name'>[], tasks: readonly Pick<Task, 'title' | 'calendarId'>[]): string | null {
  const inTitle = stems(title);
  if (inTitle.size === 0) return null;

  // For each word, how many to-dos in each calendar used it.
  const used = new Map<string, Map<string, number>>();
  for (const t of tasks) {
    if (!t.calendarId) continue;
    for (const w of stems(t.title)) {
      const byCalendar = used.get(w) ?? new Map<string, number>();
      byCalendar.set(t.calendarId, (byCalendar.get(t.calendarId) ?? 0) + 1);
      used.set(w, byCalendar);
    }
  }

  const score = new Map<string, number>();
  const add = (id: string, n: number) => score.set(id, (score.get(id) ?? 0) + n);
  for (const c of calendars) {
    const name = [...stems(c.name)];
    if (name.length > 0 && name.every((w) => inTitle.has(w))) add(c.id, 3);
  }
  for (const w of inTitle) {
    if (w.length < 3 || FILLER.has(w)) continue;
    const byCalendar = used.get(w);
    if (!byCalendar) continue;
    const total = [...byCalendar.values()].reduce((a, b) => a + b, 0);
    const [id, n] = [...byCalendar].sort((a, b) => b[1] - a[1])[0]!;
    if (total >= 2 && n / total >= 0.8) add(id, 1);
  }

  const ranked = [...score].sort((a, b) => b[1] - a[1]);
  return ranked.length > 0 && (ranked.length === 1 || ranked[0]![1] > ranked[1]![1]) ? ranked[0]![0] : null;
}
