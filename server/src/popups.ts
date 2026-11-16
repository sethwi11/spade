import { addDays, datePart, nowSummary, planningDate, popupsForDay, type DesktopState, type PlanSources, type Popup } from '@todo/shared';
import type { Repositories } from './repositories';

/** Hands one pop-up to the desktop app to show now ("Send a test pop-up"; a fake in tests). */
export type SendPopup = (popup: Popup) => void;

/** Everything planDay reads, straight from the database: as the app shows it (no deleted templates, no classes of archived semesters, no missed to-dos). */
export async function planSources(r: Repositories): Promise<PlanSources> {
  const [templates, blocks, overrides, semesters, courses, events, timeBlocks, tasks, calendars] = await Promise.all([
    r.weekTemplates.list(), r.routineBlocks.list(), r.routineOverrides.list(), r.semesters.list(), r.courses.list(), r.events.list(), r.timeBlocks.list(), r.tasks.list(), r.calendars.list(),
  ]);
  const archived = new Set(courses.filter((c) => semesters.find((s) => s.id === c.semesterId)?.archived).map((c) => c.id));
  const live = tasks.filter((t) => t.missedAt === null);
  return {
    templates,
    blocks: blocks.filter((b) => templates.some((t) => t.id === b.templateId)),
    overrides,
    semesters,
    events: events.filter((e) => !e.courseId || !archived.has(e.courseId)),
    timeBlocks: timeBlocks.filter((b) => live.some((t) => t.id === b.taskId)),
    tasks: live,
    calendars,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
/** This minute on the computer's clock, as "YYYY-MM-DDTHH:mm". */
export const localMinute = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** What the desktop app plans its timer and menu bar from (the day still going after midnight counts, as on Today). */
export async function desktopState(r: Repositories, minute = localMinute()): Promise<DesktopState> {
  const app = await r.settings.get();
  const src = await planSources(r);
  // Yesterday too: a bedtime after midnight is yesterday's, and its minute is the first of the new day's planning.
  const today = datePart(minute);
  const dates = [...new Set([addDays(today, -1), planningDate(src.templates, minute), today, addDays(today, 1)])];
  return { popups: dates.flatMap((d) => popupsForDay(src, d, app.popups, app.sundayReviewReminder)), summary: nowSummary(src, minute), pausedUntil: app.popups.pausedUntil !== null && app.popups.pausedUntil > minute ? app.popups.pausedUntil : null };
}
