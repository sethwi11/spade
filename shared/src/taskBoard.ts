import { addDays } from './dateMath';
import { localDateOf } from './applications';
import type { Task } from './models/tasks';
import { isOverdue } from './recurrence';

// Which column of the Tasks board a to-do goes in, kept free of screens so the day-boundary rules can be tested.

export const TASK_COLUMNS = ['overdue', 'today', 'soon', 'later'] as const;
export type TaskColumn = (typeof TASK_COLUMNS)[number];

/** "Coming up" reaches this many days past today. */
export const COMING_UP_DAYS = 7;

type Placed = Pick<Task, 'status' | 'dueDate' | 'recurrence' | 'rollsOver' | 'repeatDays' | 'missedAt'>;

/** The column an open to-do goes in, or null when the board doesn't show it (finished, or a repeating one already replaced by its next). Only the date decides: due at 5:00 PM today is Due today until the day ends. */
export function taskColumn(t: Placed, today: string): TaskColumn | null {
  if (t.status !== 'todo' || t.missedAt !== null) return null;
  if (isOverdue(t, today)) return 'overdue';
  if (t.dueDate === null) return 'later';
  // A rolling task that began before today is still current until its next one comes: Due today, never Overdue.
  if (t.dueDate <= today) return 'today';
  return t.dueDate <= addDays(today, COMING_UP_DAYS) ? 'soon' : 'later';
}

/** Finished today by this computer's clock: these wait at the bottom of Due today. */
export const isDoneToday = (t: Pick<Task, 'status' | 'completedAt'>, today: string) => t.status === 'done' && t.completedAt !== null && localDateOf(t.completedAt) === today;

/** Splits to-dos into the board's columns, plus the ones finished today, keeping their order. */
export function boardColumns<T extends Placed & Pick<Task, 'completedAt'>>(tasks: readonly T[], today: string): Record<TaskColumn | 'doneToday', T[]> {
  const out: Record<TaskColumn | 'doneToday', T[]> = { overdue: [], today: [], soon: [], later: [], doneToday: [] };
  for (const t of tasks) {
    const column = taskColumn(t, today);
    if (column) out[column].push(t);
    else if (isDoneToday(t, today)) out.doneToday.push(t);
  }
  return out;
}

/** The days a to-do can be moved to from "Coming up": tomorrow through the last day of the window. */
export const comingUpDays = (today: string) => Array.from({ length: COMING_UP_DAYS }, (_, i) => addDays(today, i + 1));
