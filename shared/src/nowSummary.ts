import { addDays } from './dateMath';
import { addMinutes, combine, datePart } from './dateTime';
import type { TimeBlock } from './models/events';
import type { Task } from './models/tasks';
import { activeTemplate, dayBounds, planDay, planningDate, type PlanItem, type PlanKind, type PlanSources } from './planDay';
import { soonestFirst } from './recurrence';

// What's on right now: the Now card in the app and the desktop app's menu bar item read the same answers.

const STRENGTH: Record<PlanKind, number> = { class: 0, event: 0, task: 1, routine: 2, open: 3 };
const RANK = { commitment: 0, high: 1, normal: 2, free: 3 };

/** What's under way at `now`: a class or event over the routine, then the stronger routine block (volleyball over club work), free and open time last. */
export function currentItem(items: readonly PlanItem[], now: string): PlanItem | undefined {
  const rank = (i: PlanItem) => RANK[i.priority ?? 'normal'];
  return items.filter((i) => i.start <= now && now < i.end).sort((a, b) => STRENGTH[a.kind] - STRENGTH[b.kind] || rank(a) - rank(b))[0];
}

/** The next thing to start after `now`, skipping open time. */
export const nextItem = (items: readonly PlanItem[], now: string) => items.find((i) => i.kind !== 'open' && i.start > now);


/** During a routine block: every open to-do in its category or its alt category, soonest due first, then priority. Uncategorized to-dos never match. */
export function duringBlock(tasks: readonly Task[], item: Pick<PlanItem, 'kind' | 'calendarId' | 'altCalendarId'> | undefined): Task[] {
  if (item?.kind !== 'routine') return [];
  const ids = [item.calendarId, item.altCalendarId].filter((id): id is string => id !== null);
  return tasks.filter((t) => t.status === 'todo' && t.calendarId !== null && ids.includes(t.calendarId)).sort(soonestFirst);
}

/** What you set out to do now: to-dos with time set aside right now, and to-dos due during the current item (or the next hour when nothing is on). */
export function supposedToBeDoing(tasks: readonly Task[], blocks: readonly TimeBlock[], now: string, span: { start: string; end: string } | undefined): Task[] {
  const window = span ?? { start: now, end: addMinutes(now, 60) };
  const scheduled = new Set(blocks.filter((b) => b.start <= now && now < b.end).map((b) => b.taskId));
  return tasks
    .filter((t) => t.status === 'todo' && (scheduled.has(t.id) || (t.dueDate && t.dueTime && combine(t.dueDate, t.dueTime) >= window.start && combine(t.dueDate, t.dueTime) < window.end)))
    .sort(soonestFirst);
}

/** The menu bar item's contents: what's on, what's next, the to-dos for now, and the Dock badge's count. */
export interface NowSummary {
  now: Pick<PlanItem, 'key' | 'kind' | 'title' | 'start' | 'end' | 'focus'> | null;
  next: Pick<PlanItem, 'title' | 'start'> | null;
  /** Up to five: what was set aside for now, then the current block's to-dos. */
  tasks: Pick<Task, 'id' | 'title'>[];
  /** Open to-dos that are overdue or due today. */
  badge: number;
  /** When tomorrow starts: what "Pause until tomorrow" means. */
  tomorrowWake: string;
}

export function nowSummary(src: PlanSources, now: string): NowSummary {
  const date = planningDate(src.templates, now);
  const items = planDay(src, date).items;
  const current = currentItem(items, now);
  const next = nextItem(items, now) ?? nextItem(planDay(src, addDays(date, 1)).items, now);
  const tasks = [...new Set([...supposedToBeDoing(src.tasks, src.timeBlocks, now, current), ...duringBlock(src.tasks, current)])].slice(0, 5);
  return {
    now: current ? { key: current.key, kind: current.kind, title: current.title, start: current.start, end: current.end, focus: current.focus } : null,
    next: next ? { title: next.title, start: next.start } : null,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title })),
    badge: src.tasks.filter((t) => t.status === 'todo' && t.dueDate !== null && t.dueDate <= datePart(now)).length,
    tomorrowWake: dayBounds(activeTemplate(src.templates, addDays(date, 1)), addDays(date, 1)).wake,
  };
}
