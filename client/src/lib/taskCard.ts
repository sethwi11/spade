import { isRolling, rollDeadline, type Task, type TaskColumn } from '@todo/shared';
import { daysBetween, formatTime, parseLocalISODate, shortDate } from './dates';

export type WhenKind = 'time' | 'day' | 'until' | 'overdue';

/** "Fri" within the coming week, "Nov 24" after that (a weekday alone can't say which one). */
const dayName = (iso: string, today: string) => (daysBetween(today, iso) < 7 ? parseLocalISODate(iso).toLocaleDateString(undefined, { weekday: 'short' }) : shortDate(iso));

/** The day-and-time chip on a to-do's card, or null when its column already says everything (Due today, no time). */
export function cardWhen(t: Pick<Task, 'dueDate' | 'dueTime' | 'recurrence' | 'rollsOver' | 'repeatDays' | 'status' | 'missedAt'>, column: TaskColumn, today: string): { text: string; kind: WhenKind } | null {
  const time = t.dueTime ? formatTime(t.dueTime) : null;
  if (column === 'overdue') return t.dueDate ? { text: `${shortDate(t.dueDate)}${time ? ` · ${time}` : ''}`, kind: 'overdue' } : null;
  if (column === 'today') {
    // A rolling task that began before today is current until its next one comes.
    if (isRolling(t) && t.dueDate && t.dueDate < today) return { text: `Until ${dayName(rollDeadline(t)!, today)}`, kind: 'until' };
    return time ? { text: time, kind: 'time' } : null;
  }
  if (!t.dueDate) return null;
  const day = column === 'soon' ? dayName(t.dueDate, today) : shortDate(t.dueDate);
  // "Nov 21 · 1:00 PM": a bare space would run a date's digits into the time's.
  return { text: time ? `${day}${/\d$/.test(day) ? ' ·' : ''} ${time}` : day, kind: time ? 'time' : 'day' };
}
